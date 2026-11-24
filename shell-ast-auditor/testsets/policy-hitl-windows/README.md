# Windows HITL 命令审批回归

从 2026 年 11 月 20 日两份 Windows HITL 导出的前次分析明细中，收录 .ps1、内联 Python、HTTP/DNS、Git 和 Go 的 40 条命令审批项。按命令去重后有 31 组，另加 6 组对照，每组各有 PowerShell 5.1 和 7.6 用例。源记录以导出编号、CSV 行号和该行中的审批项位置标识。绝对路径、Chat 标识和网络地址替换成合成路径及 .invalid 保留域名。

新增 3 组文本处理回归，对应 #15–17。每组包含 Desktop 5.1 与 Core 7.6 两条，使用合成的可读文件路径。合计 80 条用例。

54 条有三档审批预期，包括 Git 查询、内联 Python、部分 HTTP/DNS、Go 和这组文本处理回归。26 条保留语法预期及审批观测，其中 .ps1 样本缺少现场脚本内容和写入证明。现场记录只证明发起过审批，实际规则取自当次预审或原 Run 的 awaiting.ask。

## 运行条件

- 选中「Windows HITL 命令审批回归」，以「沿用用例设置」运行会评估按需审批。macOS 上可以选择「纯语法」验证两套解析和字面参数，也可查看保守审批结果。Windows Host 审查需对应版本和实际启动合同。
- Git 用例的 Workspace 和 cwd 应为可编辑的普通测试仓库。含 git -C 的两条还需要一个真实的子仓库「示例仓库」。Git、curl.exe 和 nslookup.exe 需符合启动时冻结的程序身份，测试 curl 默认配置场景时须无活动 curlrc 和外部环境覆盖。
- Auditor 默认使用诊断 CLI 内置的策略，其中按需审批档对自写代码为 hitl。要复查实际部署中的 allow，可在对应 Windows Host 上通过诊断 CLI 显式传 --tools-config，并检查本轮 PATH/PATHEXT 与解释器。语法 profile 只选解析规则。要预审 Core 版本，需用 tools.yml 显式指定实际的 pwsh.exe。诊断 CLI 不执行输入命令。
- 文本用例以可读测试工作区为 cwd，可使用合成的 chat-fixture/sample [text].txt。Desktop 5.1 默认按需预审，Core 7.6 默认只解析。验证 Core 审批预期时，在 Windows 上用 shell-ast 显式传入指定受支持 pwsh.exe 的 tools.yml，避免把 Desktop Host 的决定用于比较。
- 正向验证 AI 自写 .ps1 的放行需要生产等价的 file_write/file_edit 写入证明。独立预审只有脚本路径和 Host 上下文。Platform 的 TestPowerShellScriptUsesConfiguredAuthoredCodePolicy 与 TestPowerShell7ScriptProofAndHardLimits 提供带证明的对照。
