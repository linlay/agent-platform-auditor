# Shell AST Auditor

Go 1.26 API + React/TypeScript strict 的 Shell 解析诊断与回归应用。输入只传给预构建 `shell-ast` CLI 解析，绝不执行命令，不参与生产审批。

## 从哪里看命令和结果

| 内容 | 入口 | 维护规则 |
| --- | --- | --- |
| 测试集与命令原文 | [testsets/README.md](testsets/README.md)、[核心命令目录](testsets/shell-core/COMMANDS.md) | JSONL 一行一条命令，含 id、profile、输入和预期，不含实际结果 |
| 每次实际运行 | [results/README.md](results/README.md)、`results/runs/<runId>/` | 冻结当次测试集快照，报告按 caseId 保存 |
| 对比结果集 | `results/comparisons/` | 实际对预期、两次运行对比分别保存，按 caseId 对应 |
| 来源与旧证据 | [evidence/README.md](evidence/README.md) | 只读出处，不作为当前测试集或当前运行加载 |
| 截图与浏览器检查 | `artifacts/` | 生成产物，不混入测试集 |

旧 `data/` 已迁移。目录中没有多份同时生效的 cases/corpus/results。

测试集按 **Windows** 与 **macOS / Linux** 分组。Windows 核心集 166 条（PowerShell 124、CMD/Batch 42），[PowerShell 双版本扩展](testsets/powershell-compat/README.md) 210 条、[Windows HTTP 取数审批回归](testsets/policy-http-windows/COMMANDS.md) 20 条，Windows 快速集引用核心集中的 3 条；macOS/Linux 核心集 233 条（Bash、sh、Zsh），分类预审集 6 条、[macOS HTTP 取数审批回归](testsets/policy-http-regression/COMMANDS.md) 13 条、[Bash 审批回归](testsets/policy-shell-regression/COMMANDS.md) 9 条、[SQLite CLI 审批回归](testsets/policy-sqlite-regression/COMMANDS.md) 13 条，快速集引用核心集中的 5 条。独立用例共 670 条；PowerShell 合计 354 条（5.1：204；7.6：150）。Windows 原生验证待完成。平台与方言、profile 分开；macOS/Linux 公共用例用 platforms 明确复用。原始最初 22 项用户输入仍未取得，不伪造原文。

页面提供 10 个测试集，提供“单用例测试 / 整集测试”两种运行方式。支持搜索与平台/profile/标签/预期/状态/grade/已知差异筛选，单条、选中、筛选集合及全量运行，取消后创建新运行重跑。运行和比较会保存，刷新后可重新打开。执行面、执行点及词、重定向、关系、opaque、诊断、原生 CST/树、完整 JSON 与 UTF-8 源码高亮保留。自定义面板为临时解析，需加入测试集文件才成为可重复测试。

## 启动

需要 Go 1.26、Node.js 20+、相邻 `agent-platform` 解析器源码（初始来源 commit `6125321e`）。在本目录执行：

```bash
npm ci
npm run parser:build
npm run build
npm run server
```

访问 http://127.0.0.1:8093 。开发另开终端运行 `npm run dev`，使用 Vite 输出的本地地址；API 代理到 8093。`SHELL_AST_SOURCE` 可指定只读源码目录；`SHELL_AST_BIN` 可直接指定预构建 CLI 绝对路径；`AUDITOR_ADDR` 默认 `127.0.0.1:8093`。本项目不修改相邻仓库，不直接导入其 internal 包。复制本项目后可独立安装/构建，再配置 CLI。

需代理时，每个联网命令显式设置 `http_proxy`、`HTTP_PROXY`、`https_proxy`、`HTTPS_PROXY=http://127.0.0.1:8001`，不修改全局代理。

## 扩展与架构

- **增加一条测试**：编辑 `testsets/<id>/*.jsonl`，执行 `npm run catalog`；[详细示例](testsets/README.md)。
- **增加一个测试集**：新增目录及 `testset.json`，可新增 JSONL 或引用已有 caseId，无须改 API/菜单。
- **增加一次结果对比**：运行两次，在页面选择基准和目标，生成独立对比报告；输入变化、增删、错误和未运行单列。

架构与数据关系见 [AGENTS.md](AGENTS.md)。预期比较由 Go 领域层统一处理，前端和集成脚本不再分别维护判断算法。

## 运行语义与预算

每次运行保存测试集内容摘要、解析器二进制 SHA-256、主机、时间和逐条结果。完成后不覆盖历史；测试集修改也不会改变旧快照。进程重启时中断运行标为 interrupted，未完成条目不记通过。cancelled/not-run、解析状态与预期对比结论互相独立。已知差异需匹配登记的 syntax/grade/recovered 和诊断代码集合；完整报告保留重复恢复节点。

单个服务同一时间接收一个批次，最多 2 个解析/预审子进程；单条临时解析共享这两个槽位。每条输入 64 KiB、子进程 8 秒超时、stdout 32 MiB、stderr 16 KiB；批次 API 请求 128 KiB，临时解析 body 512 KiB；单测试集最多 5000 条。所有参数结构化传入 `exec.CommandContext`，输入经 stdin，不拼接 Shell。CLI 退出 10/11/12 保留诊断 JSON，启动或内部错误返回解析错误。输出预算不是 RSS 硬限制。结果采用原子文件写入，不依赖数据库；当前仅支持单服务实例使用同一结果目录，无自动清理/删除功能。

报告 consumer=diagnostic；纯语法 classification=not-run，分类/权限预审 classification=platform-review。exact 只限声明 profile 与已验证构造，不等于 allow。Bash 仅有窄范围差分证据；PowerShell/CMD/Zsh/sh 保持保守 opaque/profile unchecked；Windows 原生验收 pending，未替换 macOS/Windows 生产审查。当前 schema 为 shell-surface/v1-draft。嵌套报告源映射保留在 JSON，页面高亮针对顶层源码。API 为本地开发用途，无认证，不应暴露公网。

## 检查

```bash
npm test && npm run build
# 先启动 API；以下为独立真实 CLI/API 集成检查
npm run test:integration
# 双版本扩展的 210 条诊断解析；差异保留为失败，不代表 Windows 原生验收
npm run test:integration:powershell
# 需已安装 Google Chrome，顺序运行以避免与全量集成检查争抢批次
npm run test:browser
# 目录映射的真实 CLI/API、233 条 macOS/Linux 用例与 header 按钮检查
npm run test:project-mapping
# 独立解析/审批预期判断：233 条 macOS/Linux 语法、6 条分类/审批与预期偏差验证
npm run test:checks
# macOS/Linux 核心集与分类集的三档预审矩阵，保留每条差异
npm run test:approval-matrix
```

默认测试离线，检查目录引用、重复 ID、预期对比、新错误不可被已知差异掩盖、运行快照/报告持久化、取消/重启和运行间差异；TypeScript strict 与构建也必须通过。真实集成检查创建完整核心运行、两次快速运行及其对比和取消运行。生成结果保留在 results/，默认不纳入 Git；需要版本化的证据应挑选并记录在 evidence/，不要把生成历史当测试定义。

## 重复启动与更新解析器

重复执行 `npm run server` 时，若 8093 已是同一项目的新版本服务，会打印现有 URL 和 PID 并以 0 退出，不启动第二个实例、不恢复活动任务。若是其他程序或旧版健康接口，明确提示端口冲突，不自动杀进程。

```bash
npm run server:status
npm run server:stop
npm run parser:build
npm run build
npm run server
```

`server:stop` 只对健康接口确认 app、项目路径和 PID 都属于本项目的服务发送 SIGTERM，不强杀未知进程。停服务会中断活动测试，重启后标为 interrupted。更换端口可设置 `AUDITOR_ADDR=127.0.0.1:8094`；Vite 同时设置 `AUDITOR_API_URL=http://127.0.0.1:8094`。

CLI 构建保存 `bin/parser-build.json`，记录源码 commit、dirty 状态、工作区源码指纹和二进制 SHA-256；未提交改动不会写成已发布版本。旧二进制与服务所使用的版本按摘要保存在 bin/parsers/。运行中的服务固定使用启动时的字节快照；重建 CLI 后需要停止旧服务再启动，才能切换到新解析器。

## 分类与 access level

### 用例目录映射

无需逐条修改测试集中的 `/project`。header 的“设置用例内目录”按钮可统一指定本机真实目录，初始值为后端项目目录；已设置时按钮高亮，悬停显示完整目录；留空关闭映射时恢复普通状态。修改后保存在当前浏览器，单条、选中、整集和自定义解析共同使用。仅替换完整 `/project` 模板及其子路径，不替换 `/projects`、`/project-old`、`/other/project` 或 URL。其他示例根目录（如 `/downloads`）保持字面值。

映射启用时，分类/预审的 Workspace 和 cwd 留空或填写 `/project` 都使用映射目录；显式的 `/project/sub` 映射为对应子目录，其他显式目录保持原值。目录须真实存在，不创建根目录、不建立符号链接。为保留所有用例的引号及参数结构，当前映射目标不支持根目录、空白或 Shell 特殊字符；普通中文目录名可用。无效目录在调用 CLI 前给出明确提示。

测试集文件保留原文，运行快照保存 `projectDir`、实际 `command` 及替换前的 `templateCommand`，逐条结果保存本次 `input`；原始 CLI JSON 仍原样保存。源码和 UTF-8 高亮使用实际命令，下方可展开查看用例原文。修改映射后须重新运行，旧结果保留旧配置；映射不同的运行属于 `input-changed`，不作为解析器回归证据。纯语法也可展开模板，但不因此增加 policy 上下文。所有模式仍不执行命令，映射不承诺目标文件存在或自动免审批。

API：`POST /api/parse` 和 `POST /api/runs` 可传顶层 `projectDir`。API 省略该字段时不映射，保持旧客户端语义；页面初始默认值由 `/api/health.projectRoot` 提供。

agent-platform `27fc407c` 新增了默认分类与显式权限预审，审计界面支持三种模式：

| 页面模式 | CLI 语义 | 结果 |
| --- | --- | --- |
| 纯语法 | --syntax-only（旧 CLI 能力检测后使用旧默认） | classification=not-run，无 policy |
| 只分类 | 不传 --syntax-only，也不传 --access-level | classification=platform-review；只有分类，无 accessLevel/decision/HITL 决定 |
| 权限预审 | 显式传 --access-level ask_for_approval / auto_approve / full_access | 分类及同源生产 reviewer 的 decision、disposition、HITL 和原因 |

批量运行区可覆盖本次模式，自定义面板可单独选择；不修改原测试集预期。可显式填写 Workspace/cwd 和 editing；空目录字段沿用 CLI 后端当前目录。不读取真实部署的 tools.yml，不提供生产批准消费或执行入口。

单用例测试默认使用“评估审批要求”和“按需审批”。整集测试沿用用例设置时，两平台核心集、快速集和 PowerShell 双版本扩展默认均为纯语法运行。Windows 核心集和兼容性用例声明解析预期，独立的 HTTP 审批回归集默认评估按需审批。macOS/Linux 的 `policy-smoke` 包含 6 条用例，覆盖只分类、三种权限档位、auto_approve 下破坏性操作仍需 HITL、full_access 下只读 Workspace 仍 block。权限预期依赖 Host 和发布默认配置。

界面单列 Platform 分类/权限预审，grade、预期是否匹配和 policy 决定分别显示。policy 来自当前生产 reviewer，**不是新 AST 的 grade 推导的许可**；standalone 预审没有真实 Run/挂载/Skill 证明和批准收据，不是可复用执行许可。新版 CLI 即使 --syntax-only，初始化仍可能只读冻结 Host 程序/临时根快照，不再声称进程初始化零 Host 读取；所有模式均不执行输入正文。

## 紧凑界面与中文说明

界面参考 Transit Hub 的 `docs/ui-compact-draft/SPEC.md`（v0.4），在本项目独立维护样式：桌面顶栏 52px、输入/选择框 32px、按钮 28px；手机/触屏操作目标至少 44px。常用筛选在主行，其他条件、目录上下文、版本与原始报告按需展开。正文保持 13px，未通过缩小字体或隐藏错误提高密度。浅/深色使用独立语义颜色与静态波浪背景。

结果概览直接显示“审批策略项”，无须切换到审批标签页：例如 `bash-opaque-command`、`bash-write-in-write-roots`、`read-outside-roots`，同时保留中文说明。仅显示本次 CLI 报告实际命中的分类；已分类但无额外策略项与纯语法未分类分别提示。旧纯语法历史需选择分类或审批模式重新运行，不补写历史分类。权限档位和预审结论优先中文显示；标签悬停或键盘聚焦可查看原始英文标识。已知英文原因用固定规则生成中文摘要，路径和程序名保留；未知原因明确提示查看原文，不猜测结论。完整 CLI JSON、分类上下文、解析状态及恢复错误仍可查看，导出与测试断言继续使用原始字段。

`node scripts/compact-ui.mjs` 验证 1366/1280/1024/760/390/320px、深色和触屏布局，以及中文预审与英文提示。真实截图和测量在 `artifacts/compact-*.png`、`artifacts/compact-validation.json`。不会修改 Transit Hub 项目。

## 单条结果与红点筛选

切换用例或点击“解析当前”时，右侧默认打开“分类与审批”。相邻的“解析判断”标签逐项显示语法、解析程度和程序调用的预期与实际结果。点击“解析当前”会保留命令测试页、左侧完整列表与当前选中命令。未运行、正在解析、取消或失败也在本条详情内呈现。只有主动进入“历史记录”或比较两次记录，才切换页面入口。

用例列表展示解析判断，完成权限预审后显示实际决定，包括“需要人工审批”“无需人工审批 · 允许”“已自动批准”或“禁止执行”。“分类与审批”详情先展示实际决定和运行时的权限档位，再展示用例声明的审批预期及比较结果。列表用红点提示审批预期差异。

macOS/Linux 的 274 条独立用例和 Windows HTTP 审批回归的 20 条用例在 `expect.policyByLevel` 声明 ask_for_approval、auto_approve、full_access 三档预期，共 882 个决定，并用 `policyBasis` 记录规则来源与条件。比较按冻结请求的档位选预期，审批详情标出本次运行档位。导出报告和优化反馈使用同一选择逻辑。

这些审批预期依据发布默认策略和对应的 Host 条件编写。前提通常为普通可访问的工作区、cwd 与工作区相同、允许编辑、无已有批准；Git 配置可核验且无外部 helper/活动 hook。sh/Zsh 未验证启动合同按保守规则。程序、目录或配置条件变化以及当前 reviewer 的识别缺口可产生红色差异。

用例有三档预期时，纯语法或只分类显示“未评估审批”。选“评估审批要求”和某档后运行，才比较该档。Windows 的 376 条核心和兼容性用例仅断言解析，详情注明“未设置审批预期”。快速集继承引用用例的预期。旧运行保留当时的用例快照，创建新运行会读取当前版本。

判断筛选中的“有红点”“解析不符预期”“审批不符预期”均使用独立预期比较结果，需审批或禁止执行本身不再当作测试异常。运行记录保存 `checks.parsing` 与 `checks.approval`，旧 `check` 保留综合结论供批次统计和兼容使用；打开旧记录详情时按其冻结用例和原始报告只读补算两项判断，不改写历史。旧摘要无法安全拆分的失败显示“待重新判断”，不猜测归因。

## 累计结果与整集批次

提供 10 个测试集。单用例测试支持选一条、多选、全选，不以测试批次展示。每条保存自己的结果和来源记录，后续解析只更新选中的用例。当前浏览器按测试集保存轻量索引，切换集合或刷新也可恢复；完整报告从每条对应的运行文件读取。“清空结果”只重置当前测试集的累计结果，不删除已保存运行文件。自定义临时命令仅在当前页保留。

整集测试一次运行当前测试集的全部用例，筛选只影响显示，不改变执行范围。每次生成批次号，提供报告和逐条明细，不提供单条解析按钮。单用例记录不混入批次选择器。桌面批次卡片为一行。

顶部提供独立的“自由测试”：直接输入多行命令，选择 Shell/profile、分类或审批模式后点击“解析命令”，也支持 Ctrl/⌘ + Enter。复用目录设置、详情和三种报告导出；输入及上次结果在本页切换测试方式时保留，与测试集的累计结果及整集批次独立。“清空结果”只清除自由测试结果，保留输入。自由输入没有固定测试预期，不会根据实际审批结论推断为测试通过；它调用诊断解析器，不执行命令正文。`npm run test:free` 独立验证此流程。

### 导出报告

工具栏统一使用“导出报告”菜单，提供三种输出：

| 输出 | 用途 | 内容 |
| --- | --- | --- |
| 测试报告（默认，HTML） | 给人阅读，可离线打开 | 汇总、当时的替换目录/工作区/工作目录、逐条解析/审批判断、实际审批结论、原因和来源；可只看红点，不包含原始解析树 |
| 优化反馈包（ZIP） | 给 agent-platform 分析和改进 | `README.md`、`feedback.json`、`cases.jsonl`、`manifest.json`、相关原始证据 |
| 完整数据（JSON） | 深度排障和归档 | 全部冻结用例、原始解析结果、原运行版本；对比模式还包含基准及目标数据 |

单用例模式导出当前测试集的累计结果，整集模式导出所选批次的全部用例，对比模式导出当前对比及其基准/目标。列表搜索、筛选和勾选不改变导出范围。累计结果按每条原运行记录恢复冻结命令、预期、版本及测试集 hash；历史记录丢失会中止导出，不会套用当前解析器版本。临时命令使用解析响应记录的版本；未记录的信息明确为 null。

优化反馈使用 `shell-ast-optimization-feedback/v1`，分别标识测试合同偏差、已知差异、解析错误、能力改进候选、待核验审批行为和同输入运行变化。符合明确审批预期的需审批/禁止执行行为不自动列为缺陷；没有明确审批预期时，也不根据实际 allow/auto/block 推断通过。能力候选可能已满足保守测试合同。观测特征分组不代表已确认同根因。

`cases.jsonl` 保留全部正例、反例和基准的原始输入、参数数组、精确 stdin、是否传 access level、目录/权限上下文、预期依据及回归条件。复现时只将 stdin 交给对应版本的解析器，不执行命令正文。未捕获的默认 cwd、Host 配置及挂载等条件在包内列明，需由接收方核对。偏差和错误逐条附带已有证据，能力/审批/对比候选可只附代表样本以控制体积；包内引用均指向随包文件。原始报告不可用时明确标识，不将空证据视为验证通过。

搜索和筛选在列表顶部同行；已选数量和显示/全部数量在全选行，后者靠右。操作按钮合并到测试集和模式工具栏；版本信息在顶栏右侧。两种运行方式的结果独立。
