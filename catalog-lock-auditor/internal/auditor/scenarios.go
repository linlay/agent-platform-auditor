package auditor

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"catalog-lock-auditor/internal/loghub"
	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

// ListScenarios returns metadata for all built-in catalog lock audit scenarios.
func ListScenarios() []ScenarioInfo {
	return []ScenarioInfo{
		{
			ID:              "skill-dir-rename-delete",
			Name:            "技能目录外部重命名与删除",
			Category:        "skills",
			Description:     "模拟无 API 事务下直接对 skills-center 子目录重命名、改写 SKILL.md 与删除，验证句柄锁冲突与热重载。",
			Focus:           "核心文件锁冲突 + 热重载",
			DefaultSelected: true,
		},
		{
			ID:              "connector-dir-replace",
			Name:            "连接器目录覆盖升级替换",
			Category:        "connectors",
			Description:     "模拟连接器安装/升级：写入 .connector-import-* 暂存目录，删除旧目录并原子 Rename 为正式目录。",
			Focus:           "多级子目录覆盖锁",
			DefaultSelected: true,
		},
		{
			ID:              "agent-private-skill-update",
			Name:            "Agent 私有技能树热更新",
			Category:        "agents",
			Description:     "测试 agents/<agent>/skills/ 私有技能目录在更新 SKILL.md 及重命名时的锁占用与重载触发。",
			Focus:           "嵌套私有技能目录",
			DefaultSelected: true,
		},
		{
			ID:              "staging-ignore-and-promote",
			Name:            "Staging 临时目录忽略与上线",
			Category:        "skills",
			Description:     "验证 .skill-import-staging 写入阶段不误触发半成品重载，Rename 为正式目录后无锁报错并触发重载。",
			Focus:           "临时目录过滤 + 原子上线",
			DefaultSelected: true,
		},
		{
			ID:              "all-catalog-categories",
			Name:            "全 6 类 Catalog 与延迟建目录",
			Category:        "catalog",
			Description:     "覆盖 providers、models 热重载，以及启动时 tools/ 缺失、运行中新建 tools/ 后能否自动感应重载。",
			Focus:           "TC-FUNC-01/04 全分类与空根延迟创建",
			DefaultSelected: true,
		},
		{
			ID:              "slow-copy-settle",
			Name:            "慢拷贝最终收敛与双写一致性",
			Category:        "skills",
			Description:     "观察分步写入期间的重载，写完后验证最终内容；同一文件句柄连续双写并核对最新版本。",
			Focus:           "慢拷贝最终态 + 连续双写",
			DefaultSelected: true,
		},
		{
			ID:              "lock-stress-loop",
			Name:            "高频重命名/删除锁冲突压测",
			Category:        "stress",
			Description:     "在 skills-center 与 connectors-center 交替执行多轮创建子目录、写入、重命名与整树删除，统计锁错误率。",
			Focus:           "Windows 目录占用概率压测",
			DefaultSelected: true,
		},
		{
			ID:              "scale-idle-overhead",
			Name:            "目录规模、资源开销与 P50/P95 延迟",
			Category:        "performance",
			Description:     "按 small/medium/large/xlarge 生成有效 Catalog 树，采集进程 CPU/内存/读 I/O、句柄数与 5 次更新验证耗时的 P50/P95。",
			Focus:           "TC-PERF-01/02 资源开销与分位延迟",
			DefaultSelected: true,
		},
		{
			ID:              "same-size-mtime-audit",
			Name:            "同大小同 mtime 审计兜底与空载静默",
			Category:        "audit",
			Description:     "先空载跨过审计窗口确认 0 误触发，再写入等字节内容并还原 mtime，验证改写可被检测；内置 Polling 单独隔离内容审计验证。",
			Focus:           "TC-POLL-03/04 长时内容审计兜底",
			DefaultSelected: false,
			EstimatedTime:   "长时专项（真实 Polling 最慢约 13 分钟）",
		},
	}
}

type workspaceDirs struct {
	root       string
	skills     string
	connectors string
	agents     string
	models     string
	providers  string
	tools      string
}

func setupWorkspace() (workspaceDirs, error) {
	root, err := os.MkdirTemp("", "catalog-lock-audit-*")
	if err != nil {
		return workspaceDirs{}, err
	}
	dirs := workspaceDirs{
		root:       root,
		skills:     filepath.Join(root, "skills-center"),
		connectors: filepath.Join(root, "connectors-center"),
		agents:     filepath.Join(root, "agents"),
		models:     filepath.Join(root, "registries", "models"),
		providers:  filepath.Join(root, "registries", "providers"),
		tools:      filepath.Join(root, "tools"),
	}
	for _, p := range []string{dirs.skills, dirs.connectors, dirs.agents, dirs.models, dirs.providers, dirs.tools} {
		if err := os.MkdirAll(p, 0755); err != nil {
			_ = os.RemoveAll(root)
			return workspaceDirs{}, err
		}
	}
	return dirs, nil
}

func (d workspaceDirs) entries() []monitor.Entry {
	return []monitor.Entry{
		{Path: d.skills, Reason: "skills"},
		{Path: d.connectors, Reason: "connectors"},
		{Path: d.agents, Reason: "agents"},
		{Path: d.models, Reason: "models"},
		{Path: d.providers, Reason: "providers"},
		{Path: d.tools, Reason: "tools"},
	}
}

func writeFileMkdir(path, content string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

func validSkillMarkdown(name, body string) string {
	return fmt.Sprintf("---\nname: %s\ndescription: %q\n---\n\n%s\n", name, body, body)
}

func validConnectorJSON(id, version string) string {
	return fmt.Sprintf(`{"id":%q,"name":%q,"description":"audit connector","version":%q,"type":"view","authMode":"self"}`, id, id, version)
}

func reloadTimeout(cfg RunConfig) time.Duration {
	if cfg.Engine == EnginePlatform {
		return 6 * time.Second
	}
	return max(2*time.Second, time.Duration(cfg.PollIntervalMs*6+cfg.ReloadDebounceMs+500)*time.Millisecond)
}

func isWindowsLockError(err error) bool {
	if runtime.GOOS != "windows" || err == nil {
		return false
	}
	if errors.Is(err, syscall.Errno(32)) || errors.Is(err, syscall.Errno(33)) {
		return true
	}
	// On Windows, ReadDirectoryChangesW directory handles cause external
	// rename/remove calls on watched directories to fail with ERROR_ACCESS_DENIED (5).
	if !errors.Is(err, syscall.Errno(5)) {
		return false
	}
	var linkErr *os.LinkError
	if errors.As(err, &linkErr) {
		return strings.EqualFold(linkErr.Op, "rename")
	}
	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		op := strings.ToLower(pathErr.Op)
		return op == "rename" || op == "remove" || op == "removeall"
	}
	return false
}

func addLockError(res *ScenarioResult, emit func(level, source, msg string), mode monitor.Mode, stepName string, err error) {
	if err == nil {
		return
	}
	msg := fmt.Sprintf("[%s] %v", stepName, err)
	kind := "文件操作失败"
	if isWindowsLockError(err) {
		res.LockErrors++
		kind = "锁冲突"
		if len(res.LockErrorSamples) < 8 {
			res.LockErrorSamples = append(res.LockErrorSamples, msg)
		}
	}
	if emit != nil {
		emit("error", string(mode), fmt.Sprintf("%s %s", kind, msg))
	}
}

type activeMonitor interface {
	Events() <-chan monitor.ReloadEvent
	Stats() monitor.Stats
	HandleValue() (int, bool)
	Metrics() monitor.ProcessMetrics
	PlatformProcess() *platformProcess
	Cleanup()
}

type builtinMonitor struct {
	mgr         *monitor.Manager
	cancel      context.CancelFunc
	baseHandles int
	supported   bool
	res         *ScenarioResult
}

func (b *builtinMonitor) Events() <-chan monitor.ReloadEvent { return b.mgr.Events() }
func (b *builtinMonitor) Stats() monitor.Stats               { return b.mgr.Stats() }
func (b *builtinMonitor) PlatformProcess() *platformProcess  { return nil }
func (b *builtinMonitor) Metrics() monitor.ProcessMetrics {
	return monitor.SampleProcessMetrics(os.Getpid())
}
func (b *builtinMonitor) HandleValue() (int, bool) {
	if !b.supported {
		return 0, false
	}
	after, ok := monitor.ProcessHandleCount()
	if !ok {
		return 0, false
	}
	return after - b.baseHandles, true
}
func (b *builtinMonitor) Cleanup() {
	stats := b.mgr.Stats()
	b.res.ScanCount = stats.Scans
	b.res.LastScanMs = stats.LastScanMs
	if stats.WatchedDirs > b.res.WatchedDirs {
		b.res.WatchedDirs = stats.WatchedDirs
	}
	b.cancel()
	<-b.mgr.Done()
}

type platformMonitor struct {
	proc *platformProcess
	res  *ScenarioResult
}

func (p *platformMonitor) Events() <-chan monitor.ReloadEvent { return p.proc.Events() }
func (p *platformMonitor) Stats() monitor.Stats               { return p.proc.Stats() }
func (p *platformMonitor) PlatformProcess() *platformProcess  { return p.proc }
func (p *platformMonitor) Metrics() monitor.ProcessMetrics    { return p.proc.Metrics() }
func (p *platformMonitor) HandleValue() (int, bool)           { return p.proc.HandleCount() }
func (p *platformMonitor) Cleanup() {
	stats := p.proc.Stats()
	p.res.ScanCount = stats.Scans
	if stats.WatchedDirs > p.res.WatchedDirs {
		p.res.WatchedDirs = stats.WatchedDirs
	}
	p.res.Logs = p.proc.RecentLogs()
	_ = p.proc.Stop()
}

func startScenarioMonitorWithAudit(
	parent context.Context,
	dirs workspaceDirs,
	mode monitor.Mode,
	cfg RunConfig,
	auditInterval time.Duration,
	targets *targetbuild.Manager,
	emit func(level, source, msg string),
	res *ScenarioResult,
) (activeMonitor, bool) {
	if cfg.Engine == EnginePlatform {
		binPath, err := targets.BinaryPath(mode)
		if err != nil {
			res.Steps = append(res.Steps, StepLog{Name: "定位真实 Platform 二进制", OK: false, Error: err.Error()})
			return nil, false
		}
		proc, err := startPlatformProcess(parent, binPath, dirs, mode, emit)
		if err != nil {
			res.Steps = append(res.Steps, StepLog{Name: "启动真实 agent-platform 进程", OK: false, Error: err.Error()})
			return nil, false
		}
		time.Sleep(150 * time.Millisecond)
		res.ChildPID = proc.pid
		res.PlatformVersion = proc.version
		res.HandleMetricKind = "process-total"
		stats := proc.Stats()
		res.WatchedDirs = stats.WatchedDirs
		if h, ok := proc.HandleCount(); ok {
			res.HandleSupported = true
			res.HandleDelta = h
		}
		return &platformMonitor{proc: proc, res: res}, true
	}

	baseHandles, supported := monitor.ProcessHandleCount()
	res.HandleSupported = supported
	res.HandleMetricKind = "delta"

	mctx, cancel := context.WithCancel(parent)
	opts := monitor.Options{
		PollInterval:  time.Duration(cfg.PollIntervalMs) * time.Millisecond,
		AuditInterval: auditInterval,
		Debounce:      time.Duration(cfg.ReloadDebounceMs) * time.Millisecond,
	}
	mgr, err := monitor.Start(mctx, mode, dirs.entries(), opts)
	if err != nil {
		cancel()
		res.Steps = append(res.Steps, StepLog{Name: "启动内置监测器", OK: false, Error: err.Error()})
		return nil, false
	}

	time.Sleep(80 * time.Millisecond)
	stats := mgr.Stats()
	res.WatchedDirs = stats.WatchedDirs
	if afterHandles, ok := monitor.ProcessHandleCount(); ok && supported {
		res.HandleDelta = afterHandles - baseHandles
	}

	return &builtinMonitor{
		mgr:         mgr,
		cancel:      cancel,
		baseHandles: baseHandles,
		supported:   supported,
		res:         res,
	}, true
}

func startScenarioMonitor(
	parent context.Context,
	dirs workspaceDirs,
	mode monitor.Mode,
	cfg RunConfig,
	targets *targetbuild.Manager,
	emit func(level, source, msg string),
	res *ScenarioResult,
) (activeMonitor, bool) {
	return startScenarioMonitorWithAudit(parent, dirs, mode, cfg, 0, targets, emit, res)
}

func runScenario(ctx context.Context, info ScenarioInfo, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, logs *loghub.Hub) ScenarioResult {
	started := time.Now()
	engine := cfg.Engine
	if engine == "" {
		engine = EngineBuiltin
	}
	var emit func(level, source, msg string)
	if logs != nil {
		emit = logs.Emit
	}
	if emit != nil {
		emit("info", "runner", fmt.Sprintf("开始场景 [%s/%s] %s", engine, mode, info.Name))
	}

	res := ScenarioResult{
		ID:       info.ID,
		Name:     info.Name,
		Category: info.Category,
		Engine:   engine,
		Mode:     string(mode),
		Status:   "failed",
	}

	dirs, err := setupWorkspace()
	if err != nil {
		res.Steps = append(res.Steps, StepLog{Name: "创建临时沙盒目录", OK: false, Error: err.Error()})
		res.DurationMs = time.Since(started).Milliseconds()
		return res
	}
	defer func() {
		_ = os.RemoveAll(dirs.root)
	}()

	switch info.ID {
	case "skill-dir-rename-delete":
		executeSkillRenameDelete(ctx, dirs, mode, cfg, targets, emit, &res)
	case "connector-dir-replace":
		executeConnectorReplace(ctx, dirs, mode, cfg, targets, emit, &res)
	case "agent-private-skill-update":
		executeAgentPrivateSkill(ctx, dirs, mode, cfg, targets, emit, &res)
	case "staging-ignore-and-promote":
		executeStagingPromote(ctx, dirs, mode, cfg, targets, emit, &res)
	case "all-catalog-categories":
		executeAllCatalogCategories(ctx, dirs, mode, cfg, targets, emit, &res)
	case "slow-copy-settle":
		executeSlowCopySettle(ctx, dirs, mode, cfg, targets, emit, &res)
	case "lock-stress-loop":
		executeLockStressLoop(ctx, dirs, mode, cfg, targets, emit, &res)
	case "scale-idle-overhead":
		executeScaleIdleOverhead(ctx, dirs, mode, cfg, targets, emit, &res)
	case "same-size-mtime-audit":
		executeSameSizeMtimeAudit(ctx, dirs, mode, cfg, targets, emit, &res)
	default:
		res.Steps = append(res.Steps, StepLog{Name: "未知场景", OK: false, Error: "unknown scenario: " + info.ID})
	}

	res.DurationMs = time.Since(started).Milliseconds()
	allStepsOK := len(res.Steps) > 0
	for _, s := range res.Steps {
		if !s.OK {
			allStepsOK = false
			break
		}
	}
	if ctx.Err() != nil {
		res.Steps = append(res.Steps, StepLog{Name: "场景被取消", OK: false, Error: ctx.Err().Error()})
		allStepsOK = false
	}
	if allStepsOK && res.LockErrors == 0 && res.ReloadDetected {
		res.Status = "passed"
	}
	if emit != nil {
		lvl := "ok"
		if res.Status != "passed" || res.LockErrors > 0 {
			lvl = "warn"
		}
		emit(lvl, "runner", fmt.Sprintf("结束场景 [%s/%s] %s → %s (锁错误=%d, 耗时=%dms)", engine, mode, info.ID, res.Status, res.LockErrors, res.DurationMs))
	}
	return res
}

func scaleCounts(profile string) (packages int, filesPerPkg int) {
	switch profile {
	case "xlarge":
		return 400, 12 // 4,800 files, 800+ dirs
	case "large":
		return 150, 10 // 1,500 files, 300+ dirs
	case "medium":
		return 50, 8 // 400 files, 100+ dirs
	default:
		return 15, 4 // 60 files, 30+ dirs
	}
}

func percentileMs(sorted []int64, p float64) int64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(math.Ceil(p*float64(len(sorted)))) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}

func nonEmptyScale(s string) string {
	if s == "" {
		return "small"
	}
	return s
}
