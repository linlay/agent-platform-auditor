# 来源证据（只读历史）

- `upstream/`：来自 agent-platform commit `6125321e` 的 corpus/results/examples/schema/validation 快照。
- `previous/`：重构之前的 cases.json 与 local-validation.json。旧记录只有摘要，不补造完整报告或 run ID。

这些文件是出处与历史证据，不是当前测试集或当前运行结果。新命令只在 `../testsets/` 维护，新运行和对比只写 `../results/`；截图在 `../artifacts/`。

`upstream-workingtree/<fingerprint>/` 保存后续未提交工作区版本的公开报告 schema/说明/脱敏例子和构建元数据，与初始 commit 快照分开。default CLI 已增加 policy；本项目为旧纯语法用例显式传 --syntax-only，并单独维护 policy-smoke。
