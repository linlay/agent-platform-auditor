# Windows HITL 命令审批回归

从 2026 年 11 月 20 日两份 Windows HITL 导出的前次分析明细中，收录 .ps1、内联 Python、HTTP/DNS、Git 和 Go 的 40 条命令审批项。按命令去重后有 31 组，另加 6 组对照，每组各有 PowerShell 5.1 和 7.6 用例。源记录以导出编号、CSV 行号和该行中的审批项位置标识。绝对路径、Chat 标识和网络地址替换成合成路径及 .invalid 保留域名。

收录 3 组文本处理回归，对应 #15–17，以及 3 组文件名筛选回归，对应 #04、#08 和动态谓词对照。每组包含 Desktop 5.1 与 Core 7.6 两条，使用合成测试路径。另有 7 组版本查询及参数对照，共 100 条用例。

74 条有三档审批预期，包括 Git 查询、内联 Python、部分 HTTP/DNS、Go、文本处理和文件名筛选回归。26 条保留语法预期及审批观测，其中 .ps1 样本缺少现场脚本内容和写入证明。现场记录只证明发起过审批，实际规则取自当次预审或原 Run 的 awaiting.ask。

从 shell-ast-auditor 根目录启动服务，Go 路径对照的工作区和 cwd 都相对此目录解析。先运行 npm run build 生成 bin/auditor，同一个普通 Go 二进制用于两条路径对照。Go 启动环境使用 GOENV=off、GOTOOLCHAIN=local，无 GOFLAGS 或加载覆盖。使用独立测试账号，其遥测已关闭且 mode 文件处于授权读根内，或用无用户配置目录的隔离诊断进程。区外读取对照要求项目放在临时目录和其他预授权根之外。整集选择「沿用用例设置」会应用每条用例的工作目录。手动切换档位复测区外读取时，工作区和 cwd 均设为该项目下 testsets 的实际路径。 Windows 正向用例需要受信的 git、node、python 和 go 可执行文件。

## 运行条件

- 选中「Windows HITL 命令审批回归」，以「沿用用例设置」运行会评估按需审批。macOS 上可以选择「纯语法」验证两套解析和字面参数，也可查看保守审批结果。Windows Host 审查需对应版本和实际启动合同。
- Git 用例的 Workspace 和 cwd 应为可编辑的普通测试仓库。含 git -C 的两条还需要一个真实的子仓库「示例仓库」。Git、curl.exe 和 nslookup.exe 需符合启动时冻结的程序身份，测试 curl 默认配置场景时须无活动 curlrc 和外部环境覆盖。
- Auditor 默认使用诊断 CLI 内置的策略，其中按需审批档对自写代码为 hitl。要复查实际部署中的 allow，可在对应 Windows Host 上通过诊断 CLI 显式传 --tools-config，并检查本轮 PATH/PATHEXT 与解释器。语法 profile 只选解析规则。要预审 Core 版本，需用 tools.yml 显式指定实际的 pwsh.exe。诊断 CLI 不执行输入命令。
- 文本用例以可读测试工作区为 cwd，可使用合成的 chat-fixture/sample [text].txt。Desktop 5.1 默认按需预审，Core 7.6 默认只解析。验证 Core 审批预期时，在 Windows 上用 shell-ast 显式传入指定受支持 pwsh.exe 的 tools.yml，避免把 Desktop Host 的决定用于比较。
- 文件名筛选用例把 Workspace 和 cwd 设为同一个已创建、可读且可编辑的合成测试目录，使用发布默认权限配置。需要复核原生命令输出时，可在目录内新建 `.kbx` 子目录和 `sample-kbx.txt`。Desktop 5.1 默认按需预审，Core 7.6 默认只解析。Core 权限预审需要为 `shell-ast` 显式指定匹配的 `pwsh.exe` 启动配置。
- 正向验证 AI 自写 .ps1 的放行需要生产等价的 file_write/file_edit 写入证明。独立预审只有脚本路径和 Host 上下文。Platform 的 TestPowerShellScriptUsesConfiguredAuthoredCodePolicy 与 TestPowerShell7ScriptProofAndHardLimits 提供带证明的对照。
