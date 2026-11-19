# 测试集：先看命令，再看预期

| 平台组 | 测试集 | 数量 |
| --- | --- | ---: |
| Windows | [核心集](windows-core/COMMANDS.md)：PowerShell 5.1/7.6、CMD/Batch | 166 |
| Windows | [PowerShell 双版本扩展](powershell-compat/COMMANDS.md)（[范围与依据](powershell-compat/README.md)） | 210 |
| Windows | [快速集](windows-smoke/COMMANDS.md)：引用 Windows 核心用例 | 3 条引用 |
| Windows | [HTTP 取数审批回归](policy-http-windows/COMMANDS.md) | 20 |
| macOS / Linux | [核心集](shell-core/COMMANDS.md)：Bash、sh、Zsh | 233 |
| macOS / Linux | [快速集](smoke/COMMANDS.md)：引用 macOS/Linux 核心用例 | 5 条引用 |
| macOS / Linux | [分类与权限预审](policy-smoke/COMMANDS.md)（Host 相关） | 6 |
| macOS | [HTTP 取数审批回归](policy-http-regression/COMMANDS.md) | 13 |
| macOS / Linux | [Bash 审批回归](policy-shell-regression/COMMANDS.md) | 1 |

页面的测试集选择按这两组展示。Windows 共 396 条独立输入/profile 用例，macOS/Linux 共 253 条，快速集只引用、不重复计数。PowerShell 共 354 条（5.1：204；7.6：150）。原 shell-core 版本 3 的 317 条拆分时分为 shell-core 版本 4 的 209 条和 windows-core 的 108 条；稳定 caseId、命令及预期保持不变，旧运行快照不修改。原 smoke 的 8 条拆为 5 + 3 条。版本 5 再新增 24 条用户适配用例，macOS/Linux 核心集现为 233 条。Windows 核心集版本 3 增加 29 组 PowerShell Host 审查相关输入，共 58 条双 profile 用例。网络地址统一使用保留的 example.invalid。

`COMMANDS.md` 是可读目录，由 `npm run catalog` 生成；**机器读取的唯一维护源是 `testset.json` 和 JSONL 文件**。一行 JSONL 是一条完整用例，`command` 紧跟 `id`，不夹带历史实际结果。多行 Shell 命令用 JSON 的 `\n` 原样编码，目录中显示为代码块。

## 新增一条测试

在对应平台核心集的方言文件中加一行，例如 `shell-core/bash.jsonl`：

```json
{"id":"bash.my-status","command":"git status --short","dialect":"bash","profile":"bash-5.2","platforms":["linux"],"mode":"script","options":{},"tags":["git","arguments"],"expect":{"syntax":"valid","gradeCeiling":"opaque","containsCalls":["git"]},"source":{"kind":"manual","note":"说明来源，不假冒用户原始输入"},"expectedEvidence":"declared expectation; not native acceptance"}
```

稳定 ID 在一个测试集中不可重复。`platforms` 与 `dialect/profile` 分开。明确 source 和 expect；`gradeCeiling=opaque` 不是要求所有结果都 opaque，而是不要求比 opaque 更强的 grade。不要把未运行的用例预先标为通过。

然后在本项目目录执行：

```bash
npm run catalog
npm test && npm run build
```

页面点“查看当前测试集定义”重新读取；新建一次运行，查看“本次预期对比”。以前运行保存的快照不变。

## 新增一个测试集

创建 `testsets/<id>/testset.json`，无须修改后端路由或前端菜单：

```json
{
  "schemaVersion": 1,
  "id": "my-regression",
  "title": "我的回归测试集",
  "version": "1",
  "description": "覆盖某一类问题",
  "files": ["cases.jsonl"],
  "references": [{"testsetId": "shell-core", "caseIds": ["bash.pipeline"]}]
}
```

同目录 `cases.jsonl` 放新增命令；只引用已有用例时 `files` 可为 `[]`。引用与本地用例不能产生重复 id，引用不能循环。执行 `npm run catalog`，刷新页面即可选择测试集。修改预期/集合时建议递增 version；运行仍额外记录解析后的完整测试集 SHA-256，以区分忘记改 version 的变动。

## 新增一次结果对比

相同测试集至少运行两次，在页面“结果对比”选择基准和目标，点“生成运行对比”。也可比较不同测试集，增删项、输入改变和未运行项会分别显示；不能只按相同 ID 就当作同一输入。对比文件保存到 `results/comparisons/`，以后可重新打开或导出。

原始资料快照在 `../evidence/upstream/`，旧版混合文件在 `../evidence/previous/`，均不再作为加载测试集的入口。

## 分类/权限预审用例

[policy-smoke](policy-smoke/COMMANDS.md) 是独立的 Host 相关测试集，不改变核心纯语法基线。用例可增加：

```json
"review": {"mode":"evaluation","accessLevel":"auto_approve"},
"expect": {"syntax":"valid","gradeCeiling":"opaque","policy":{"mode":"evaluation","accessLevel":"auto_approve","decision":"auto_approved"}}
```

不传权限档位时使用 `"review":{"mode":"classification"}`，不填写 accessLevel，policy 预期也不写 decision。省略 review 或选择 syntax-only 为纯解析。review 可选 workspace、cwd、editing；目录必须真实存在，后端不会替你创建，也不会执行命令。Policy 判断依赖实际 Host、文件和上下文，测试预期的 match 不等于生产放行。

[HTTP 取数审批回归](policy-http-regression/COMMANDS.md) 从 A3 和 B6 日志保留 7 条不同的 Bash 调用，另有 6 条权限边界对照。仅更换行情标的的三条转码管道合为一条。使用 macOS Host Bash、可编辑的独立工作区以及默认权限配置进行预审。用例记录目标预期，当前预审偏离时显示差异。内联 Python 用例沿用 Auditor 内置的自写代码策略。

[Windows HTTP 取数审批回归](policy-http-windows/COMMANDS.md) 覆盖请求头与状态输出、Workspace 文件读写、默认 curlrc、PowerShell 文本管道和远端上传。相同命令仅在不同 PowerShell profile 下各保留一次，覆盖 5.1 的 Legacy 与 7.6 的 Standard 原生参数传递。预审需 Windows Host 上已核验的 curl.exe。使用独立测试环境的 Workspace 根作为 cwd。默认配置缺失的用例要求测试环境中无活动 curlrc，也无额外的 curl 环境覆盖。越界读用例的目标还须位于其它读权限根之外。用例只作预审，原生 Windows 运行证据单独记录。

## 三档审批预期

macOS/Linux 的 253 条独立用例和 Windows HTTP 审批回归的 20 条用例在 `expect.policyByLevel` 同时声明 `ask_for_approval`、`auto_approve`、`full_access`。每档包含 `mode: evaluation`、对应 `accessLevel`、明确的 `decision` 和一致的 `requiresHITL`。以 `policyBasis` 记录规则依据及环境前提。按请求的档位比较，纯语法和只分类时显示“未评估审批”。原 `expect.policy` 用于兼容固定模式预期。

Windows 的 376 条核心和兼容性用例声明解析预期。对它们预审可以收集实际分类和决定，审批判断显示“未设预期”。快速集继承引用用例的预期。预期来自命令语义、策略规则及适用环境条件，运行结果用于差异比较。重新运行读取当前预期，历史记录使用运行时的快照。

## 版本 3 的语义断言

`expect.containsArgv` 是执行点中必须出现的完整、字面 argv 数组（例如 `[["coproc","cat"]]`）。它不包括重定向；参数缺失、额外参数或动态值均不满足断言，不从命令名出现推断参数正确。它与语法状态、grade 和审批预期分别比较，已知语法差异不能抵消 argv 缺失。

Bash 3.2 的 `coproc cat` 是普通命令调用，`exec {fd}>out` 的 `{fd}` 是字面参数；带花括号体的 `coproc worker { tool; }` 则语法无效。三档审批仍按 Platform 已登记的命令名硬限制保留 block，不随当前漏检结果改写。PowerShell 空条件正例改为 `${x}?.Name`；旧输入的 knownDifference 不移植到新输入。当前解析器若不满足修正后的预期，应保留真实差异。

`--profile` 是诊断语法配置，不会自动安装或选择对应版本的 Shell；原生语法/语义验收须独立记录实际程序和版本。纯语法、Host 预审、原生 Shell 验证不能互相替代。历史 results 和 evidence 不修改。

[本次用户命令补充与去重说明](shell-core/USER-COMMANDS.md)：12 组 Bash 3.2/5.2 对照，共 24 条。
