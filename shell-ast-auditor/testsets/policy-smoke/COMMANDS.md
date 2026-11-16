# 分类与权限预审测试集

6 条 Host 相关分类/审批用例；每条声明三档预期，根据本次选择的档位比较，沿用原默认运行模式。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 6 条

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
