# macOS 对话实录审批样本

来源为 2026 年 11 月 24 日的 CuteJ Host Bash 审计。纳入 12 个对话的 113 次 Shell 审批裁决，其中自动批准 103 次，人工通过 8 次，人工拒绝 2 次。历史运行包为 `1b95aecc`，后续静态复核基于 `8ecce62f`。历史裁决说明当时发生了什么，独立 Auditor 会用当前预审器重新判断。

[命令目录](COMMANDS.md)包含 49 条归并后的现场样本与 6 条合成对照。同类仓库查询、聊天日志扫描、脚本重跑及其他同类触发共用代表命令。每次历史调用保留在 `source.occurrences`，包括 JSONL 文件名、物理行号、行内消息及调用或裁决位置、原权限档位和规则族。私人机器路径、Chat 路径、脚本内容和网络目的地用测试输入替换。Unix 系统路径和工具选项按用例需要保留。

| 文件 | 样本 |
| --- | --- |
| [paths.jsonl](paths.jsonl) | 跨仓库、共同父目录、跨 Chat 产物、常规元数据与目录扫描 |
| [execution.jsonl](execution.jsonl) | `cd && node`、显式 cwd、版本探测、Python 编译、`cmp` / `comm`、Git 选项、运行程序 |
| [shell-form.jsonl](shell-form.jsonl) | 进程替换、显式操作数、静态循环及变量引号、运行时 `xargs`、递归删除 |

在 macOS Host Bash 上启动 Auditor，将项目映射目录设为本项目根目录，选择「沿用用例设置」。仓库读取对照使用现成的 `testsets` 子目录模拟独立 Workspace；项目需位于默认临时读根外。区外路径保留合成目标。用例使用平台内置权限预审；程序身份、文件存在性和 Host 配置会影响结果。

17 条用例声明三档审批预期，其余保留语法预期和审批观测。独立预审缺少 Desktop Run 的 Chat 写入证明、挂载和逐 Run 授权。`cd && node` 与显式 cwd 在此可对照参数和当前审批结果，生产的 `cwd: "@chat"` 免审结论还需要匹配的写入摘要。跨仓库逐 Agent `hostAccess.readRoots` 的历史对照需要生产等价上下文。已核验系统 `cmp` / `comm` 的用例声明限定范围内只读的目标预期。历史 reviewer 尚未登记时，偏离在审批判断中可见。

所有命令仅提交给预审器。用例中的临时文件写入、进程和 Git 动作不会执行。
