# 用户命令补充

`user-commands.jsonl` 收录 12 组输入，每组分别覆盖 macOS Bash 3.2 与 Linux Bash 5.2，共 24 条。只作为解析器输入，不执行命令、不连接 SSH/Docker、不读取原文件。

新增覆盖：Go 环境多键查询、含 `@` 的模块缓存路径、ps 逗号列参数、Docker 未引用格式串及引用对照、git status --ignored、SSH 单命令/双引号复合参数/远端目录检查/SQL 引号/循环字面量与变量对照。

去重依据：普通版本查询已由直接命令参数及 python 调用结构覆盖；unzip -l 已有 bash.unzip（及 macOS 适配），引用路径和 Unicode 另有覆盖；两个 file_grep 路径只选择 nodes.go 代表；ssh 的 df/free 单命令只选择 df 代表。远端复合脚本的不同引号层次仍分别保留。

规范化输入展示中的 `&#x20;`、Markdown mailto 包装与排版行尾反斜杠；本机用户名和远端别名替换为 fixture 占位值。source.note 标明具体适配，不冒充用户逐字原文。源示例中的 SQL 和远端目录仅作为文本保留。

两个容易混淆的语义分别断言完整的本地 argv：

- `docker ps --format {{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}` 是四段管道；带引号对照是一条 Docker 调用、一个格式参数。
- SSH 外层单引号中的 `-d "db"` 是远端字面量；派生对照 `-d "$db"` 保留美元符号交给远端。只要求整个脚本是同一个 SSH 参数，不把远端 ls/sudo/ksql 当成本地调用，也不声称已验证远端 Shell 或 SQL 行为。

三档审批按现有默认策略合同声明：未知工具、外部路径及远端脚本按保守 opaque 预期；Git 查询要求系统 Git 可核验、无外部 helper/活动 hook。纯语法默认不评估审批，不以本地解析通过替代真实 Host 审批或远端执行验收。

本次验证：24 条均通过本机 Bash 的 `-n` 语法检查；对当前 shell-ast 进行纯语法与字面 argv 检查，22 条符合、2 条未引用 Docker 格式串用例的字面值断言不符。解析器识别四段管道，但将花括号词标为 symbolic；保留预期与真实差异，未登记 knownDifference。见[验证摘要](../../evidence/user-commands-validation.json)。
