# 跨平台 Shell 核心测试集

235 条来源用例 + 82 条 macOS Bash 3.2 适配；修正 PowerShell 空条件语法和 Bash 3.2 语义断言；三档审批预期与解析判断独立。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 170 条

### bash.pipeline

macos / linux · bash · bash-5.2 · 预期 valid

```text
git -C /project status | head -20 > result.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.multi-pipe

macos / linux · bash · bash-5.2 · 预期 valid

```text
find /project -type f -print0 | xargs -0 du -k | sort -nr | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.multi-pipe-size

macos / linux · bash · bash-5.2 · 预期 valid

```text
find /project -name '*.go' -print0 | xargs -0 wc -l | sort -n | tail -5
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.and-or

macos / linux · bash · bash-5.2 · 预期 valid

```text
git status && git diff || echo failed
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.sequence

macos / linux · bash · bash-5.2 · 预期 valid

```text
cal; echo ok; free -h; sw_vers; xcrun --show-sdk-path
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。显式读取外部路径或未建模系统程序：默认 ReadOutsideRoots 与 Opaque 按三档分别处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-stash

macos / linux · bash · bash-5.2 · 预期 valid

```text
git -C /project stash push -m "work in progress"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-remote

macos / linux · bash · bash-5.2 · 预期 valid

```text
git remote -v; git branch --show-current; git log -5 --oneline
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-merge

macos / linux · bash · bash-5.2 · 预期 valid

```text
git merge --no-ff fix/steer-caller-identity
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-push

macos / linux · bash · bash-5.2 · 预期 valid

```text
git push origin HEAD:refs/heads/fix/mailbox
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-push-repeat

macos / linux · bash · bash-5.2 · 预期 valid

```text
git push --force-with-lease origin feature/topic
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.unzip

macos / linux · bash · bash-5.2 · 预期 valid

```text
unzip -l '/downloads/project archive.zip'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。显式读取外部路径或未建模系统程序：默认 ReadOutsideRoots 与 Opaque 按三档分别处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.sips

macos / linux · bash · bash-5.2 · 预期 valid

```text
sips -Z 1024 "/project/image a.png" --out /project/out.png
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.trash

macos / linux · bash · bash-5.2 · 预期 valid

```text
trash -- '/project/old file.txt'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.npm

macos / linux · bash · bash-5.2 · 预期 valid

```text
npm --prefix /project run build -- --mode test
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.npx

macos / linux · bash · bash-5.2 · 预期 valid

```text
npx jest --runInBand --testPathPattern 'src/(a|b).test.ts'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.go-test

macos / linux · bash · bash-5.2 · 预期 valid

```text
go test -overlay /tmp/overlay.json ./internal/... -run 'Compact|Summary' -count=1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.go-test-json

macos / linux · bash · bash-5.2 · 预期 valid

```text
go test -json ./... -run 'Test(Compact|Summary)' > /tmp/results.json
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.empty

macos / linux · bash · bash-5.2 · 预期 valid

```text
printf '%s\n' '' ""
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.concat

macos / linux · bash · bash-5.2 · 预期 valid

```text
printf '%s' a' b'"c"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.escaped

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo a\ b \| \* \$HOME
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.env

macos / linux · bash · bash-5.2 · 预期 valid

```text
LANG=C X='hello world' tool --flag
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.variable

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo $X "$Y" "$@"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.exit-status

macos / linux · bash · bash-5.2 · 预期 valid

```text
false; rm -rf "/data/run$?"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.dynamic-command

macos / linux · bash · bash-5.2 · 预期 valid

```text
$TOOL -rf x; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.substitution

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo "$(git status --short)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.substitution-default

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo "${X:-$(fallback arg)}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.process-substitution

macos / linux · bash · bash-5.2 · 预期 valid

```text
diff <(sort a) <(sort b)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-substitution

macos / linux · bash · bash-5.2 · 预期 valid

```text
cat > "$(target)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.assignment-substitution

macos / linux · bash · bash-5.2 · 预期 valid

```text
X=$(probe a); echo "$X"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.heredoc

macos / linux · bash · bash-5.2 · 预期 valid

```text
cat <<EOF
hello $(probe a)
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.heredoc-quoted

macos / linux · bash · bash-5.2 · 预期 valid

```text
python3 - <<'EOF'
print('$(not_a_call)')
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.herestring

macos / linux · bash · bash-5.2 · 预期 valid

```text
cat <<< "$X"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-order-a

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool 2>&1 >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-order-b

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool >out 2>&1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.close-fd

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool 3<&- 4>&-
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.append

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool >>out 2>>err
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.background

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool a & wait; echo done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.subshell

macos / linux · bash · bash-5.2 · 预期 valid

```text
(cd /project; git status) | cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.block

macos / linux · bash · bash-5.2 · 预期 valid

```text
{ echo a; echo b; } >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.if

macos / linux · bash · bash-5.2 · 预期 valid

```text
if probe a; then first; elif probe b; then second; else third; fi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.for

macos / linux · bash · bash-5.2 · 预期 valid

```text
for f in a b "c d"; do probe "$f"; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.while

macos / linux · bash · bash-5.2 · 预期 valid

```text
while probe; do step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.until

macos / linux · bash · bash-5.2 · 预期 valid

```text
until ready; do wait_step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.case

macos / linux · bash · bash-5.2 · 预期 valid

```text
case "$X" in a|b) first;; *) last;; esac
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.function

macos / linux · bash · bash-5.2 · 预期 valid

```text
f() { probe "$1"; }; f arg
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.shadow-function

macos / linux · bash · bash-5.2 · 预期 valid

```text
if testit; then git() { probe; }; fi; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.array

macos / linux · bash · bash-5.2 · 预期 valid

```text
a=(one "two three" $(probe)); echo "${a[@]}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.associative

macos / linux · bash · bash-5.2 · 预期 valid

```text
declare -A a; a[key]=value; echo "${a[key]}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.arith

macos / linux · bash · bash-5.2 · 预期 valid

```text
x=1; echo $((x+1)); ((x++))
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.arith-injection

macos / linux · bash · bash-5.2 · 预期 valid

```text
x='a[$(id)]'; echo $(( x ))
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.test-arith

macos / linux · bash · bash-5.2 · 预期 valid

```text
[[ $x -eq 0 ]]
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.indirection

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo "${!x}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.let

macos / linux · bash · bash-5.2 · 预期 valid

```text
let "x[$i]++"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.glob

macos / linux · bash · bash-5.2 · 预期 valid

```text
printf "%s\n" **/*.go ?.[ch]
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.brace

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo a{b,c}{1..3}
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.tilde

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo ~/Documents ~user/x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.ansi

macos / linux · bash · bash-5.2 · 预期 valid

```text
printf $'a\n\x41'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.eval

macos / linux · bash · bash-5.2 · 预期 valid

```text
eval 'probe arg'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.eval-dynamic

macos / linux · bash · bash-5.2 · 预期 valid

```text
eval "$CODE"; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.source

macos / linux · bash · bash-5.2 · 预期 valid

```text
source ./env.sh; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.trap

macos / linux · bash · bash-5.2 · 预期 valid

```text
trap 'probe cleanup' EXIT
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.alias

macos / linux · bash · bash-5.2 · 预期 valid

```text
alias e=echo
e hi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.shopt

macos / linux · bash · bash-5.2 · 预期 invalid

```text
shopt -s extglob; echo @(a|b)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-shell

macos / linux · bash · bash-5.2 · 预期 valid

```text
bash -c 'rm -rf "$1"' _ x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-env

macos / linux · bash · bash-5.2 · 预期 valid

```text
BASH_ENV=./x.sh bash -c true
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-dynamic

macos / linux · bash · bash-5.2 · 预期 valid

```text
sh -c "$SCRIPT"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.python

macos / linux · bash · bash-5.2 · 预期 valid

```text
python3 -c 'import os; print(os.getcwd())'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.node

macos / linux · bash · bash-5.2 · 预期 valid

```text
node -e 'console.log("hi|bye")'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.pipe-stderr

macos / linux · bash · bash-5.2 · 预期 valid

```text
tool |& cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.coproc

macos / linux · bash · bash-5.2 · 预期 valid

```text
coproc worker { tool; }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.named-fd

macos / linux · bash · bash-5.2 · 预期 valid

```text
exec {fd}>out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.comment

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo hi # probe fake
probe actual
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.unicode

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo 中文 😀 "空 格"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.crlf

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo 中文
echo 😀

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.bare-cr

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo ab
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.zero-width

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo a​b
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.bidi

macos / linux · bash · bash-5.2 · 预期 valid

```text
echo a‮b
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-quote

macos / linux · bash · bash-5.2 · 预期 invalid

```text
echo 'unterminated
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-paren

macos / linux · bash · bash-5.2 · 预期 invalid

```text
(echo a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-pipe

macos / linux · bash · bash-5.2 · 预期 invalid

```text
echo a |
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-unexpected

macos / linux · bash · bash-5.2 · 预期 invalid

```text
echo LINE1
fi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-bad-and

macos / linux · bash · bash-5.2 · 预期 invalid

```text
&& echo a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.profile32-coproc

macos / linux · bash · bash-3.2 · 预期 valid

```text
coproc cat
```

精确命令参数预期：`[["coproc","cat"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：macOS Host、发布默认策略、普通可访问 Workspace/cwd、editing=true、无已有批准。Bash 3.2 原生 argv 语义由 containsArgv 独立断言；Platform registry 仍将 coproc 命令名登记为 HardBlocked，因此三档保留 block。不得把版本语义差异当作放宽硬限制的依据。

### bash.profile32-named-fd

macos / linux · bash · bash-3.2 · 预期 valid

```text
exec {fd}>/dev/null
```

精确命令参数预期：`[["exec","{fd}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：macOS Host、发布默认策略、普通可访问 Workspace/cwd、editing=true、无已有批准。Bash 3.2 原生 argv 语义由 containsArgv 独立断言；Platform registry 仍将 exec 命令名登记为 HardBlocked，因此三档保留 block。不得把版本语义差异当作放宽硬限制的依据。

### bash.profile32-pipe-stderr

macos / linux · bash · bash-3.2 · 预期 invalid

```text
echo a |& cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.profile32-append-both

macos / linux · bash · bash-3.2 · 预期 invalid

```text
echo a &>> f
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.profile32-lowercase

macos / linux · bash · bash-3.2 · 预期 valid

```text
echo ${x,,}
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.profile32-case-fallthrough

macos / linux · bash · bash-3.2 · 预期 invalid

```text
case x in x) echo x ;& esac
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.pipeline.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git -C /project status | head -20 > result.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.multi-pipe.macos32

macos · bash · bash-3.2 · 预期 valid

```text
find /project -type f -print0 | xargs -0 du -k | sort -nr | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.multi-pipe-size.macos32

macos · bash · bash-3.2 · 预期 valid

```text
find /project -name '*.go' -print0 | xargs -0 wc -l | sort -n | tail -5
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.and-or.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git status && git diff || echo failed
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.sequence.macos32

macos · bash · bash-3.2 · 预期 valid

```text
cal; echo ok; free -h; sw_vers; xcrun --show-sdk-path
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。显式读取外部路径或未建模系统程序：默认 ReadOutsideRoots 与 Opaque 按三档分别处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-stash.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git -C /project stash push -m "work in progress"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-remote.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git remote -v; git branch --show-current; git log -5 --oneline
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-merge.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git merge --no-ff fix/steer-caller-identity
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-push.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git push origin HEAD:refs/heads/fix/mailbox
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.git-push-repeat.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git push --force-with-lease origin feature/topic
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.unzip.macos32

macos · bash · bash-3.2 · 预期 valid

```text
unzip -l '/downloads/project archive.zip'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。显式读取外部路径或未建模系统程序：默认 ReadOutsideRoots 与 Opaque 按三档分别处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.sips.macos32

macos · bash · bash-3.2 · 预期 valid

```text
sips -Z 1024 "/project/image a.png" --out /project/out.png
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.trash.macos32

macos · bash · bash-3.2 · 预期 valid

```text
trash -- '/project/old file.txt'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.npm.macos32

macos · bash · bash-3.2 · 预期 valid

```text
npm --prefix /project run build -- --mode test
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.npx.macos32

macos · bash · bash-3.2 · 预期 valid

```text
npx jest --runInBand --testPathPattern 'src/(a|b).test.ts'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.go-test.macos32

macos · bash · bash-3.2 · 预期 valid

```text
go test -overlay /tmp/overlay.json ./internal/... -run 'Compact|Summary' -count=1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.go-test-json.macos32

macos · bash · bash-3.2 · 预期 valid

```text
go test -json ./... -run 'Test(Compact|Summary)' > /tmp/results.json
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.empty.macos32

macos · bash · bash-3.2 · 预期 valid

```text
printf '%s\n' '' ""
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.concat.macos32

macos · bash · bash-3.2 · 预期 valid

```text
printf '%s' a' b'"c"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.escaped.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo a\ b \| \* \$HOME
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.env.macos32

macos · bash · bash-3.2 · 预期 valid

```text
LANG=C X='hello world' tool --flag
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.variable.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo $X "$Y" "$@"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.exit-status.macos32

macos · bash · bash-3.2 · 预期 valid

```text
false; rm -rf "/data/run$?"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.dynamic-command.macos32

macos · bash · bash-3.2 · 预期 valid

```text
$TOOL -rf x; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.substitution.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo "$(git status --short)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.substitution-default.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo "${X:-$(fallback arg)}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.process-substitution.macos32

macos · bash · bash-3.2 · 预期 valid

```text
diff <(sort a) <(sort b)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-substitution.macos32

macos · bash · bash-3.2 · 预期 valid

```text
cat > "$(target)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.assignment-substitution.macos32

macos · bash · bash-3.2 · 预期 valid

```text
X=$(probe a); echo "$X"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.heredoc.macos32

macos · bash · bash-3.2 · 预期 valid

```text
cat <<EOF
hello $(probe a)
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.heredoc-quoted.macos32

macos · bash · bash-3.2 · 预期 valid

```text
python3 - <<'EOF'
print('$(not_a_call)')
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.herestring.macos32

macos · bash · bash-3.2 · 预期 valid

```text
cat <<< "$X"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-order-a.macos32

macos · bash · bash-3.2 · 预期 valid

```text
tool 2>&1 >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.redirect-order-b.macos32

macos · bash · bash-3.2 · 预期 valid

```text
tool >out 2>&1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.close-fd.macos32

macos · bash · bash-3.2 · 预期 valid

```text
tool 3<&- 4>&-
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.append.macos32

macos · bash · bash-3.2 · 预期 valid

```text
tool >>out 2>>err
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.background.macos32

macos · bash · bash-3.2 · 预期 valid

```text
tool a & wait; echo done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.subshell.macos32

macos · bash · bash-3.2 · 预期 valid

```text
(cd /project; git status) | cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.block.macos32

macos · bash · bash-3.2 · 预期 valid

```text
{ echo a; echo b; } >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.if.macos32

macos · bash · bash-3.2 · 预期 valid

```text
if probe a; then first; elif probe b; then second; else third; fi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.for.macos32

macos · bash · bash-3.2 · 预期 valid

```text
for f in a b "c d"; do probe "$f"; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.while.macos32

macos · bash · bash-3.2 · 预期 valid

```text
while probe; do step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.until.macos32

macos · bash · bash-3.2 · 预期 valid

```text
until ready; do wait_step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.case.macos32

macos · bash · bash-3.2 · 预期 valid

```text
case "$X" in a|b) first;; *) last;; esac
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.function.macos32

macos · bash · bash-3.2 · 预期 valid

```text
f() { probe "$1"; }; f arg
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.shadow-function.macos32

macos · bash · bash-3.2 · 预期 valid

```text
if testit; then git() { probe; }; fi; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.array.macos32

macos · bash · bash-3.2 · 预期 valid

```text
a=(one "two three" $(probe)); echo "${a[@]}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.associative.macos32

macos · bash · bash-3.2 · 预期 valid

```text
declare -A a; a[key]=value; echo "${a[key]}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.arith.macos32

macos · bash · bash-3.2 · 预期 valid

```text
x=1; echo $((x+1)); ((x++))
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.arith-injection.macos32

macos · bash · bash-3.2 · 预期 valid

```text
x='a[$(id)]'; echo $(( x ))
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.test-arith.macos32

macos · bash · bash-3.2 · 预期 valid

```text
[[ $x -eq 0 ]]
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.indirection.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo "${!x}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.let.macos32

macos · bash · bash-3.2 · 预期 valid

```text
let "x[$i]++"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.glob.macos32

macos · bash · bash-3.2 · 预期 valid

```text
printf "%s\n" **/*.go ?.[ch]
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.brace.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo a{b,c}{1..3}
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.tilde.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo ~/Documents ~user/x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.ansi.macos32

macos · bash · bash-3.2 · 预期 valid

```text
printf $'a\n\x41'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.eval.macos32

macos · bash · bash-3.2 · 预期 valid

```text
eval 'probe arg'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.eval-dynamic.macos32

macos · bash · bash-3.2 · 预期 valid

```text
eval "$CODE"; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.source.macos32

macos · bash · bash-3.2 · 预期 valid

```text
source ./env.sh; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.trap.macos32

macos · bash · bash-3.2 · 预期 valid

```text
trap 'probe cleanup' EXIT
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.alias.macos32

macos · bash · bash-3.2 · 预期 valid

```text
alias e=echo
e hi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.shopt.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
shopt -s extglob; echo @(a|b)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-shell.macos32

macos · bash · bash-3.2 · 预期 valid

```text
bash -c 'rm -rf "$1"' _ x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。删除、丢弃数据或远程修改：默认 Destructive/RemoteMutation 在自动审批档也保持人工确认。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-env.macos32

macos · bash · bash-3.2 · 预期 valid

```text
BASH_ENV=./x.sh bash -c true
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.nested-dynamic.macos32

macos · bash · bash-3.2 · 预期 valid

```text
sh -c "$SCRIPT"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.python.macos32

macos · bash · bash-3.2 · 预期 valid

```text
python3 -c 'import os; print(os.getcwd())'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.node.macos32

macos · bash · bash-3.2 · 预期 valid

```text
node -e 'console.log("hi|bye")'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.pipe-stderr.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
tool |& cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.coproc.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
coproc worker { tool; }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.named-fd.macos32

macos · bash · bash-3.2 · 预期 valid

```text
exec {fd}>out
```

精确命令参数预期：`[["exec","{fd}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：macOS Host、发布默认策略、普通可访问 Workspace/cwd、editing=true、无已有批准。Bash 3.2 原生 argv 语义由 containsArgv 独立断言；Platform registry 仍将 exec 命令名登记为 HardBlocked，因此三档保留 block。不得把版本语义差异当作放宽硬限制的依据。

### bash.comment.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo hi # probe fake
probe actual
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.unicode.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo 中文 😀 "空 格"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.crlf.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo 中文
echo 😀

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.bare-cr.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo ab
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.zero-width.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo a​b
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.bidi.macos32

macos · bash · bash-3.2 · 预期 valid

```text
echo a‮b
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。命中生产 Shell 硬限制（禁止的内建命令语义、控制字符或未引用隐藏字符；AST 提前退回复杂语法导致未命中禁止内建时，保留为硬限制覆盖差异）；full_access 不放宽硬限制。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-quote.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
echo 'unterminated
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-paren.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
(echo a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-pipe.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
echo a |
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-unexpected.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
echo LINE1
fi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.invalid-bad-and.macos32

macos · bash · bash-3.2 · 预期 invalid

```text
&& echo a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。动态变量、AST 未支持结构或 xargs 运行时参数触发语法确认；security_review.AutoApprovedAtLevel 在 auto_approve 和 full_access 均返回 auto_approved，而不是 allow。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

## sh.jsonl · 27 条

### sh.pipeline

macos / linux · sh · sh-dash · 预期 valid

```text
git -C /project status | head -20 > result.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.multi-pipe

macos / linux · sh · sh-dash · 预期 valid

```text
find /project -type f -print0 | xargs -0 du -k | sort -nr | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.and-or

macos / linux · sh · sh-dash · 预期 valid

```text
git status && git diff || echo failed
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.sequence

macos / linux · sh · sh-dash · 预期 valid

```text
cal; echo ok; free -h; sw_vers; xcrun --show-sdk-path
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.empty

macos / linux · sh · sh-dash · 预期 valid

```text
printf '%s\n' '' ""
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.concat

macos / linux · sh · sh-dash · 预期 valid

```text
printf '%s' a' b'"c"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.env

macos / linux · sh · sh-dash · 预期 valid

```text
LANG=C X='hello world' tool --flag
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.variable

macos / linux · sh · sh-dash · 预期 valid

```text
echo $X "$Y" "$@"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.substitution

macos / linux · sh · sh-dash · 预期 valid

```text
echo "$(git status --short)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.heredoc

macos / linux · sh · sh-dash · 预期 valid

```text
cat <<EOF
hello $(probe a)
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.heredoc-quoted

macos / linux · sh · sh-dash · 预期 valid

```text
python3 - <<'EOF'
print('$(not_a_call)')
EOF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.redirect-order-a

macos / linux · sh · sh-dash · 预期 valid

```text
tool 2>&1 >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.redirect-order-b

macos / linux · sh · sh-dash · 预期 valid

```text
tool >out 2>&1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.background

macos / linux · sh · sh-dash · 预期 valid

```text
tool a & wait; echo done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.subshell

macos / linux · sh · sh-dash · 预期 valid

```text
(cd /project; git status) | cat
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.block

macos / linux · sh · sh-dash · 预期 valid

```text
{ echo a; echo b; } >out
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.if

macos / linux · sh · sh-dash · 预期 valid

```text
if probe a; then first; elif probe b; then second; else third; fi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.for

macos / linux · sh · sh-dash · 预期 valid

```text
for f in a b "c d"; do probe "$f"; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.while

macos / linux · sh · sh-dash · 预期 valid

```text
while probe; do step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.until

macos / linux · sh · sh-dash · 预期 valid

```text
until ready; do wait_step; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.case

macos / linux · sh · sh-dash · 预期 valid

```text
case "$X" in a|b) first;; *) last;; esac
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.function

macos / linux · sh · sh-dash · 预期 valid

```text
f() { probe "$1"; }; f arg
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.eval

macos / linux · sh · sh-dash · 预期 valid

```text
eval 'probe arg'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.source

macos / linux · sh · sh-dash · 预期 valid

```text
source ./env.sh; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.alias

macos / linux · sh · sh-dash · 预期 valid

```text
alias e=echo
e hi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.unicode

macos / linux · sh · sh-dash · 预期 valid

```text
echo 中文 😀 "空 格"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### sh.crlf

macos / linux · sh · sh-dash · 预期 valid

```text
echo 中文
echo 😀

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

## zsh.jsonl · 12 条

### zsh.array

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
a=(one two); print -l $a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.param-flags

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
print ${(j:,:)arr}
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.glob-qualifier

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
print -l *(.)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.extended-glob

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
print **/*(.om[1,5])
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.anonymous

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
() { print hi; }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.repeat

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
repeat 3; do print hi; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.autoload

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
autoload -Uz compinit; compinit
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.setopt

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
setopt EXTENDED_GLOB; print ^foo
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.process-substitution

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
diff <(sort a) =(sort b)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.nested

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
zsh -c 'print $1' _ x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.unicode

macos / linux · zsh · zsh-5.9 · 预期 valid

```text
print 中文 😀
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### zsh.invalid

macos / linux · zsh · zsh-5.9 · 预期 invalid

```text
print "bad
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：sh/Zsh 的启动语法没有生产 Bash 的已验证合同；UnknownDialect 在受限两档强制人工确认，full_access 允许。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

## powershell.jsonl · 66 条

### powershell.pipeline

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem | Where-Object { $_.Length -gt 10 } | Select-Object Name
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.nested-scriptblock

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem | ForEach-Object { Remove-Item $_ }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.quoted-pipe

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 'a|b' "x|y"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.and-or

windows · powershell · pwsh-7.6 · 预期 valid

```text
a && b || c
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.sequence

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date; Get-Location
Write-Output ok
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.redirection-a

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git status 2>&1 > out.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.redirection-b

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git status > out.txt 2>&1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.all-streams

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Process *> out.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.append

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Process >> out.txt
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.merge-warning

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Warning x 3>&1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.dynamic

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& $command @args
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.literal-invoke

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& 'C:\Program Files\Tool\tool.exe' -x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.dotsource

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
. '.\env.ps1'; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.subexpression

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "result $(Get-Date)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.array-subexpression

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$a = @(Get-ChildItem; Get-Date); git $a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.splat

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$o = @{Path=".";Recurse=$true}; Get-ChildItem @o
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.array

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$a = "x","y"; git $a
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.hashtable

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
@{name="x"; data=@(1,2)}
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.here-string

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output @'
hello | $(not_a_call)
'@

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.here-interpolated

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output @"
hello $(Get-Date)
"@

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.function

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Test-Probe($x) { Write-Output $x }; Test-Probe hi
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.filter

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
filter Test-Probe { $_ | Write-Output }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.if

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
if ($x) { Get-Date } elseif ($y) { Get-Location } else { Write-Output no }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.for

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
for ($i=0; $i -lt 3; $i++) { Write-Output $i }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.foreach

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
foreach ($f in $files) { Get-Content $f }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.while

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
while ($x) { Get-Date; break }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.do-until

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
do { Get-Date } until ($ready)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.switch

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
switch -Regex ($x) { "a|b" { Get-Date } default { Get-Location } }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.try

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
try { Get-Content x } catch { Write-Error $_ } finally { Write-Output done }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.class

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
class Probe { [string] $Name; [string] GetName() { return $this.Name } }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.enum

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
enum Color { Red; Green; Blue }
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.param

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
param([string]$Name="a") Write-Output $Name
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.using

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
using module ./module.psm1
Get-Date
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.requires

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
#Requires -Version 5.1
Get-Date
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.member

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$obj.Name
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.method

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$obj.Run()
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.static

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[IO.File]::ReadAllText($p)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.cast

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[int]$value
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.scriptblock-create

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[scriptblock]::Create($s).Invoke()
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.iex

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
iex $s; git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.iex-literal

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-Expression 'Get-Date'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.add-type

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Add-Type -TypeDefinition $code
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.stop-parsing

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
tool.exe --% a|b >x
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.ternary

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ? "yes" : "no"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.null-coalesce

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ?? "default"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.null-assign

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ??= "default"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.null-conditional

windows · powershell · pwsh-7.6 · 预期 valid

```text
${x}?.Name
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.native-array

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git @("x","y")
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.nested

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell -Command 'Get-Date'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.encoded

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -EncodedCommand RwBlAHQALQBEAGEAdABlAA==
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.file

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell -File ./script.ps1
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.background

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Process &
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.unicode

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 中文 😀
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.crlf

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date
Write-Output 中文

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.smart-dash

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output a –b
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.smart-quote

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output “hello”
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.escaped

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "a`"b"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.empty

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
tool '' ""
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.comment

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date # ignored | fake
Get-Location
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.invalid-quote

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output 'bad
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.invalid-block

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
if ($x) { Get-Date
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.invalid-pipe

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date |
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.invalid-here

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
@'
x

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.ps51-and-or

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
a && b || c
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.ps51-ternary

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x ? "yes" : "no"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### powershell.ps51-null-coalesce

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x ?? "default"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

## cmd.jsonl · 42 条

### cmd.simple

windows · cmd · cmd-batch · 预期 valid

```text
git status

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.pipeline

windows · cmd · cmd-batch · 预期 valid

```text
dir /b | sort | findstr /i txt

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.and-or

windows · cmd · cmd-batch · 预期 valid

```text
git status && echo ok || echo fail

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.sequence

windows · cmd · cmd-batch · 预期 valid

```text
echo a & echo b

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.quoted-pipe

windows · cmd · cmd-batch · 预期 valid

```text
echo "a|b"

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.escape

windows · cmd · cmd-batch · 预期 valid

```text
echo a^|b ^& c

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.caret-newline

windows · cmd · cmd-batch · 预期 valid

```text
echo hello ^
world

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.redirection-a

windows · cmd · cmd-batch · 预期 valid

```text
tool 2>&1 >out

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.redirection-b

windows · cmd · cmd-batch · 预期 valid

```text
tool >out 2>&1

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.append

windows · cmd · cmd-batch · 预期 valid

```text
tool >>out 2>>err

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.group

windows · cmd · cmd-batch · 预期 valid

```text
(echo a & echo b) >out

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.if-exist

windows · cmd · cmd-batch · 预期 valid

```text
if exist file.txt (type file.txt) else (echo missing)

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.if-errorlevel

windows · cmd · cmd-batch · 预期 valid

```text
if errorlevel 1 echo failed

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.if-compare

windows · cmd · cmd-batch · 预期 valid

```text
if /I "%X%"=="hello" echo yes

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-files

windows · cmd · cmd-batch · 预期 valid

```text
for %%F in (*.txt) do type "%%F"

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-range

windows · cmd · cmd-batch · 预期 valid

```text
for /L %%i in (1,1,5) do echo %%i

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-f

windows · cmd · cmd-batch · 预期 valid

```text
for /F "tokens=1,2 delims=," %%a in (data.csv) do echo %%a %%b

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-f-command

windows · cmd · cmd-batch · 预期 valid

```text
for /F "delims=" %%a in ('dir /b') do echo %%a

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-usebackq

windows · cmd · cmd-batch · 预期 valid

```text
for /F "usebackq delims=" %%a in (`dir /b`) do echo %%a

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.for-recursive

windows · cmd · cmd-batch · 预期 valid

```text
for /R . %%F in (*.go) do echo %%~fF

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.call-file

windows · cmd · cmd-batch · 预期 valid

```text
call script.cmd arg

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.call-label

windows · cmd · cmd-batch · 预期 valid

```text
call :worker arg
goto :eof
:worker
echo %1

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.call-expansion

windows · cmd · cmd-batch · 预期 valid

```text
call echo %%X%%

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.goto

windows · cmd · cmd-batch · 预期 valid

```text
goto done
echo skipped
:done
echo done

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.set

windows · cmd · cmd-batch · 预期 valid

```text
set "X=a & del x"
echo %X%

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.set-arithmetic

windows · cmd · cmd-batch · 预期 valid

```text
set /A x=1+2

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.set-prompt

windows · cmd · cmd-batch · 预期 valid

```text
set /P X=Name: 

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.setlocal

windows · cmd · cmd-batch · 预期 valid

```text
setlocal enabledelayedexpansion
set X=a
echo !X!
endlocal

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.delayed

windows · cmd · cmd-batch · 预期 valid

```text
echo !X!

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.percent

windows · cmd · cmd-batch · 预期 valid

```text
echo %PATH% %~dp0 %1 %%i

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.parameter-mod

windows · cmd · cmd-batch · 预期 valid

```text
echo %~f1 %~nx1 %~dp0

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.variable-slice

windows · cmd · cmd-batch · 预期 valid

```text
echo %X:~0,3% %X:a=b%

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.echo-off

windows · cmd · cmd-batch · 预期 valid

```text
@echo off
echo hello

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.label

windows · cmd · cmd-batch · 预期 valid

```text
:: comment
:label
echo hi

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.exit

windows · cmd · cmd-batch · 预期 valid

```text
exit /b 1

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.nested

windows · cmd · cmd-batch · 预期 valid

```text
cmd /d /s /c "echo hello"

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.parenthesis-echo

windows · cmd · cmd-batch · 预期 valid

```text
echo hello (world)

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.pipe-group

windows · cmd · cmd-batch · 预期 valid

```text
(echo a & echo b) | findstr a

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.unicode

windows · cmd · cmd-batch · 预期 valid

```text
echo 中文 😀

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.invalid-paren

windows · cmd · cmd-batch · 预期 invalid

```text
(echo a

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.invalid-pipe

windows · cmd · cmd-batch · 预期 invalid

```text
echo a |

```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### cmd.no-final-newline

windows · cmd · cmd-batch · 预期 valid

```text
git status
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。macOS Host 基线：Windows PowerShell/CMD 启动器不可用，启动准备硬阻断；这不是 Windows 原生审批验收。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。
