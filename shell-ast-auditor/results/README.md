# 运行结果与对比结果

这里不维护命令。命令的唯一维护入口是 `../testsets/`。

```text
results/
├── runs/<runId>/
│   ├── run.json           # 当次输入/预期快照、主机、解析器摘要、进度、逐条结果索引
│   └── reports/<caseId>.json  # 当次真实 CLI 原始 JSON，按需读取
└── comparisons/
    ├── expectations-<runId>.json  # 当次实际 vs 当次预期，一条 caseId 对应一行
    └── compare-<id>.json          # 两次运行的结果对比
```

每次运行生成新 ID，不覆盖以前的运行。运行中仅该次 `run.json` 更新；完成后不再编辑。

## 一一对应

- 测试集的一条 `id` → `run.json.cases[].id`（冻结输入和预期）
- 同一 `id` → `run.json.results[id]`（状态、耗时、退出码、对比判断）
- 同一 `id` → `reports/<id>.json`（完整解析 JSON）
- 同一 `id` → 对比文件的 `rows[].caseId`

`run.json` 的状态是任务是否完成；`results[id].status` 是解析器状态；`results[id].check` 是实际是否符合预期。三者不能混同。任务 completed 也可能有 mismatch/error，known-difference 也不等于 pass。

## 预期对比

结论为 `match`、`known-difference`、`mismatch`、`error`、`not-run`。检查 syntax、必要调用名、gradeCeiling。已知差异需匹配登记的 syntax、grade、recovered、诊断代码；不能掩盖新的漏调用或诊断。

## 两次运行对比

按稳定 caseId 关联，逐字段比较原始报告；进程耗时独立保留，不纳入内容变化。输入（command、dialect、profile、options、mode）改变标为 `input-changed`；增删为 `added` / `removed`；取消、未运行、解析错误为 `not-comparable`。同输入的报告/预期变化为 `changed`，保留变化的顶层字段；否则 `unchanged`。unchanged 也可能是同一个已知错误重复出现，不表示验收通过。

结果可由页面生成或用独立集成脚本生成。测试与演示产生的运行也是实际记录，不提升为 Windows 原生验收。目录内容当前保留以供复核；长期使用时可归档完整运行目录及引用它的对比文件。本项目暂不提供自动清理或删除历史功能。
