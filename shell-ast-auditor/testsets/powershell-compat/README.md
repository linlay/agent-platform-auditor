# Windows PowerShell 双版本扩展

105 组输入，每组分别声明 `windows-powershell-5.1` 与 `pwsh-7.6`，共 210 条独立 profile 用例。机器维护源为 `cases.jsonl`；[COMMANDS.md](COMMANDS.md) 由 `npm run catalog` 生成。此集在页面自动发现，核心集保留 317 条。

| 覆盖方向 | 输入组 | profile 用例数 |
| --- | ---: | ---: |
| 引用、转义、注释、here-string、Unicode、CRLF | 14 | 28 |
| Windows 路径、原生参数、停止解析、参数绑定输入 | 12 | 24 |
| 多行管道、分组命令、流重定向、合并顺序 | 10 | 20 |
| 条件、循环、标签、switch、异常处理 | 10 | 20 |
| 高级函数、管道参数、验证属性、类、枚举 | 10 | 20 |
| 动态命令、scriptblock、splat、嵌套 Shell、作业、远程块 | 12 | 24 |
| 对象、数组、格式化、正则、类型、逻辑与位操作 | 12 | 24 |
| 版本语法差异：5.1 拒绝、7.6 接受相同输入 | 10 | 20 |
| 两版本都应拒绝的残缺语法 | 15 | 30 |
| 合计 | 105 | 210 |

170 条预期语法有效，40 条预期语法无效（含 10 条 5.1 版本限制）。这些是按官方文档编写的预期，尚无 Windows 官方 AST 或运行时验证。部分管道用例还断言调用名；没有声明原生 argv 或输出值，不以 `gradeCeiling=opaque` 证明参数传递正确。模块、路径、程序和服务无需存在即可进行纯语法诊断。模块兼容、输出编码及真实 argv 等运行时语义仍需单独补充原生验证。

每条用例保留 Microsoft Learn 链接和编写说明。主要依据：

- [5.1 引号规则](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-5.1)
- [7.6 解析与原生参数传递](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.6)
- [7.6 管道及行首管道符](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipelines?view=powershell-7.6)
- [5.1 语言关键字](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_keywords?view=powershell-5.1)
- [5.1 高级函数](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_advanced?view=powershell-5.1)
- [5.1 与 7.x 的差异](https://learn.microsoft.com/en-us/powershell/scripting/whats-new/differences-from-windows-powershell?view=powershell-7.6)

三档审批沿用现有 Windows 用例的 **macOS Host 缺少 Windows 启动器** 前提，预期为硬阻断。这只在显式 evaluation 时比较，与命令安全程度无关，不能移植为 Windows 原生审批结论。默认仍为 syntax-only。

在本项目目录启动服务后，执行独立集成命令：

```bash
npm run test:integration:powershell
```

脚本通过本地 API 生成真实批次，原始报告写入 `results/runs/<runId>/`；输出解析差异，存在差异时非零退出，不自动登记 knownDifference，也不回填预期。它只调用 shell-ast 诊断解析器，不执行输入中的任何命令；不是 Windows 原生验收。`npm test` 仅校验加载合同、成对覆盖和应用逻辑。

本次本地诊断观测：210 条均返回报告，185 条符合预期、25 条语法状态不符；集成命令按差异非零退出。见[诊断摘要](../../evidence/powershell-compat-validation.json)，原始报告保存在摘要指定的本机运行目录。上述差异待官方解析器复核，尚不直接判定为平台缺陷。
