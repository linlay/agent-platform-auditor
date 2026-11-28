package auditor

import (
	"context"

	"fmt"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"time"

	"catalog-lock-auditor/internal/monitor"
	"catalog-lock-auditor/internal/targetbuild"
)

const validConnectorView = `{"views":{"main":{"title":"Audit","description":"Display audit data.","inputSchema":{"type":"object"},"renderer":"html","usage":["display"],"entry":"views/v1/index.html"}}}`
const providerYAML = "key: audit-provider\nbaseUrl: http://127.0.0.1:19091\napiKey: audit-key\n"
const modelYAML = "key: audit-model\nname: Audit Model\nprovider: audit-provider\nprotocol: OPENAI\nmodelId: audit-local\n"

func writeConnector(root, id, version string) error {
	for path, content := range map[string]string{"connector.json": validConnectorJSON(id, version), "view.json": validConnectorView, "views/v1/index.html": "<h1>Audit</h1>"} {
		if err := writeFileMkdir(filepath.Join(root, path), content); err != nil {
			return err
		}
	}
	return nil
}

func newScenarioCheck(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) (*scenarioCheck, bool) {
	mon, ok := startScenarioMonitor(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return nil, false
	}
	return &scenarioCheck{ctx: ctx, mon: mon, cfg: cfg, mode: mode, res: res, emit: emit}, true
}

func executeSkillRenameDelete(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	demo := filepath.Join(dirs.skills, "demo-skill")
	if !seed(res, map[string]string{filepath.Join(demo, "SKILL.md"): validSkillMarkdown("demo-skill", "demo-v1"), filepath.Join(demo, "scripts", "run.txt"): "echo ok\n"}) {
		return
	}
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	renamed := filepath.Join(dirs.skills, "demo-skill-renamed")
	file := filepath.Join(renamed, "SKILL.md")
	if !s.change("外部重命名技能目录", "skills", func() error { return os.Rename(demo, renamed) }, checks(skillCheck(s.mon, file, "demo-skill", "demo-v1", demo), apiRow(s.mon, "skills", "demo-skill", "", "", true))) {
		return
	}
	if !s.change("修改 SKILL.md 并验证新版", "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("demo-skill", "demo-v2")) }, skillCheck(s.mon, file, "demo-skill", "demo-v2")) {
		return
	}
	// Actual platform save sequence: skill_editor_files.go uploads through .tmp.
	if !s.change("临时文件替换保存", "skills", func() error { return replaceFile(file, validSkillMarkdown("demo-skill", "demo-v3")) }, skillCheck(s.mon, file, "demo-skill", "demo-v3", file+".tmp")) {
		return
	}
	if !s.change("替换后再次保存仍可重载", "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("demo-skill", "demo-v4")) }, skillCheck(s.mon, file, "demo-skill", "demo-v4")) {
		return
	}
	if !s.change("删除技能并验证列表移除", "skills", func() error { return os.RemoveAll(renamed) }, checks(filesEqual(nil, renamed), apiRow(s.mon, "skills", "demo-skill-renamed", "", "", true))) {
		return
	}
	// Reinstalling a deleted package at the same path must remain observable.
	if !s.change("同路径重新安装技能", "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("demo-skill", "demo-v5")) }, skillCheck(s.mon, file, "demo-skill", "demo-v5")) {
		return
	}
	s.change("重新安装后再次更新", "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("demo-skill", "demo-v6")) }, skillCheck(s.mon, file, "demo-skill", "demo-v6"))
}

func executeConnectorReplace(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	live := filepath.Join(dirs.connectors, "demo-connector")
	content := func(root, version string) map[string]string {
		return map[string]string{
			filepath.Join(root, "connector.json"): validConnectorJSON("demo-connector", version), filepath.Join(root, "view.json"): validConnectorView,
			filepath.Join(root, "skills", "s1", "SKILL.md"): validSkillMarkdown("s1", "connector-"+version), filepath.Join(root, "views", "v1", "index.html"): "<h1>" + version + "</h1>",
		}
	}
	if !seed(res, content(live, "1.0.0")) {
		return
	}
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	if err := s.quiet(); err != nil {
		s.step("启动静默", err, "", time.Now())
		return
	}
	staging := filepath.Join(dirs.connectors, ".connector-import-demo-connector")
	if !seed(res, content(staging, "2.0.0")) {
		return
	}
	if !s.silent("暂存新版不触发重载且旧版仍可用", quietWindow(cfg), apiRow(s.mon, "connectors", "demo-connector", "version", "1.0.0", false)) {
		return
	}
	if !s.change("替换上线并验证完整新版", "connectors", func() error {
		if err := os.RemoveAll(live); err != nil {
			return err
		}
		return os.Rename(staging, live)
	}, checks(filesEqual(content(live, "2.0.0"), staging), apiRow(s.mon, "connectors", "demo-connector", "version", "2.0.0", false))) {
		return
	}
	file := filepath.Join(live, "connector.json")
	s.change("替换后再次更新连接器定义", "connectors", func() error { return replaceFile(file, validConnectorJSON("demo-connector", "3.0.0")) }, checks(filesEqual(map[string]string{file: validConnectorJSON("demo-connector", "3.0.0")}, file+".tmp"), apiRow(s.mon, "connectors", "demo-connector", "version", "3.0.0", false)))
}

func executeAgentPrivateSkill(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	if !seed(res, map[string]string{filepath.Join(dirs.providers, "audit-provider.yml"): providerYAML, filepath.Join(dirs.models, "audit-model.yml"): modelYAML}) {
		return
	}
	root := filepath.Join(dirs.agents, "bot-a")
	priv := filepath.Join(root, "skills", "private-skill")
	if !seed(res, map[string]string{filepath.Join(root, "agent.yml"): "key: bot-a\nname: Bot A\nmode: GENERAL\nmodelConfig:\n  modelKey: audit-model\npromptFile: SYSTEM.md\n", filepath.Join(root, "SYSTEM.md"): "You are Bot A.\n", filepath.Join(priv, "SKILL.md"): validSkillMarkdown("private-skill", "private-v1"), filepath.Join(priv, "assets", "note.txt"): "note\n"}) {
		return
	}
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	file := filepath.Join(priv, "SKILL.md")
	if !s.change("更新私有技能并验证内容", "agents", func() error { return writeFileMkdir(file, validSkillMarkdown("private-skill", "private-v2")) }, checks(filesEqual(map[string]string{file: validSkillMarkdown("private-skill", "private-v2")}), apiRow(s.mon, "agents", "private-skill", "description", "private-v2", false))) {
		return
	}
	moved := filepath.Join(root, "skills", "private-skill-v2")
	if !s.change("重命名私有技能并验证旧条目消失", "agents", func() error { return os.Rename(priv, moved) }, checks(filesEqual(map[string]string{filepath.Join(moved, "SKILL.md"): validSkillMarkdown("private-skill", "private-v2")}, priv), apiRow(s.mon, "agents", "private-skill", "", "", true), apiRow(s.mon, "agents", "private-skill-v2", "description", "private-v2", false))) {
		return
	}
	file = filepath.Join(moved, "SKILL.md")
	s.change("重命名后继续修改私有技能", "agents", func() error { return writeFileMkdir(file, validSkillMarkdown("private-skill", "private-v3")) }, checks(filesEqual(map[string]string{file: validSkillMarkdown("private-skill", "private-v3")}), apiRow(s.mon, "agents", "private-skill-v2", "description", "private-v3", false)))
}

func executeStagingPromote(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	if err := s.quiet(); err != nil {
		s.step("启动静默", err, "", time.Now())
		return
	}
	staging := filepath.Join(dirs.skills, ".skill-import-staging")
	live := filepath.Join(dirs.skills, "promoted-skill")
	if !seed(res, map[string]string{filepath.Join(staging, "SKILL.md"): validSkillMarkdown("promoted-skill", "promoted-v1"), filepath.Join(staging, "references", "note.txt"): "complete"}) {
		return
	}
	if !s.silent("暂存目录静默且未出现在 API", quietWindow(cfg), apiRow(s.mon, "skills", "promoted-skill", "", "", true)) {
		return
	}
	file := filepath.Join(live, "SKILL.md")
	if !s.change("原子上线并验证技能可见", "skills", func() error { return os.Rename(staging, live) }, checks(skillCheck(s.mon, file, "promoted-skill", "promoted-v1", staging), filesEqual(map[string]string{filepath.Join(live, "references", "note.txt"): "complete"}))) {
		return
	}
	s.change("上线后继续修改仍可重载", "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("promoted-skill", "promoted-v2")) }, skillCheck(s.mon, file, "promoted-skill", "promoted-v2"))
}

func executeAllCatalogCategories(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	if err := os.Remove(dirs.tools); err != nil {
		res.Steps = append(res.Steps, StepLog{Name: "移除初始 tools 根目录", Error: err.Error()})
		return
	}
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	// All six reasons are exercised here, not merely inferred from other scenarios.
	for _, item := range []struct{ reason, path, body, id, field, value string }{
		{"skills", filepath.Join(dirs.skills, "category-skill", "SKILL.md"), validSkillMarkdown("category-skill", "category-skill-v1"), "category-skill", "description", "category-skill-v1"},
		{"connectors", filepath.Join(dirs.connectors, "category-connector", "connector.json"), validConnectorJSON("category-connector", "1.0.0"), "category-connector", "version", "1.0.0"},
		{"providers", filepath.Join(dirs.providers, "audit-provider.yml"), "key: audit-provider\nbaseUrl: http://127.0.0.1:19091\napiKey: audit-key\n", "audit-provider.yml", "", ""},
		{"models", filepath.Join(dirs.models, "audit-model.yml"), "key: audit-model\nname: Audit Model\nprovider: audit-provider\nprotocol: OPENAI\nmodelId: audit-local\n", "audit-model.yml", "", ""},
		{"agents", filepath.Join(dirs.agents, "bot-a", "skills", "category-private", "SKILL.md"), validSkillMarkdown("category-private", "category-private-v1"), "category-private", "description", "category-private-v1"},
		{"tools", filepath.Join(dirs.tools, "datetime.yml"), "name: datetime\ndescription: Audit datetime override\n", "datetime", "description", "Audit datetime override"},
	} {
		item := item
		stepName := item.reason + " 创建并验证"
		if item.reason == "tools" {
			stepName += "（缺失根延迟创建）"
		}
		passed := s.change(stepName, item.reason, func() error {
			if item.reason == "connectors" {
				if err := writeConnector(filepath.Dir(item.path), "category-connector", "1.0.0"); err != nil {
					return err
				}
			}
			if item.reason == "agents" {
				if err := writeFileMkdir(filepath.Join(dirs.agents, "bot-a", "agent.yml"), "key: bot-a\nname: Bot A\nmode: GENERAL\nmodelConfig:\n  modelKey: audit-model\n"); err != nil {
					return err
				}
			}
			return writeFileMkdir(item.path, item.body)
		}, checks(filesEqual(map[string]string{item.path: item.body}), apiRow(s.mon, item.reason, item.id, item.field, item.value, false)))
		if !passed {
			return
		}
	}
}

func executeSlowCopySettle(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	if err := s.quiet(); err != nil {
		s.step("启动静默", err, "", time.Now())
		return
	}
	root := filepath.Join(dirs.skills, "slow-copy-skill")
	file := filepath.Join(root, "SKILL.md")
	gap := 180 * time.Millisecond
	if cfg.Engine != EnginePlatform && cfg.PollIntervalMs <= 50 {
		gap = 15 * time.Millisecond
	}
	// Observe throughout the copy. Report early notifications honestly; a stable
	// scan is not a transaction boundary and cannot prove atomic multi-file reads.
	copyStart := time.Now()
	counts := map[string]int{}
	want := map[string]string{file: validSkillMarkdown("slow-copy-skill", "copy-v1")}
	err := writeFileMkdir(file, want[file])
	res.Operations++
	lastWrite := copyStart
	for i := 1; i <= 5 && err == nil; i++ {
		var batch map[string]int
		batch, err = observe(ctx, s.mon.Events(), gap)
		for reason, n := range batch {
			counts[reason] += n
		}
		if err != nil {
			break
		}
		if i == 5 {
			lastWrite = time.Now()
		}
		path := filepath.Join(root, "references", fmt.Sprintf("part-%d.txt", i))
		want[path] = fmt.Sprintf("part %d\n", i)
		err = writeFileMkdir(path, want[path])
		res.Operations++
	}
	if !s.step("分步写入 5 个文件", err, fmt.Sprintf("拷贝期间重载 %v；不承诺多文件原子性", counts), copyStart) {
		return
	}
	err = waitVerified(ctx, s.mon.Events(), "skills", lastWrite, reloadTimeout(cfg), checks(filesEqual(want), apiRow(s.mon, "skills", "slow-copy-skill", "description", "copy-v1", false), apiSkillFiles(s.mon, "slow-copy-skill", root, want)))
	if !s.step("最后一个文件写入后完整内容收敛", err, "核验全部文件；真实模式同时核对 API 文件清单及内容 SHA256", lastWrite) {
		return
	}
	s.latencies = append(s.latencies, time.Since(lastWrite).Milliseconds())
	if err := s.quiet(); err != nil {
		s.step("慢拷贝后收口", err, "", time.Now())
		return
	}
	// fsnotify TestWatchMultipleWrite: keep one file descriptor open for both writes.
	double := filepath.Join(dirs.skills, "double-write-skill", "SKILL.md")
	v1 := validSkillMarkdown("double-write-skill", "double-v1")
	v2 := validSkillMarkdown("double-write-skill", "double-final-v2")
	if !s.changeAfter("同一文件句柄连续双写最终为 V2", "skills", func() (time.Time, error) {
		if err := os.MkdirAll(filepath.Dir(double), 0755); err != nil {
			return time.Time{}, err
		}
		f, err := os.OpenFile(double, os.O_CREATE|os.O_RDWR|os.O_TRUNC, 0644)
		if err != nil {
			return time.Time{}, err
		}
		defer f.Close()
		if _, err = f.WriteString(v1); err != nil {
			return time.Time{}, err
		}
		if err = f.Sync(); err != nil {
			return time.Time{}, err
		}
		if err = pause(ctx, gap); err != nil {
			return time.Time{}, err
		}
		afterV2 := time.Now()
		if _, err = f.Seek(0, 0); err != nil {
			return afterV2, err
		}
		if err = f.Truncate(0); err != nil {
			return afterV2, err
		}
		if _, err = f.WriteString(v2); err != nil {
			return afterV2, err
		}
		return afterV2, f.Close()
	}, skillCheck(s.mon, double, "double-write-skill", "double-final-v2")) {
		return
	}
	if err := s.quiet(); err != nil {
		s.step("双写后收口", err, "", time.Now())
		return
	}
	s.step("收口后最新版本保持不变", skillCheck(s.mon, double, "double-write-skill", "double-final-v2")(ctx), "", time.Now())
}

func executeSameSizeMtimeAudit(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	file := filepath.Join(dirs.skills, "audit-skill", "SKILL.md")
	v1 := validSkillMarkdown("audit-skill", "payload-AAAA")
	v2 := validSkillMarkdown("audit-skill", "payload-BBBB")
	if !seed(res, map[string]string{file: v1}) {
		return
	}
	info, err := os.Stat(file)
	if err != nil {
		res.Steps = append(res.Steps, StepLog{Name: "读取原始元数据", Error: err.Error()})
		return
	}
	monitorCfg := cfg
	// Disable periodic metadata scans only in this builtin audit experiment. The
	// unchanged startup baseline remains; only content audit can cause detection.
	if cfg.Engine != EnginePlatform && mode == monitor.ModePolling {
		monitorCfg.PollIntervalMs = int(time.Hour / time.Millisecond)
	}
	mon, ok := startScenarioMonitorWithAudit(ctx, dirs, mode, monitorCfg, 200*time.Millisecond, targets, emit, res)
	if !ok {
		return
	}
	defer mon.Cleanup()
	s := &scenarioCheck{ctx: ctx, mon: mon, cfg: cfg, mode: mode, res: res, emit: emit}
	defer s.finish()
	if err := s.quiet(); err != nil {
		s.step("启动静默", err, "", time.Now())
		return
	}
	idle := 500 * time.Millisecond
	timeout := 3 * time.Second
	if cfg.Engine == EnginePlatform && mode == monitor.ModePolling {
		idle = 365 * time.Second
		timeout = 390 * time.Second
	}
	if !s.silent("空载完整观察窗口无误触发", idle, nil) {
		return
	}
	start := time.Now()
	res.Operations++
	err = os.WriteFile(file, []byte(v2), 0644)
	if err == nil {
		err = os.Chtimes(file, info.ModTime(), info.ModTime())
	}
	if err == nil {
		var after os.FileInfo
		after, err = os.Stat(file)
		if err == nil && (after.Size() != info.Size() || !after.ModTime().Equal(info.ModTime())) {
			err = fmt.Errorf("未成功保持 size/mtime")
		}
	}
	if err != nil {
		addLockError(res, emit, mode, "同元数据改写", err)
		s.step("同元数据改写", err, "", start)
		return
	}
	err = waitVerified(ctx, mon.Events(), "skills", start, timeout, skillCheck(mon, file, "audit-skill", "payload-BBBB"))
	detail := "黑盒仅验证同 size/mtime 改写可见，不把通知归因为内容审计"
	if cfg.Engine != EnginePlatform && mode == monitor.ModePolling {
		detail = "元数据轮询间隔为 1 小时，验证窗口内只有内容审计可触发"
	}
	if s.step("同大小同 mtime 改写检测", err, detail, start) {
		s.latencies = append(s.latencies, time.Since(start).Milliseconds())
	}
}

func executeLockStressLoop(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	rounds := cfg.StressRounds
	if rounds <= 0 {
		rounds = 20
	}
	start := time.Now()
	completed := 0
	var firstErr error
	for i := 0; i < rounds; i++ {
		if ctx.Err() != nil {
			firstErr = ctx.Err()
			break
		}
		root := dirs.skills
		if i%2 == 1 {
			root = dirs.connectors
		}
		pkg := filepath.Join(root, fmt.Sprintf("stress-%03d", i))
		moved := pkg + "-moved"
		res.Operations++
		err := writeFileMkdir(filepath.Join(pkg, "nested", "manifest.json"), fmt.Sprintf(`{"round":%d}`, i))
		if err == nil {
			err = pause(ctx, 50*time.Millisecond)
		}
		if err == nil {
			res.Operations++
			err = os.Rename(pkg, moved)
		}
		if err == nil {
			res.Operations++
			err = os.RemoveAll(moved)
		}
		if err == nil {
			err = filesEqual(nil, pkg, moved)(ctx)
		}
		if err != nil {
			addLockError(res, emit, mode, fmt.Sprintf("压测第 %d 轮", i+1), err)
			if firstErr == nil {
				firstErr = err
			}
		} else {
			completed++
		}
	}
	if completed != rounds && firstErr == nil {
		firstErr = fmt.Errorf("仅完成 %d/%d 轮", completed, rounds)
	}
	s.step("压测轮次与删除结果核验", firstErr, fmt.Sprintf("完成 %d/%d 轮", completed, rounds), start)
	skill := filepath.Join(dirs.skills, "post-stress-check", "SKILL.md")
	if !s.change("压测后 skills 仍可更新", "skills", func() error { return writeFileMkdir(skill, validSkillMarkdown("post-stress-check", "alive")) }, skillCheck(s.mon, skill, "post-stress-check", "alive")) {
		return
	}
	conn := filepath.Join(dirs.connectors, "post-stress-connector")
	s.change("压测后 connectors 仍可更新", "connectors", func() error {
		return writeConnector(conn, "post-stress-connector", "1.0.0")
	}, checks(filesEqual(map[string]string{filepath.Join(conn, "connector.json"): validConnectorJSON("post-stress-connector", "1.0.0")}), apiRow(s.mon, "connectors", "post-stress-connector", "version", "1.0.0", false)))
}

func executeScaleIdleOverhead(ctx context.Context, dirs workspaceDirs, mode monitor.Mode, cfg RunConfig, targets *targetbuild.Manager, emit func(string, string, string), res *ScenarioResult) {
	packages, filesPerPkg := scaleCounts(cfg.ScaleProfile)
	fileCount := 0
	for i := 0; i < packages; i++ {
		root := dirs.skills
		if i%2 == 1 {
			root = dirs.connectors
		}
		name := fmt.Sprintf("pkg-%03d", i)
		pkg := filepath.Join(root, name)
		files := map[string]string{}
		if i%2 == 1 {
			files[filepath.Join(pkg, "connector.json")] = validConnectorJSON(name, "1.0.0")
			files[filepath.Join(pkg, "view.json")] = validConnectorView
			files[filepath.Join(pkg, "views", "v1", "index.html")] = "<h1>Audit</h1>"
		} else {
			files[filepath.Join(pkg, "SKILL.md")] = validSkillMarkdown(name, "scale-v0")
		}
		for f := len(files); f < filesPerPkg; f++ {
			files[filepath.Join(pkg, "sub", fmt.Sprintf("file-%02d.md", f))] = fmt.Sprintf("content-%d-%d", i, f)
		}
		if !seed(res, files) {
			return
		}
		fileCount += len(files)
	}
	s, ok := newScenarioCheck(ctx, dirs, mode, cfg, targets, emit, res)
	if !ok {
		return
	}
	defer s.mon.Cleanup()
	defer s.finish()
	if err := s.quiet(); err != nil {
		s.step("启动静默", err, "", time.Now())
		return
	}
	idle := 2500 * time.Millisecond
	if check := apiScaleSeed(s.mon, packages); check != nil {
		if !s.step("规模测试数据全部有效", check(ctx), fmt.Sprintf("核对 %d 个包的 API 状态", packages), time.Now()) {
			return
		}
	}
	if cfg.Engine != EnginePlatform && cfg.PollIntervalMs <= 50 {
		idle = 350 * time.Millisecond
	}
	before := s.mon.Metrics()
	if !s.silent("规模目录空载无误重载", idle, nil) {
		return
	}
	after := s.mon.Metrics()
	if h, ok := s.mon.HandleValue(); ok {
		res.HandleDelta = h
	}
	resource := &ResourceMetrics{}
	if before.Supported && after.Supported && after.CPUTimeMs >= before.CPUTimeMs && after.ReadOps >= before.ReadOps && after.ReadBytes >= before.ReadBytes {
		resource.IdleCPUMs = after.CPUTimeMs - before.CPUTimeMs
		resource.IdleReadOps = after.ReadOps - before.ReadOps
		resource.IdleReadKB = (after.ReadBytes - before.ReadBytes) / 1024
		resource.PeakMemoryMB = math.Round(max(before.WorkingSetMB, after.WorkingSetMB)*10) / 10
		res.Resources = resource
		s.step("资源观测（不作性能达标判定）", nil, fmt.Sprintf("%d 包 / %d 文件；空载 %s；CPU=%dms，读=%d次；内存为采样最大值", packages, fileCount, idle, resource.IdleCPUMs, resource.IdleReadOps), time.Now())
	} else if runtime.GOOS != "windows" {
		s.step("资源观测（当前系统不支持进程指标）", nil, fmt.Sprintf("%d 包 / %d 文件；未采集 CPU/读计数", packages, fileCount), time.Now())
	} else {
		s.step("资源指标不可用", fmt.Errorf("进程指标不支持或计数异常"), "未把缺失指标当作 0 开销", time.Now())
	}
	file := filepath.Join(dirs.skills, "pkg-000", "SKILL.md")
	const samples = 5
	for i := 0; i < samples; i++ {
		body := fmt.Sprintf("scale-v%d", i+1)
		if !s.change(fmt.Sprintf("规模目录第 %d 次更新", i+1), "skills", func() error { return writeFileMkdir(file, validSkillMarkdown("pkg-000", body)) }, skillCheck(s.mon, file, "pkg-000", body)) {
			return
		}
	}
	latencies := append([]int64(nil), s.latencies...)
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	resource.LatencyP50Ms = percentileMs(latencies, .5)
	resource.LatencyP95Ms = percentileMs(latencies, .95)
	res.Resources = resource
	s.step("5 次样本延迟统计", nil, fmt.Sprintf("P50=%dms，P95=%dms（5 个样本的 P95 等于最大值，仅供对照）", resource.LatencyP50Ms, resource.LatencyP95Ms), time.Now())
	root := filepath.Dir(file)
	moved := root + "-renamed"
	s.change("规模目录重命名后仍完成重载", "skills", func() error { return os.Rename(root, moved) }, checks(skillCheck(s.mon, filepath.Join(moved, "SKILL.md"), "pkg-000", "scale-v5", root), apiRow(s.mon, "skills", "pkg-000", "", "", true)))
}
