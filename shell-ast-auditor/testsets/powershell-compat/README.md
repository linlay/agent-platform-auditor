# PowerShell 双版本扩展

105 组输入，每组分别声明 `windows-powershell-5.1` 与 `pwsh-7.6`，共 210 条独立 profile 用例。机器维护源为 `cases.jsonl`；[COMMANDS.md](COMMANDS.md) 由 `npm run catalog` 生成。此集在页面 Windows 分组中展示；Windows 核心集另有 166 条，macOS/Linux 核心集为 233 条。

| 覆盖方向 | 输入组 | profile 用例数 |
| --- | ---: | ---: |
| 引用、转义、注释、here-string、Unicode、CRLF | 14 | 28 |
| Windows 路径、原生参数、停止解析、参数绑定输入 | 12 | 24 |
| 多行管道、分组命令、流重定向、合并顺序 | 10 | 20 |
| 条件、循环、标签、switch、异常处理 | 10 | 20 |
| 高级函数、管道参数、验证属性、类、枚举 | 9 | 18 |
| 动态命令、scriptblock、splat、嵌套 Shell、作业、远程块 | 12 | 24 |
| 对象、数组、格式化、正则、类型、逻辑与位操作 | 12 | 24 |
| 版本语法差异：5.1 拒绝、7.6 接受相同输入 | 11 | 22 |
| 两版本都应拒绝的残缺语法 | 15 | 30 |
| 合计 | 105 | 210 |

169 条预期语法有效，41 条预期语法无效，其中 11 条是 5.1 的版本限制。版本 3 用 Windows PowerShell 5.1.26100.9818 和 PowerShell 7.6.9 的 `Parser::ParseInput` 复核了全部 210 条的语法有效性。`enum-flags` 的原始输入在 5.1 报语法错误、在 7.6 通过，据此修正 5.1 预期。部分管道用例还断言调用名。模块兼容、输出编码及原生 argv 等运行时语义需要单独验证。

每条用例保留 Microsoft Learn 链接和编写说明。主要依据：

- [5.1 引号规则](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-5.1)
- [7.6 解析与原生参数传递](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.6)
- [7.6 管道及行首管道符](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipelines?view=powershell-7.6)
- [5.1 语言关键字](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_keywords?view=powershell-5.1)
- [5.1 高级函数](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced?view=powershell-5.1)
- [5.1 与 7.x 的差异](https://learn.microsoft.com/en-us/powershell/scripting/whats-new/differences-from-windows-powershell?view=powershell-7.6)

用例只声明解析预期，默认使用 syntax-only。显式预审会记录当前 Host 的实际分类与决定，审批判断显示“未设预期”。

在本项目目录启动服务后，执行独立集成命令：

```bash
npm run test:integration:powershell
```

脚本通过本地 API 生成真实批次，原始报告写入 `results/runs/<runId>/`；输出解析差异，存在差异时非零退出，不自动登记 knownDifference，也不回填预期。它只调用 shell-ast 诊断解析器，不执行输入中的任何命令；不是 Windows 原生验收。`npm test` 仅校验加载合同、成对覆盖和应用逻辑。

版本 1 的本地诊断共返回 210 条报告，其中 185 条符合预期、25 条语法状态不符。见[诊断摘要](../../evidence/powershell-compat-validation.json)，原始报告保存在摘要指定的本机运行目录。上述差异待官方解析器复核。
