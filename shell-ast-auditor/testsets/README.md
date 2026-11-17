# 测试集：先看命令，再看预期

- [核心集：317 条命令](shell-core/COMMANDS.md) — 按 Bash、sh、Zsh、PowerShell、CMD 列出原文。
- [PowerShell 双版本扩展：210 条](powershell-compat/COMMANDS.md) — 105 组相同输入分别覆盖 5.1 / 7.6；[范围与依据](powershell-compat/README.md)。加上核心集，PowerShell 共 276 条（5.1：165；7.6：111）。
- [快速集：8 条引用](smoke/COMMANDS.md) — 通过稳定 ID 引用核心集，不再复制命令。

`COMMANDS.md` 是可读目录，由 `npm run catalog` 生成；**机器读取的唯一维护源是 `testset.json` 和 JSONL 文件**。一行 JSONL 是一条完整用例，`command` 紧跟 `id`，不夹带历史实际结果。多行 Shell 命令用 JSON 的 `\n` 原样编码，目录中显示为代码块。

## 新增一条测试

在核心集对应的方言文件中加一行，例如 `shell-core/bash.jsonl`：

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

## 三档审批预期

所有内置用例在 `expect.policyByLevel` 同时声明 `ask_for_approval`、`auto_approve`、`full_access`。每档包含 `mode: evaluation`、对应 `accessLevel`、明确的 `decision` 和一致的 `requiresHITL`，`policyBasis` 说明依据及环境前提。不能只保存当前档，也不能根据实际报告的档位选择预期。只有实际请求 evaluation 时才比较对应档，纯语法/分类保持未评估；原 expect.policy 仅用于兼容固定模式预期。

预期由命令语义、默认策略动作和硬限制制定，不从 results/ 自动录制。不满足文中上下文条件或遇到识别缺口时，保留真实差异，核对预期与实现来源；不得以全部放行或回填当前结果消除红点。核心版本 3 与分类集共 323 条；双版本扩展另增 210 条，目前共 533 条独立用例 / 1599 个档位，快速集继承其中 8 条。历史快照不修改，重新运行读取新预期。

## 版本 3 的语义断言

`expect.containsArgv` 是执行点中必须出现的完整、字面 argv 数组（例如 `[["coproc","cat"]]`）。它不包括重定向；参数缺失、额外参数或动态值均不满足断言，不从命令名出现推断参数正确。它与语法状态、grade 和审批预期分别比较，已知语法差异不能抵消 argv 缺失。

Bash 3.2 的 `coproc cat` 是普通命令调用，`exec {fd}>out` 的 `{fd}` 是字面参数；带花括号体的 `coproc worker { tool; }` 则语法无效。三档审批仍按 Platform 已登记的命令名硬限制保留 block，不随当前漏检结果改写。PowerShell 空条件正例改为 `${x}?.Name`；旧输入的 knownDifference 不移植到新输入。当前解析器若不满足修正后的预期，应保留真实差异。

`--profile` 是诊断语法配置，不会自动安装或选择对应版本的 Shell；原生语法/语义验收须独立记录实际程序和版本。纯语法、Host 预审、原生 Shell 验证不能互相替代。历史 results 和 evidence 不修改。
