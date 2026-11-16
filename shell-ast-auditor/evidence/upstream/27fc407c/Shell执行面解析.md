# Shell 执行面解析实验

2026-11-16：已实现独立 `cmd/shell-ast` 和跨方言解析核心，遵循 [第二版计划](../plans/shell-ast-cli.md)。CLI 现已增加[生产同源的分类与审批预审](Shell审批分类.md)，省略 access level 只分类；新 AST 的生产切换仍是供 G1 检查的 **draft**；S0 全方言一致性与 S4 Windows 原生验收仍未完成。Bash 小范围构造已有真实 argv 差分证据，Windows 后端已有离线解析实验，不能据此宣称 Windows 审批能力已升级。

## 使用

```bash
CGO_ENABLED=0 go build -o /tmp/shell-ast ./cmd/shell-ast
/tmp/shell-ast --shell bash --profile bash-5.2 -- 'git -C /project status | head -20 > result.txt'
/tmp/shell-ast --shell bash --profile bash-3.2 --view both --format json --stdin < example.sh
/tmp/shell-ast --shell powershell --profile windows-powershell-5.1 --file example.ps1
/tmp/shell-ast --shell cmd --profile cmd-batch --option delayedexpansion=on --file example.cmd
```

`--shell` 必填。输入只能选 `--file`、`--stdin` 或 `-- TEXT` 一个；不拼接多个参数。默认识别 UTF-8／UTF-16 BOM，否则按 UTF-8；支持显式 `utf-8`、`utf-16le`、`utf-16be`，拒绝不配对 surrogate、无效 UTF-8 和 NUL。Windows PowerShell 5.1 推荐 `--file`，避免其原生参数引号传递与默认 ASCII 管道编码损坏输入。没有默认方言或试跑功能；默认 CLI 新增显式 cwd/Workspace/tools.yml 预审上下文及只读 Host 证据核验，纯语法可用 --syntax-only。

`--view surface|native|both` 只改变树的展示，状态和执行面索引不因视图改变。`--strict` 要求整体 exact。退出码：0 报告成功，10 语法／恢复错误，11 strict 未满足，12 超预算，64 使用错误，65 输入错误，70 内部错误。JSON 只写 stdout，不混入日志。

## 后端与归一化

语法识别全部交给三个上游组件；没有另写 Bash、PowerShell 或 Batch 语法解析器。项目代码只遍历上游树，提取控制结构、执行点、词、顺序和不确定边界。

| 方言 | 固定来源 | 运行方式 |
| --- | --- | --- |
| Bash／sh／Zsh | mvdan/sh `cc0731cd7a1c0a08a6cbd8a2c0df4228413c3287` | 仅语法层的纯 Go 快照，位于 `syntax/surface/shsyntax`；不含 expand/interp |
| PowerShell | tree-sitter-powershell `21b365bdcf4609a431f4acfd3af9eeca9a348927`，ABI 14，含 scanner | 嵌入式 WASM |
| CMD／Batch | tree-sitter-batch `2aa22f00d7f5bbe58556b8eef0b1fc1629508603`，ABI 14 | 嵌入式 WASM |

WASM 直接由 wazero v1.10.1 执行，不依赖 wasitter Go 包。Tree-sitter C runtime 源于 go-tree-sitter v0.25.0 的 MIT 发行副本，开发构建源码归档记录了来源与 SHA-256；wasitter v0.1.0 仅是该源码副本的取得来源与 ABI 构建路线参考。生产审查仍锁定原有 mvdan/sh v3.13.1，没有升级其行为。

WASM 内存初始 32 MiB、最大 256 MiB；不挂载文件系统、不传入环境、参数、网络、输入流或主机进程能力。仅内存中的编译缓存跨请求复用，每次请求重新实例化模块并关闭，防止语法状态跨请求泄漏。C bridge 只调用上游 parser 与 cursor，导出扁平原生节点记录，不含命令语义或权限逻辑。

固定摘要、许可证和重建入口见 [构建目录](../scripts/shell-ast-build/README.md) 与 [backends.lock.json](../scripts/shell-ast-build/backends.lock.json)。两个 WASM 均已在不同临时目录重复构建并逐字节核对摘要。

## 报告合同

[JSON Schema](shell-ast-schema.json) 从 [Go 类型](../internal/shellreview/syntax/surface/types.go) 生成；当前版本 `shell-surface/v1-draft`，尚未经过 G1 锁定。

- `nativeTree` 保留后端类型、字段、标记、错误／缺失节点及有序子节点。Tree-sitter 输出是 CST，不称为完整通用 AST。mvdan 的无位置辅助字段组使用包含它的范围；它们不会进入 exact 清单。
- `structure` 只统一控制结构；表达式细节留在原生树。`execPoints` 关联原生 id，含词片段、literal／symbolic 值、arity、stableArgPrefix、前置赋值、按源码顺序保存的重定向、作用域和可能执行标记。
- `relations` 保存顺序、条件、管道、后台、定义、分支、循环和嵌套关系。连接的是执行点或结构节点；管道是默认连接，明确重定向可能覆盖它。PowerShell 管道标为 objectPipeline。
- 算术、间接展开、动态命令名、source／eval、CMD 展开与 CALL、PowerShell 成员访问和类型转换分别标出不透明区域或执行点。函数定义不当作立即执行；其体内执行点保留为可能执行。
- 字面量 `bash/sh/zsh -c`、PowerShell `-Command`，以及单正文 eval／trap 可递归解析，`nested` 报告有独立 source/id 命名空间，并保存内层 UTF-8 字节到外层原文的映射。名称仅是候选，不证明程序身份；不打开引用的文件。嵌入 Python／Node 正文只保留。
- 所有范围都是解码后原文的 UTF-8 半开字节范围；行列自行从字节计算，列按 Unicode 码点。CRLF 保留；mvdan 对 CR 的已知差异会触发 text_hazard 和 known_parser_divergence。

`syntax`、`recovered`、`profile`、`coverage`、`grade` 独立记录；纯语法模式的 classification 为 not-run；CLI 默认调用生产预审时为 platform-review。coverage=complete 可以表示原生结构已归类或被明确的 opaque 区域覆盖，不表示语义完整。未验证构造会以整个源区域的 unverified_construct 保守覆盖。

示例中 `git` 的 `status`、`/project`、Git 分支、包路径和 URL 都只是参数；没有做主／子命令、路径对象、作用或许可分类。

## grade 与差分证据

[固定观测](../internal/shellreview/syntax/surface/testdata/) 包含本机 macOS Bash 3.2.57 和 Linux Bash 5.2.15 各 25 个无害 fixture：probe、true、false，涵盖引号、空参数、转义、中文／emoji、简单序列、条件链、管道、常用重定向及顺序、引号内标量参数。Linux 观测在无网络、只读系统、临时目录的 linux/amd64 容器中完成（Docker Desktop，架构仿真）；macOS 观测使用空环境与临时 cwd，并未完成只读 macOS VM 验收。

probe 只向继承的观测 fd 写 argv JSON，输出固定 payload；不解释参数。测试只读取已保存的观测，对照归一化的参数顺序、个数、语法和重定向的 stdout／文件结果，不在 `go test` 中运行 Shell。差分清单通过 `scripts/shell-ast-observe/certify.py` 在比较通过后生成，绑定后端 commit、观测 SHA 与 fixture 数量；属性级约束仍由 `grade.go` 检查。

当前 exact／partial 只开放 Bash 3.2／5.2 的窄范围：字面命令名与词、引号内简单标量参数、常用列表／管道／条件和已验证重定向；不包含 glob、花括号、数组、赋值、函数、选项改变、命令替换、算术、后台或任意 fd 操作。`false; rm -rf "/data/run$?"` 为 partial，`$?` 不替换为 0。`rm -f $X file` 保留 stableArgPrefix=2，但尚未满足当前差分清单，整体仍为 opaque。

这不是完整授权级证书。sh、PowerShell、CMD、Zsh 目前都为 opaque／profile unchecked；PS 5.1 与 Bash 3.2 的已知不兼容特性另报 mismatch。授权候选标记表示计划中的目标，不表示已经接入或满足生产验收。

## 语料与实际实验

[大型 JSON 语料](shell-ast-corpus.json) 有 235 个稳定 id：Bash 88、sh 27、Zsh 12、PowerShell 66、CMD 42。包含原文、OS、profile／模式、预期状态和标签；[实际结果](shell-ast-results.json) 保存逐例状态、调用名、诊断、预期差异和计时；[代表性完整输出](shell-ast-examples.json) 可对照两层树。

```bash
CGO_ENABLED=0 go run ./scripts/shell-ast-corpus --output /tmp/shell-ast-results.json
CGO_ENABLED=0 go test ./cmd/shell-ast ./internal/shellreview/...
CGO_ENABLED=0 go run ./scripts/shell-ast-schema > /tmp/shell-ast-schema.json
```

语料绝不执行。用户最早的 22 项原文仍未取得；当前 Git、Go、find、npm 等只是脱敏形态重建，不冒充原始基线，file_glob 也没有伪装成 Shell 工具。

[验证记录](shell-ast-validation.json)：235 条语料在 macOS arm64 与 Linux amd64 容器中的状态、调用名、诊断和预期差异一致（忽略计时）。当前共 212 条 syntax valid、23 条 invalid；Bash 为 28 exact、1 partial、59 opaque，其他方言全部 opaque。四个已登记预期差异保留在结果中；新增差异或漏调用会使语料 runner 非零退出。

相关包回归、schema 样例校验、go vet、后端摘要校验均通过；10 秒 FuzzSurface 完成 228679 次执行，没有崩溃。darwin/arm64、darwin/amd64、linux/amd64、windows/amd64 均以 CGO_ENABLED=0 构建。Windows 与 darwin/amd64 只有构建证据，不记为原生运行通过。

## 预算与性能

显示预算为输入 1 MiB、总原生节点 20000、深度 128、输出 32 MiB、请求 5 秒、嵌套源深度 4、累计映射文本 64 KiB。嵌套共享节点预算与父 context；超限不输出截断 JSON，返回最小 opaque 报告。Bash 输入通过分块 reader 协作检查 context，不能保证中断上游 parser 的纯 CPU 递归；真正的入口限制仍是输入大小，未使用遗留 goroutine 超时模式。WASM 由 context 硬取消。

grade 的结构预算独立固定为输入 64 KiB、2048 节点、深度 64；放宽显示预算不会升级 grade。生产 50ms 时延目标仍需独立验证，不声称当前 Windows 后端已满足。输出预算在完整编码后检查，因此不是 Go 进程 RSS 的硬上限。

[性能记录](shell-ast-performance.json) 是初版纯语法 CLI 的历史基线（当时约 11.3MB），不是加入生产 reviewer 后的新二进制性能保证。新版本机构建约 26.2MB，策略核验另有 Host 证据读取开销。历史测量为 macOS arm64、Go 1.26.1，每方言 7 次全新 CLI 进程；包含冷启动与 WASM 编译。当前端到端 p50 约 Bash 4ms、PowerShell 172ms、CMD 67ms；两个 WASM 线性内存约 32 MiB，CLI 二进制约 11.3MB。同进程语料结果中的延迟包含首次编译与后续实例化，不能当作生产热路径保证。

## 仍未完成

1. Windows 原生 powershell.exe 5.1／pwsh 7.6 官方 AST、原生 argv、CMD 命令行观测和运行验收；交叉编译不代替它。sh 的各实现、Zsh 全构造差分与 MSYS 诊断尚未完成。
2. 目前保留四个语料预期差异：PowerShell switch、null-conditional、后台操作符，以及 CMD 无末尾换行。前三项仍待官方 parser 对照；CMD grammar 会在没有末尾换行时产生隐藏恢复错误，工具没有擅自补换行。实际 syntax/grade 均保守记录，不隐藏错误。
3. 同一输入中的 shopt／alias／setlocal 状态变更没有做分段重解析，相关区域保持 opaque；不能认为后端无错误就满足 profile。CMD 的阶段展开、FOR /F 正文与 PowerShell EncodedCommand 的递归映射未验证。
4. 复杂 PowerShell／CMD 词的精确展开个数、全部流重定向属性、每类条件函数遮蔽和所有再解析入口的属性级投影仍需补差分证据；原生树及 opaque 继续保留这些结构。
5. Linux strace 初始化 I/O 审计、Windows 原生环境、跨发行架构运行、完整压力与更长模糊测试仍待完成。当前依赖图测试已禁止 App/config/httpclient/server 等进入 CLI。
6. G1a/G1b 尚未通过，schema 不锁定，CLI 已复用现有生产命令分析与策略分类/预审；未新增权限豁免、tools.yml 规则或替换生产 walker。计划 §2.5 的 `$?`／CRLF／版本生产审查问题没有顺带修改。
