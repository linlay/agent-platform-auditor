package auditor

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"catalog-lock-auditor/internal/loghub"
	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

var validRecordID = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$`)

// Store persists runs and comparisons as atomic JSON files under resultsRoot.
type Store struct {
	root string
	mu   sync.Mutex
}

// NewStore creates a JSON artifact store under resultsRoot.
func NewStore(resultsRoot string) (*Store, error) {
	for _, sub := range []string{"runs", "comparisons"} {
		if err := os.MkdirAll(filepath.Join(resultsRoot, sub), 0755); err != nil {
			return nil, err
		}
	}
	return &Store{root: resultsRoot}, nil
}

func (s *Store) writeAtomic(relPath string, v any) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	full := filepath.Join(s.root, relPath)
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(full), ".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.Write(raw); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, full)
}

func (s *Store) SaveRun(run RunRecord) error {
	if !validRecordID.MatchString(run.ID) {
		return fmt.Errorf("invalid run id %q", run.ID)
	}
	return s.writeAtomic(filepath.Join("runs", run.ID+".json"), run)
}

func (s *Store) SaveComparison(cmp ComparisonRecord) error {
	if !validRecordID.MatchString(cmp.ID) {
		return fmt.Errorf("invalid comparison id %q", cmp.ID)
	}
	return s.writeAtomic(filepath.Join("comparisons", cmp.ID+".json"), cmp)
}

func (s *Store) GetRun(id string) (RunRecord, error) {
	var out RunRecord
	if !validRecordID.MatchString(id) {
		return out, errors.New("invalid run id")
	}
	raw, err := os.ReadFile(filepath.Join(s.root, "runs", id+".json"))
	if err != nil {
		return out, err
	}
	err = json.Unmarshal(raw, &out)
	return out, err
}

func (s *Store) GetComparison(id string) (ComparisonRecord, error) {
	var out ComparisonRecord
	if !validRecordID.MatchString(id) {
		return out, errors.New("invalid comparison id")
	}
	raw, err := os.ReadFile(filepath.Join(s.root, "comparisons", id+".json"))
	if err != nil {
		return out, err
	}
	err = json.Unmarshal(raw, &out)
	return out, err
}

func (s *Store) ListRuns() ([]RunRecord, error) {
	entries, err := os.ReadDir(filepath.Join(s.root, "runs"))
	if err != nil {
		return nil, err
	}
	var items []RunRecord
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		id := strings.TrimSuffix(entry.Name(), ".json")
		if rec, err := s.GetRun(id); err == nil {
			items = append(items, rec)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].StartedAt.After(items[j].StartedAt) })
	return items, nil
}

func (s *Store) ListComparisons() ([]ComparisonRecord, error) {
	entries, err := os.ReadDir(filepath.Join(s.root, "comparisons"))
	if err != nil {
		return nil, err
	}
	var items []ComparisonRecord
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		id := strings.TrimSuffix(entry.Name(), ".json")
		if rec, err := s.GetComparison(id); err == nil {
			items = append(items, rec)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.After(items[j].CreatedAt) })
	return items, nil
}

// Runner executes single-mode audits and sequential A/B comparisons.
type Runner struct {
	store   *Store
	targets *targetbuild.Manager
	logs    *loghub.Hub
	runMu   sync.Mutex
}

func NewRunner(store *Store, targets *targetbuild.Manager, logs *loghub.Hub) *Runner {
	return &Runner{store: store, targets: targets, logs: logs}
}

func normalizeConfig(cfg RunConfig) (RunConfig, error) {
	if cfg.Engine == "" {
		cfg.Engine = EngineBuiltin
	}
	if cfg.Engine != EngineBuiltin && cfg.Engine != EnginePlatform {
		return cfg, fmt.Errorf("invalid engine %q", cfg.Engine)
	}
	if cfg.StressRounds <= 0 {
		cfg.StressRounds = 20
	}
	if cfg.StressRounds > 100 {
		cfg.StressRounds = 100
	}
	switch cfg.ScaleProfile {
	case "medium", "large", "xlarge":
	default:
		cfg.ScaleProfile = "small"
	}
	if cfg.PollIntervalMs <= 0 {
		cfg.PollIntervalMs = 250
	}
	if cfg.ReloadDebounceMs <= 0 {
		cfg.ReloadDebounceMs = 150
	}
	return cfg, nil
}

func selectScenarios(ids []string) []ScenarioInfo {
	all := ListScenarios()
	if len(ids) == 0 {
		var defaults []ScenarioInfo
		for _, item := range all {
			if item.DefaultSelected {
				defaults = append(defaults, item)
			}
		}
		return defaults
	}
	wanted := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		wanted[id] = struct{}{}
	}
	var selected []ScenarioInfo
	for _, item := range all {
		if _, ok := wanted[item.ID]; ok {
			selected = append(selected, item)
		}
	}
	return selected
}

func newID(prefix string) string {
	var b [3]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%s-%s-%s", prefix, time.Now().Format("20060102-150405"), hex.EncodeToString(b[:]))
}

func summarizeRun(results []ScenarioResult) RunSummary {
	var s RunSummary
	s.Total = len(results)
	var latSum int64
	var latCount int64
	for _, r := range results {
		if r.Status == "passed" {
			s.Passed++
		} else {
			s.Failed++
		}
		s.TotalLockErrors += r.LockErrors
		if r.HandleDelta > s.MaxHandleDelta {
			s.MaxHandleDelta = r.HandleDelta
		}
		if r.WatchedDirs > s.MaxWatchedDirs {
			s.MaxWatchedDirs = r.WatchedDirs
		}
		if r.ReloadLatencyMs > 0 {
			latSum += r.ReloadLatencyMs
			latCount++
		}
		s.TotalDurationMs += r.DurationMs
	}
	if latCount > 0 {
		s.AvgLatencyMs = latSum / latCount
	}
	return s
}

func (r *Runner) ensurePlatformTargets(ctx context.Context, cfg RunConfig) error {
	if r.targets == nil {
		return errors.New("target build manager is not configured")
	}
	wRef := strings.TrimSpace(cfg.WatcherRef)
	pRef := strings.TrimSpace(cfg.PollingRef)
	if wRef != "" || pRef != "" {
		_, err := r.targets.EnsureBuilt(ctx, targetbuild.BuildRequest{
			WatcherRef: wRef,
			PollingRef: pRef,
		})
		return err
	}
	st := r.targets.Status()
	if !st.Ready {
		_, err := r.targets.EnsureBuilt(ctx, targetbuild.BuildRequest{})
		return err
	}
	return nil
}

func (r *Runner) RunMode(ctx context.Context, mode monitor.Mode, cfg RunConfig) (RunRecord, error) {
	if mode != monitor.ModeWatcher && mode != monitor.ModePolling {
		return RunRecord{}, fmt.Errorf("invalid monitor mode: %q", mode)
	}
	var err error
	cfg, err = normalizeConfig(cfg)
	if err != nil {
		return RunRecord{}, err
	}
	cfg.Mode = mode
	if cfg.Engine == EnginePlatform {
		if err := r.ensurePlatformTargets(ctx, cfg); err != nil {
			return RunRecord{}, err
		}
		if _, err := r.targets.BinaryPath(mode); err != nil {
			return RunRecord{}, err
		}
	}
	selected := selectScenarios(cfg.ScenarioIDs)
	if len(selected) == 0 {
		return RunRecord{}, errors.New("no valid scenarios selected")
	}

	r.runMu.Lock()
	defer r.runMu.Unlock()

	if r.logs != nil {
		r.logs.Emit("info", "runner", fmt.Sprintf("开始执行 %s/%s（%d 场景，%d 轮压测，%s 规模）", cfg.Engine, mode, len(selected), cfg.StressRounds, cfg.ScaleProfile))
	}

	rec := RunRecord{
		ID:        newID(string(mode)),
		Engine:    cfg.Engine,
		Mode:      mode,
		StartedAt: time.Now(),
		Config:    cfg,
		Results:   make([]ScenarioResult, 0, len(selected)),
	}
	for _, info := range selected {
		if ctx.Err() != nil {
			return rec, ctx.Err()
		}
		rec.Results = append(rec.Results, runScenario(ctx, info, mode, cfg, r.targets, r.logs))
	}
	rec.FinishedAt = time.Now()
	rec.Summary = summarizeRun(rec.Results)

	if r.store != nil {
		if err := r.store.SaveRun(rec); err != nil {
			return rec, err
		}
	}
	return rec, nil
}

func (r *Runner) RunCompare(ctx context.Context, cfg RunConfig) (ComparisonRecord, error) {
	var err error
	cfg, err = normalizeConfig(cfg)
	if err != nil {
		return ComparisonRecord{}, err
	}
	if cfg.Engine == EnginePlatform {
		if err := r.ensurePlatformTargets(ctx, cfg); err != nil {
			return ComparisonRecord{}, err
		}
	}
	watcherRun, err := r.RunMode(ctx, monitor.ModeWatcher, cfg)
	if err != nil {
		return ComparisonRecord{}, err
	}
	pollingRun, err := r.RunMode(ctx, monitor.ModePolling, cfg)
	if err != nil {
		return ComparisonRecord{}, err
	}

	verdict := buildVerdict(cfg.Engine, watcherRun.Summary, pollingRun.Summary)
	if r.logs != nil {
		r.logs.Emit("ok", "runner", fmt.Sprintf("对照完成：%s", verdict))
	}
	cmp := ComparisonRecord{
		ID:         newID("cmp"),
		Engine:     cfg.Engine,
		CreatedAt:  time.Now(),
		Config:     cfg,
		WatcherRun: watcherRun,
		PollingRun: pollingRun,
		Summary: ComparisonSummary{
			WatcherLockErrors: watcherRun.Summary.TotalLockErrors,
			PollingLockErrors: pollingRun.Summary.TotalLockErrors,
			WatcherPassed:     watcherRun.Summary.Passed,
			PollingPassed:     pollingRun.Summary.Passed,
			TotalScenarios:    len(pollingRun.Results),
			WatcherMaxHandles: watcherRun.Summary.MaxHandleDelta,
			PollingMaxHandles: pollingRun.Summary.MaxHandleDelta,
			Verdict:           verdict,
		},
	}
	if r.store != nil {
		if err := r.store.SaveComparison(cmp); err != nil {
			return cmp, err
		}
	}
	return cmp, nil
}

func buildVerdict(engine string, watcher, polling RunSummary) string {
	prefix := ""
	if engine == EnginePlatform {
		prefix = "[真实 Platform] "
	}
	switch {
	case polling.Failed > 0 && polling.TotalLockErrors > 0:
		return fmt.Sprintf("%sPolling 仍检测到 %d 次文件锁冲突（通过 %d/%d），请检查步骤详情", prefix, polling.TotalLockErrors, polling.Passed, polling.Total)
	case polling.Failed > 0:
		return fmt.Sprintf("%sPolling 通过 %d/%d，Watcher 通过 %d/%d；Polling 存在失败步骤，请查看详情", prefix, polling.Passed, polling.Total, watcher.Passed, watcher.Total)
	case polling.TotalLockErrors == 0 && watcher.TotalLockErrors > 0:
		return fmt.Sprintf("%sPolling 全场景无锁冲突通过（Watcher 发生 %d 次锁冲突，通过 %d/%d）", prefix, watcher.TotalLockErrors, watcher.Passed, watcher.Total)
	case watcher.Failed > 0:
		return fmt.Sprintf("%sPolling 全场景通过（%d/%d），Watcher 失败 %d 项，请查看步骤详情", prefix, polling.Passed, polling.Total, watcher.Failed)
	case polling.TotalLockErrors < watcher.TotalLockErrors:
		return fmt.Sprintf("%sPolling 全场景通过且锁冲突更少（%d vs %d）", prefix, polling.TotalLockErrors, watcher.TotalLockErrors)
	case polling.TotalLockErrors == 0 && watcher.TotalLockErrors == 0 && polling.MaxHandleDelta < watcher.MaxHandleDelta:
		return prefix + "两者均全通过且无锁冲突，但 Polling 进程句柄占用更低"
	case polling.TotalLockErrors == 0 && watcher.TotalLockErrors == 0 && polling.MaxWatchedDirs < watcher.MaxWatchedDirs:
		return prefix + "两者均全通过且无锁冲突，但 Polling 常驻监听目录数为 0"
	case polling.TotalLockErrors == 0:
		return prefix + "Polling 全场景无锁冲突通过"
	default:
		return fmt.Sprintf("%sPolling 通过 %d/%d，Watcher 通过 %d/%d", prefix, polling.Passed, polling.Total, watcher.Passed, watcher.Total)
	}
}

// SandboxManager hosts a live interactive workspace so users can click buttons
// in the web UI to trigger external file operations against Watcher or Polling.
type SandboxManager struct {
	targets         *targetbuild.Manager
	logs            *loghub.Hub
	mu              sync.Mutex
	active          bool
	engine          string
	mode            monitor.Mode
	pollIntervalMs  int
	dirs            workspaceDirs
	mgr             *monitor.Manager
	proc            *platformProcess
	cancel          context.CancelFunc
	pumpDone        chan struct{}
	startedAt       time.Time
	baselineHandles int
	lockErrors      int
	reloadCount     int
	events          []SandboxEvent
}

func NewSandboxManager(targets *targetbuild.Manager, logs *loghub.Hub) *SandboxManager {
	return &SandboxManager{targets: targets, logs: logs}
}

func (s *SandboxManager) appendEventLocked(ev SandboxEvent) {
	s.events = append([]SandboxEvent{ev}, s.events...)
	if len(s.events) > 80 {
		s.events = s.events[:80]
	}
}

func (s *SandboxManager) Start(mode monitor.Mode, engine string, pollIntervalMs int, ref string) (SandboxState, error) {
	if mode != monitor.ModeWatcher && mode != monitor.ModePolling {
		return SandboxState{}, fmt.Errorf("unsupported mode %q", mode)
	}
	if engine == "" {
		engine = EngineBuiltin
	}
	if engine != EngineBuiltin && engine != EnginePlatform {
		return SandboxState{}, fmt.Errorf("unsupported engine %q", engine)
	}
	if pollIntervalMs <= 0 {
		pollIntervalMs = 500
	}

	_ = s.Stop()

	dirs, err := setupWorkspace()
	if err != nil {
		return SandboxState{}, err
	}
	_ = writeFileMkdir(filepath.Join(dirs.skills, "demo-skill", "SKILL.md"), validSkillMarkdown("demo-skill", "# Demo Skill v1"))
	_ = writeFileMkdir(filepath.Join(dirs.skills, "demo-skill", "scripts", "helper.txt"), "helper\n")
	_ = writeFileMkdir(filepath.Join(dirs.connectors, "demo-connector", "connector.json"), validConnectorJSON("demo-connector", "1.0.0"))
	_ = writeFileMkdir(filepath.Join(dirs.connectors, "demo-connector", "view.json"), `{"views":{}}`)
	_ = writeFileMkdir(filepath.Join(dirs.connectors, "demo-connector", "skills", "s1", "SKILL.md"), validSkillMarkdown("s1", "# Connector skill"))
	_ = writeFileMkdir(filepath.Join(dirs.connectors, "demo-connector", "views", "v1", "index.html"), "<p>v1</p>")
	_ = writeFileMkdir(filepath.Join(dirs.agents, "demo-agent", "agent.yml"), "key: demo-agent\nname: Demo Agent\nmode: GENERAL\npromptFile: SYSTEM.md\n")
	_ = writeFileMkdir(filepath.Join(dirs.agents, "demo-agent", "SYSTEM.md"), "You are Demo Agent.\n")
	_ = writeFileMkdir(filepath.Join(dirs.agents, "demo-agent", "skills", "local-skill", "SKILL.md"), validSkillMarkdown("local-skill", "# Local skill"))

	baseHandles, _ := monitor.ProcessHandleCount()
	var (
		mgr     *monitor.Manager
		proc    *platformProcess
		cancel  context.CancelFunc
		eventCh <-chan monitor.ReloadEvent
		title   string
	)

	if engine == EnginePlatform {
		if strings.TrimSpace(ref) != "" {
			var breq targetbuild.BuildRequest
			if st := s.targets.Status(); st.Manifest != nil {
				breq.WatcherRef = st.Manifest.Watcher.Ref
				breq.PollingRef = st.Manifest.Polling.Ref
			}
			if mode == monitor.ModeWatcher {
				breq.WatcherRef = strings.TrimSpace(ref)
			} else {
				breq.PollingRef = strings.TrimSpace(ref)
			}
			if _, bErr := s.targets.EnsureBuilt(context.Background(), breq); bErr != nil {
				_ = os.RemoveAll(dirs.root)
				return SandboxState{}, bErr
			}
		} else if !s.targets.Status().Ready {
			if _, bErr := s.targets.EnsureBuilt(context.Background(), targetbuild.BuildRequest{}); bErr != nil {
				_ = os.RemoveAll(dirs.root)
				return SandboxState{}, bErr
			}
		}
		binPath, err := s.targets.BinaryPath(mode)
		if err != nil {
			_ = os.RemoveAll(dirs.root)
			return SandboxState{}, err
		}
		var emit func(string, string, string)
		if s.logs != nil {
			emit = s.logs.Emit
		}
		proc, err = startPlatformProcess(context.Background(), binPath, dirs, mode, emit)
		if err != nil {
			_ = os.RemoveAll(dirs.root)
			return SandboxState{}, err
		}
		eventCh = proc.Events()
		title = fmt.Sprintf("已启动真实 agent-platform 沙盒 (%s)", mode)
	} else {
		var ctx context.Context
		ctx, cancel = context.WithCancel(context.Background())
		mgr, err = monitor.Start(ctx, mode, dirs.entries(), monitor.Options{
			PollInterval: time.Duration(pollIntervalMs) * time.Millisecond,
			Debounce:     150 * time.Millisecond,
		})
		if err != nil {
			cancel()
			_ = os.RemoveAll(dirs.root)
			return SandboxState{}, err
		}
		eventCh = mgr.Events()
		title = fmt.Sprintf("已启动内置 %s 实时沙盒", mode)
	}

	pumpDone := make(chan struct{})
	s.mu.Lock()
	s.active = true
	s.engine = engine
	s.mode = mode
	s.pollIntervalMs = pollIntervalMs
	s.dirs = dirs
	s.mgr = mgr
	s.proc = proc
	s.cancel = cancel
	s.pumpDone = pumpDone
	now := time.Now()
	s.startedAt = now
	s.baselineHandles = baseHandles
	s.lockErrors = 0
	s.reloadCount = 0
	s.events = nil
	s.appendEventLocked(SandboxEvent{
		Time:   now,
		Kind:   "system",
		Title:  title,
		OK:     true,
		Detail: dirs.root,
	})
	s.mu.Unlock()
	if s.logs != nil {
		s.logs.Emit("ok", "sandbox", fmt.Sprintf("%s (%s)", title, dirs.root))
	}

	go func() {
		defer close(pumpDone)
		for ev := range eventCh {
			s.mu.Lock()
			if s.active {
				s.reloadCount++
				s.appendEventLocked(SandboxEvent{
					Time:   ev.Timestamp,
					Kind:   "reload",
					Title:  fmt.Sprintf("触发热重载 [%s]", ev.Reason),
					OK:     true,
					Detail: fmt.Sprintf("引擎: %s / %s", engine, ev.Source),
				})
			}
			s.mu.Unlock()
			if s.logs != nil && engine != EnginePlatform {
				s.logs.Emit("reload", "sandbox", fmt.Sprintf("内置引擎热重载 [%s] (%s)", ev.Reason, ev.Source))
			}
		}
	}()

	time.Sleep(100 * time.Millisecond)
	return s.State(), nil
}

func (s *SandboxManager) Stop() error {
	s.mu.Lock()
	if !s.active {
		s.mu.Unlock()
		return nil
	}
	cancel := s.cancel
	mgr := s.mgr
	proc := s.proc
	pumpDone := s.pumpDone
	root := s.dirs.root
	s.active = false
	s.cancel = nil
	s.mgr = nil
	s.proc = nil
	s.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	if mgr != nil {
		<-mgr.Done()
	}
	if proc != nil {
		_ = proc.Stop()
	}
	if pumpDone != nil {
		<-pumpDone
	}
	if root != "" {
		return os.RemoveAll(root)
	}
	return nil
}

func (s *SandboxManager) State() SandboxState {
	s.mu.Lock()
	defer s.mu.Unlock()

	out := SandboxState{
		Active:          s.active,
		Engine:          s.engine,
		Mode:            s.mode,
		PollIntervalMs:  s.pollIntervalMs,
		WorkspaceDir:    s.dirs.root,
		BaselineHandles: s.baselineHandles,
		LockErrors:      s.lockErrors,
		ReloadCount:     s.reloadCount,
		Events:          append([]SandboxEvent(nil), s.events...),
	}
	if !s.active {
		_, supported := monitor.ProcessHandleCount()
		out.HandleSupported = supported
		return out
	}

	started := s.startedAt
	out.StartedAt = &started
	if s.proc != nil {
		out.ChildPID = s.proc.pid
		out.PlatformVersion = s.proc.version
		out.APIURL = s.proc.apiURL
		out.Stats = s.proc.Stats()
		if h, ok := s.proc.HandleCount(); ok {
			out.HandleSupported = true
			out.CurrentHandles = h
			out.HandleDelta = h
		}
		return out
	}

	curHandles, supported := monitor.ProcessHandleCount()
	out.CurrentHandles = curHandles
	out.HandleSupported = supported
	if supported {
		out.HandleDelta = curHandles - s.baselineHandles
	}
	if s.mgr != nil {
		out.Stats = s.mgr.Stats()
	}
	return out
}

func (s *SandboxManager) Action(action string) (SandboxState, error) {
	s.mu.Lock()
	if !s.active {
		s.mu.Unlock()
		return SandboxState{}, errors.New("sandbox is not running")
	}
	dirs := s.dirs
	s.mu.Unlock()

	t0 := time.Now()
	var title, detail string
	var err error

	switch action {
	case "rename-skill":
		title = "外部重命名技能目录"
		v1 := filepath.Join(dirs.skills, "demo-skill")
		v2 := filepath.Join(dirs.skills, "demo-skill-v2")
		if _, statErr := os.Stat(v1); statErr == nil {
			err = os.Rename(v1, v2)
			detail = "demo-skill → demo-skill-v2"
		} else if _, statErr2 := os.Stat(v2); statErr2 == nil {
			err = os.Rename(v2, v1)
			detail = "demo-skill-v2 → demo-skill"
		} else {
			err = writeFileMkdir(filepath.Join(v1, "SKILL.md"), validSkillMarkdown("demo-skill", "# Demo Skill recreated"))
			detail = "目录不存在，已重建 demo-skill"
		}
	case "delete-recreate-connector":
		title = "外部删除并重建连接器目录"
		conn := filepath.Join(dirs.connectors, "demo-connector")
		if rmErr := os.RemoveAll(conn); rmErr != nil {
			err = rmErr
		} else {
			err = writeFileMkdir(filepath.Join(conn, "skills", "s1", "SKILL.md"), validSkillMarkdown("s1", "# Recreated connector"))
			if err == nil {
				err = writeFileMkdir(filepath.Join(conn, "connector.json"), validConnectorJSON("demo-connector", fmt.Sprintf("1.0.%d", time.Now().Unix()%1000)))
			}
			detail = "已执行 RemoveAll(demo-connector) 并重新写入多级子目录"
		}
	case "replace-connector":
		title = "连接器覆盖发布 (.install-* → live)"
		conn := filepath.Join(dirs.connectors, "demo-connector")
		staging := filepath.Join(dirs.connectors, ".install-demo-connector")
		_ = os.RemoveAll(staging)
		err = writeFileMkdir(filepath.Join(staging, "connector.json"), validConnectorJSON("demo-connector", fmt.Sprintf("2.0.%d", time.Now().Unix()%1000)))
		if err == nil {
			err = writeFileMkdir(filepath.Join(staging, "views", "v1", "index.html"), "<h1>updated</h1>")
		}
		if err == nil {
			if rmErr := os.RemoveAll(conn); rmErr != nil {
				err = rmErr
			} else {
				err = os.Rename(staging, conn)
				detail = "旧目录删除并由 .install-demo-connector 原子覆盖完成"
			}
		}
	case "edit-skill":
		title = "修改 SKILL.md 内容"
		target := filepath.Join(dirs.skills, "demo-skill")
		if _, statErr := os.Stat(target); statErr != nil {
			target = filepath.Join(dirs.skills, "demo-skill-v2")
		}
		err = writeFileMkdir(filepath.Join(target, "SKILL.md"), validSkillMarkdown(filepath.Base(target), "updated="+time.Now().Format(time.RFC3339Nano)))
		detail = filepath.Base(target) + "/SKILL.md 已写入新时间戳"
	case "write-staging":
		title = "写入 .skill-import-staging 临时目录"
		staging := filepath.Join(dirs.skills, ".skill-import-staging")
		err = writeFileMkdir(filepath.Join(staging, "SKILL.md"), validSkillMarkdown("staging-skill", "Staging "+time.Now().Format(time.RFC3339Nano)))
		detail = "已写入 .skill-import-staging（预期不触发重载）"
	case "burst-10":
		title = "连续 10 次创建/重命名/删除压测"
		failures := 0
		var firstErr string
		for i := 0; i < 10; i++ {
			root := dirs.skills
			if i%2 == 1 {
				root = dirs.connectors
			}
			a := filepath.Join(root, fmt.Sprintf("burst-%d-%d", time.Now().UnixNano(), i))
			b := a + "-moved"
			if wErr := writeFileMkdir(filepath.Join(a, "sub", "item.txt"), "burst"); wErr != nil {
				failures++
				if firstErr == "" {
					firstErr = wErr.Error()
				}
				continue
			}
			time.Sleep(50 * time.Millisecond)
			if rErr := os.Rename(a, b); rErr != nil {
				failures++
				if firstErr == "" {
					firstErr = rErr.Error()
				}
				_ = os.RemoveAll(a)
				continue
			}
			if rmErr := os.RemoveAll(b); rmErr != nil {
				failures++
				if firstErr == "" {
					firstErr = rmErr.Error()
				}
			}
		}
		if failures > 0 {
			err = fmt.Errorf("10 轮中发生 %d 次锁冲突，首个错误: %s", failures, firstErr)
			s.mu.Lock()
			s.lockErrors += failures
			s.mu.Unlock()
		} else {
			detail = "10/10 轮外部创建-重命名-删除全部成功"
		}
	default:
		return SandboxState{}, fmt.Errorf("unknown sandbox action %q", action)
	}

	dur := time.Since(t0).Milliseconds()
	s.mu.Lock()
	if err != nil && action != "burst-10" {
		s.lockErrors++
	}
	ev := SandboxEvent{
		Time:       time.Now(),
		Kind:       "action",
		Title:      title,
		OK:         err == nil,
		DurationMs: dur,
		Detail:     detail,
	}
	if err != nil {
		ev.Error = err.Error()
		ev.Detail = "Windows 目录句柄/权限冲突或操作失败"
		if s.logs != nil {
			s.logs.Emit("error", "sandbox", fmt.Sprintf("%s 失败: %s", title, ev.Error))
		}
	} else if s.logs != nil {
		s.logs.Emit("ok", "sandbox", fmt.Sprintf("%s (%s)", title, detail))
	}
	s.appendEventLocked(ev)
	s.mu.Unlock()

	return s.State(), nil
}
