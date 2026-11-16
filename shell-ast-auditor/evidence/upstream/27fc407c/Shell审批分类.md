# shell-ast 分类与权限预审

`go run ./cmd/shell-ast` 与 Platform 使用同一仓库。CLI 的 `policy` 输出直接调用 `internal/tools.RuntimeToolExecutor` 的生产审查路径，复用实际 Shell 启动合同、程序身份、命令分析、路径策略、语法限制、BashPlan 合并及 PendingBashPlan，没有 CLI 专属权限规则或“等级大小”表。

## 两种模式

不传 `--access-level`：只分类，不假定用户当前处于 ask_for_approval，不输出 decision、HITL、配置 action 或放行结论。

```bash
CGO_ENABLED=0 go run ./cmd/shell-ast --shell bash --profile bash-3.2 -- 'rm -rf build'
```

输出可能包含 `bash-write-in-write-roots`、`destructive`；无法精确分析时可能出现 `bash-complex-filesystem`、`bash-opaque-command`。分类由生产 policy mapper 在原有审查中发出，允许的 action 也不会使已发现的分类消失。内部使用生产审查器的参考遍历上下文收集分类，不将这个参考值冒充用户当前 access level。

传 `--access-level`：继续使用同一份 tools.yml 策略得出当前预审决定。

```bash
CGO_ENABLED=0 go run ./cmd/shell-ast --shell bash --profile bash-3.2 \
  --access-level auto_approve -- 'rm -rf build'
```

默认配置下，destructive 为 hitl，因此这条命令在 ask_for_approval 和 auto_approve 下都要求 HITL。auto_approve 不是所有规则统一升级放行。

| policy.decision.value | disposition | 含义 |
| --- | --- | --- |
| allow | allow | 当前预审无额外审批要求 |
| auto_approved | auto_approve | 当前策略走 Platform 的自动审批路径 |
| requires_approval | hitl | 当前仍需人工审批 |
| block | block | 硬限制或显式 block；不能靠现有审批放宽 |

`policy.classifications` 是审查发现的行为类别；`policy.decision.requirements` 是经过生产合并和已有批准抵扣后的最终待满足条件。资源身份抵消等规则可能消除某项行为对应的审批要求，因此不能逐项把 classifications 当作待审批列表。

## 上下文与配置

```bash
CGO_ENABLED=0 go run ./cmd/shell-ast --shell bash --profile bash-3.2 \
  --workspace /project --cwd /project \
  --tools-config /deployment/configs/tools.yml \
  --editing=false --access-level full_access \
  --format json --view both -- 'echo x > output.txt'
```

`--workspace`、`--cwd` 默认都是 CLI 的当前目录；`--chat-dir` 可显式补充当前 Chat 文件目录。目录须真实存在，不自动创建测试目录。`--editing=false` 与 Platform 的 WorkspaceReadOnly 能力相同：即使 full_access，Workspace mutation 也会 block。

`--tools-config` 显式读取 Platform 的 tools.yml，复用同一配置解码与 access-policy 默认值/继承规范化。省略时使用发布默认配置，不偷偷读取当前目录的真实 tools.yml。显式指定的文件缺失或配置非法会报错，不回退默认值。

CLI 构造的是 standalone Host 测试上下文，没有真实 Run、连接器挂载、已选 Skill 执行证明或已有人工批准。`policy.context` 明确记录这一点。**逻辑一致的含义是相同配置、上下文、环境、文件和授权收据得到相同决定**，不是说不同上下文也应有相同结果。审查可能只读核验目录、程序字节、Git 配置及账户等依赖；不执行输入正文，不执行其中的删除/联网/子脚本，不申请或消费批准，也不发起 HITL 窗口。

Host 实际支持的 Shell 与程序由 Platform 同一套解析和启动核验决定。输入是 PowerShell/CMD 文本不会让 macOS 自动拥有 Windows 的程序证据；缺少可用 Shell 时保留生产的阻止原因。Windows 未验证的审查开关没有被 CLI 自动开启。

## 语法树与生产审查的关系

`nativeTree` / `structure` / `grade` 仍是新解析器的诊断执行面。`policy.syntaxSource` 明确标记为 Platform 当前生产审查器。当前生产解析器尚未切换到新 AST，CLI 的权限结论也不会凭 `grade=exact` 放行。

这次统一的是分类、策略求值与预审结果的调用路径，不宣称已经完成新 AST 的生产切换。生产运行前仍会按实时 access level、文件版本和启动指纹复核并处理批准收据；CLI 的 dry-run 结果不是可复用执行许可。

`status.classification` 在默认 CLI 模式下为 `platform-review`。保留原来的纯语法输出可使用：

```bash
CGO_ENABLED=0 go run ./cmd/shell-ast --shell bash --profile bash-3.2 \
  --syntax-only --format json -- 'git status | head -20'
```

`--syntax-only` 不调用策略预审，不可与 `--access-level` 同时使用。由于 CLI 现在链接生产 reviewer，进程初始化会冻结 Host 系统程序和临时根快照；它不再承诺整个 CLI 的初始化链零 Host 读取。纯 `syntax/surface` 库继续保持独立、无权限决定；App/Server/LLM/数据库服务不进入 CLI 初始化。

所有模式都不执行输入；退出码仍表示参数/编码/语法/预算等诊断状态，HITL 或 block 通过 policy 字段表达，不伪装为工具崩溃。

## 验证

新增一致性测试在同一上下文下分别调用 `ReviewBashAccess` 和 `ExplainBashAccess`，比较原始决定、PendingBashPlan、HITL/block、ruleKey 与全部 requirements；覆盖三种 access level、可分析命令、opaque、破坏性操作、内联代码、语法硬阻断、只读 Workspace、自定义配置、classification-only，以及不执行输入/不消费批准。

```bash
CGO_ENABLED=0 go test ./cmd/shell-ast ./internal/config ./internal/tools ./internal/shellreview/... ./internal/accesspolicy ./internal/hostshell
```
