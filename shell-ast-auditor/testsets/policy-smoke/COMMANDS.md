# macOS / Linux 分类与权限预审测试集

9 条 Host 相关分类/审批用例；每条声明三档预期，根据本次选择的档位比较，沿用原默认运行模式。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 9 条

### policy.classify-node

macos / linux · bash · bash-3.2 · 预期 valid

```text
node --version
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。

### policy.ask-node

macos / linux · bash · bash-3.2 · 预期 valid

```text
node --version
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。

### policy.auto-node

macos / linux · bash · bash-3.2 · 预期 valid

```text
node --version
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。

### policy.full-node

macos / linux · bash · bash-3.2 · 预期 valid

```text
node --version
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。

### policy.auto-destructive

macos / linux · bash · bash-3.2 · 预期 valid

```text
rm -rf auditor-policy-sentinel
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。

### policy.readonly-workspace

macos / linux · bash · bash-3.2 · 预期 valid

```text
echo x > auditor-policy-sentinel
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；沿用用例 editing 能力与正常工作区上下文。editing=false 的工作区写入为硬阻断，权限档位不覆盖只读能力。

### policy.recursive-delete-quoted-outside

macos / linux · bash · bash-3.2 · 预期 valid

```text
rm -rf "/auditor-policy-fixture/ skills-center"
```

精确命令参数预期：`[["rm","-rf","/auditor-policy-fixture/ skills-center"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认 Host 策略下，带前导空格的目录名仍是一个字面参数。目标在允许写入的目录之外，按需审批和自动审批档均命中递归删除及越界写入。

### policy.force-delete-nonrecursive

macos / linux · bash · bash-3.2 · 预期 valid

```text
rm -f " auditor-policy-sentinel"
```

精确命令参数预期：`[["rm","-f"," auditor-policy-sentinel"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：可编辑 Workspace 内的字面相对路径可直接写入。只有 -f 的 rm 不递归，因此默认三档均放行。

### policy.workspace-git-config-write

macos / linux · bash · bash-3.2 · 预期 valid

```text
touch auditor-policy-sentinel/.git/config
```

精确命令参数预期：`[["touch","auditor-policy-sentinel/.git/config"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：可编辑 Workspace 内的 Git 配置写入命中 executable-config。默认按需审批和自动审批档均需人工确认，全权限档放行。
