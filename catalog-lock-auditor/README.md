# Catalog Lock Auditor

Windows 目录监测机制可视化对照测试台，用于在隔离沙盒目录中直观对比 **Watcher（`fsnotify`）** 与 **Polling（自适应 `WalkDir` 元数据轮询）** 在 `skills-center`、`connectors-center`、`agents` 等 Catalog 目录上的**文件锁冲突、系统句柄占用、热重载延迟与扫描开销**。

支持两种被测目标模式（**零 Python 依赖**）：

1. **内置 Go 引擎（`builtin`）**：零外部仓库依赖、秒级离线运行，复现 `fsnotify` 与自适应轮询的底层机制。
2. **真实 `agent-platform.exe` 黑盒对照（`platform`，Web 界面默认）**：纯 Go 通过只读 `git worktree` 从相邻 `../agent-platform` 编译出两份独立可执行文件（如 `f83e7d60~1` Watcher 版 vs `f83e7d60` Polling 版），在隔离 `AP_RUNTIME_DIR` 下真实拉起子进程，直接采集子进程 OS 句柄数、真实 `[reload]` 日志、`/api/admin/skills` 接口与覆盖锁表现，绝不修改 `../agent-platform` 源码或运行数据。

## 快速启动

需要 **Go 1.25+** 与 **Node.js 20+**（无需 Python），仅在当前目录执行：

```powershell
cd agent-platform-auditor\catalog-lock-auditor
npm install
npm test
npm run build
npm run server
```

启动后访问：<http://127.0.0.1:8095>（可通过 `AUDITOR_ADDR` 修改监听地址，如 `AUDITOR_ADDR=127.0.0.1:8096`）。

## 构建真实 `agent-platform.exe` 目标（可选）

既可在 Web 界面点击 **「构建」** 一键构建，也可以在命令行执行：

```powershell
npm run target:build
# 或自定义源码路径与 Git 引用：
# $env:PLATFORM_SOURCE="d:\zenmind-workspace\agent-platform"
# npm run target:build -- -watcher-ref f83e7d60~1 -polling-ref f83e7d60
```

产物写入 `bin/targets/agent-platform-watcher.exe`、`bin/targets/agent-platform-polling.exe` 与 `bin/targets/manifest.json`（均被 `.gitignore` 忽略）。

## 测试场景

1. `skill-dir-rename-delete`：重命名、修改、临时文件替换保存、再次保存、删除、同路径重新安装及后续更新；核对具体版本与旧条目消失
2. `connector-dir-replace`：连接器导入暂存目录（`.connector-import-*`）→ live；核对完整新版、旧版替换及再次保存
3. `agent-private-skill-update`：有效 Agent 的私有技能更新、重命名、重命名后继续更新；核对私有技能条目
4. `staging-ignore-and-promote`：Staging 静默与未发布检查，上线可见及上线后继续修改
5. `all-catalog-categories`：全 6 类 Catalog（含 `providers`、`models`）及启动缺失 `tools/` 延迟创建感知
6. `slow-copy-settle`：完整记录慢拷贝期间重载，最后一个文件写完后核对全部内容（真实模式核对 API 文件清单及 SHA256）；同一文件句柄连续双写后核对最终版本
7. `lock-stress-loop`：逐轮核对操作及删除结果，压测后分别验证 skills、connectors；未完成轮次不能通过
8. `scale-idle-overhead`：规模数据有效性、空载无误重载、Windows 资源采样、5 次更新最终态、重命名后重载；P50/P95 仅描述本次 5 个样本，不作性能达标结论
9. `same-size-mtime-audit`（默认不勾选）：空载静默 + 等大小同 `mtime` 改写。内置 Polling 将元数据扫描间隔设为 1 小时，隔离验证内容审计；真实模式仅验证黑盒检测结果，不据日志归因。真实 Polling 空载观察 365 秒，再最多等待 390 秒

## 通过的含义

- 每个独立变更前等待上一轮事件收口，变更后只接受最终写入之后的对应类别通知，并核对预期状态。取消、事件流关闭、超时、文件操作失败均不能通过。
- 内置模式验证磁盘操作和监测通知；不冒充真实平台业务加载。真实模式同时核对重载完成日志和管理 API 中的具体对象、版本、有效状态或删除结果。管理 API 部分直接读盘，不能据此宣称所有运行时消费者缓存均已更新。
- 慢拷贝验证最终收敛，不宣称多文件写入原子性。写入期间的重载次数如实展示。
- Windows 仅把系统错误 32/33 计为确认的锁冲突；拒绝访问（5）等错误仍使步骤失败，但不擅自归因为锁冲突。失败步骤包含原始系统错误码。
- 资源采集失败不能显示成零开销；句柄、内存显示采样最大值。5 个延迟样本的 P95 就是最大样本。

本次只在现有 9 个场景中补步骤，没有新增场景 ID。连续持有同一文件句柄写入参考 [fsnotify v1.9.0 的 TestWatchMultipleWrite](https://github.com/fsnotify/fsnotify/blob/v1.9.0/fsnotify_test.go)，目录删除参考同文件的 `TestWatchRemoveWatchedDir`；仅借鉴操作序列，不照搬跨平台事件数量和顺序。临时文件替换保存对应目标平台 `internal/catalog/skill_editor_files.go` 的上传流程与 `internal/connector/catalog.go` 的定义保存流程；连接器暂存目录对应 `internal/connector/archive.go`，替换后继续修改与删除后重装均沿用现有安装/更新流程。

默认离线测试执行两种模式的全部 9 个场景，并测试错误判定本身。被测系统的已知 Windows 操作失败在报告中仍为 `failed`；测试审计器能否正确记录失败，不会把系统拒绝操作改判为通过。

真实二进制验证为独立命令，读取已有 `bin/targets/manifest.json`，只启动隔离沙盒，不自动构建或修改目标仓库：

```powershell
$env:AUDITOR_PLATFORM_TEST = '1'
go test ./internal/auditor -run TestPlatformScenarios -count=1 -v -timeout 20m
# 加上内容审计完整周期（默认显式跳过此长时项）：
$env:AUDITOR_AUDIT_TEST = '1'
go test ./internal/auditor -run TestPlatformScenarios -count=1 -v -timeout 20m
Remove-Item Env:AUDITOR_PLATFORM_TEST, Env:AUDITOR_AUDIT_TEST
```

真实验证发现任何场景失败都会返回非零退出码，不会把 Watcher 的已知限制计作通过。

## 常用命令

```powershell
npm test          # Go 单测 + Vitest 领域测试（全离线）
npm run build     # TypeScript 严格校验 + 编译 UI 模块 + 构建 bin/catalog-lock-auditor(.exe)
npm run target:build  # 纯 Go 只读构建两份真实 agent-platform 二进制到 bin/targets/
npm run server    # 启动 HTTP API 与界面服务（默认 127.0.0.1:8095）
```
