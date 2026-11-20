# Bash 审批回归

用脱敏日志验证 Bash 只读元数据检查、find 时间筛选及递归删除的三档审批预期。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 9 条

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

### policy.bash-ls-extended-attributes

macos · bash · bash-3.2 · 预期 valid

```text
ls -l@ ./AGENTS.md; test -w .
```

精确命令参数预期：`[["ls","-l@","./AGENTS.md"],["test","-w","."]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：经核验的 macOS ls 只列出扩展属性，test -w 只查询权限。两个目标都在可读 Workspace。

### policy.bash-bracket-file-tests-in-loop

macos / linux · bash · bash-3.2 · 预期 valid

```text
for p in ./auditor-kbx-fixture/.kbx ./auditor-source-fixture; do if [ -e "$p" ]; then [ -d "$p" ]; fi; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：静态循环逐条按读取权限核验，内建 [ 的 -e 和 -d 查询存在性与目录类型。

### policy.bash-bracket-outside-workspace

macos / linux · bash · bash-3.2 · 预期 valid

```text
'[' -e /auditor-policy-fixture/outside/AGENTS.md ']'
```

精确命令参数预期：`[["[","-e","/auditor-policy-fixture/outside/AGENTS.md","]"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：表达式只读取路径信息，目标仍超出默认读取根，因此按档位走区外读取策略。

### policy.bash-find-newermt

macos / linux · bash · bash-3.2 · 预期 valid

```text
find ./auditor-cleanup-fixture -maxdepth 1 -type f -newermt "2026-11-19" -print
```

精确命令参数预期：`[["find","./auditor-cleanup-fixture","-maxdepth","1","-type","f","-newermt","2026-11-19","-print"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：日期是单个筛选值，搜索根按可读 Workspace 校验，普通 -print 只输出匹配项。

### policy.bash-find-newermt-exec-ls

macos / linux · bash · bash-3.2 · 预期 valid

```text
find ./auditor-cleanup-fixture -maxdepth 1 -type f -newermt "2026-11-19" -exec ls -la {} \;
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：find 按搜索根检查读取，已核验的外部 ls 对匹配项执行只读列表，日期不授予额外权限。

### policy.bash-find-newermt-outside-workspace

macos / linux · bash · bash-3.2 · 预期 valid

```text
find /auditor-policy-fixture/outside -maxdepth 1 -type f -newermt "2026-11-19" -print
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：日期是数据，搜索根在默认读取范围外，按对应档位评估区外读取。

### policy.bash-find-exec-recursive-remove

macos / linux · bash · bash-3.2 · 预期 valid

```text
find ./auditor-cleanup-fixture -mindepth 1 -maxdepth 1 -print -exec rm -rf {} +
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：find -exec 将运行时匹配项交给 rm -rf，保留包装执行审批，按当前规则在自动审批或完全控制档记录自动批准。

### policy.bash-find-delete-retains-root

macos / linux · bash · bash-3.2 · 预期 valid

```text
find -P ./auditor-cleanup-fixture -mindepth 1 -delete
```

精确命令参数预期：`[["find","-P","./auditor-cleanup-fixture","-mindepth","1","-delete"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：已建模的 find -delete 属于递归删除，按破坏性操作档位策略审批；-mindepth 1 跳过根目录。
