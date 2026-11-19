# Bash 审批回归

复现 Bash 内建命令的审批差异，用脱敏日志命令校验权限预审。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 1 条

### policy.bash-negated-existence-check

macos / linux · bash · bash-3.2 · 预期 valid

```text
test ! -e /tmp/auditor-release-fixture/skills-center/shopping-price-analysis && echo "TARGET_ABSENT_OK"
```

精确命令参数预期：`[["test","!","-e","/tmp/auditor-release-fixture/skills-center/shopping-price-analysis"],["echo","TARGET_ABSENT_OK"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：字面路径位于授权的系统临时目录。内建 test 的 ! -e 只取反存在性判断，echo 只向标准输出打印，因此默认策略三档均应放行。
