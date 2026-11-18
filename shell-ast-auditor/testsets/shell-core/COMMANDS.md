# macOS / Linux 核心测试集

233 条 macOS/Linux 用例：Bash、sh、Zsh，含 12 组用户命令适配的 Bash 3.2/5.2 用例；Windows 已独立到 windows-core。

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

## user-commands.jsonl · 24 条

### bash.user.go-env-cache-version.linux52

linux · bash · bash-5.2 · 预期 valid

```text
go env GOMODCACHE GOVERSION
```

精确命令参数预期：`[["go","env","GOMODCACHE","GOVERSION"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.go-env-cache-version.macos32

macos · bash · bash-3.2 · 预期 valid

```text
go env GOMODCACHE GOVERSION
```

精确命令参数预期：`[["go","env","GOMODCACHE","GOVERSION"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.file-grep-module-path.linux52

linux · bash · bash-5.2 · 预期 valid

```text
file_grep /Users/fixture/go/pkg/mod/mvdan.cc/sh/v3@v3.13.1/syntax/nodes.go
```

精确命令参数预期：`[["file_grep","/Users/fixture/go/pkg/mod/mvdan.cc/sh/v3@v3.13.1/syntax/nodes.go"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.file-grep-module-path.macos32

macos · bash · bash-3.2 · 预期 valid

```text
file_grep /Users/fixture/go/pkg/mod/mvdan.cc/sh/v3@v3.13.1/syntax/nodes.go
```

精确命令参数预期：`[["file_grep","/Users/fixture/go/pkg/mod/mvdan.cc/sh/v3@v3.13.1/syntax/nodes.go"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ps-explicit-columns.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ps -eo pid,ppid,user,etime,args
```

精确命令参数预期：`[["ps","-eo","pid,ppid,user,etime,args"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ps-explicit-columns.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ps -eo pid,ppid,user,etime,args
```

精确命令参数预期：`[["ps","-eo","pid,ppid,user,etime,args"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.docker-format-unquoted.linux52

linux · bash · bash-5.2 · 预期 valid

```text
docker ps --format {{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}
```

精确命令参数预期：`[["docker","ps","--format","{{.ID}}"],["{{.Image}}"],["{{.Names}}"],["{{.Status}}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.docker-format-unquoted.macos32

macos · bash · bash-3.2 · 预期 valid

```text
docker ps --format {{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}
```

精确命令参数预期：`[["docker","ps","--format","{{.ID}}"],["{{.Image}}"],["{{.Names}}"],["{{.Status}}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.docker-format-quoted.linux52

linux · bash · bash-5.2 · 预期 valid

```text
docker ps --format '{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}'
```

精确命令参数预期：`[["docker","ps","--format","{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.docker-format-quoted.macos32

macos · bash · bash-3.2 · 预期 valid

```text
docker ps --format '{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}'
```

精确命令参数预期：`[["docker","ps","--format","{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.git-status-ignored.linux52

linux · bash · bash-5.2 · 预期 valid

```text
git status --short --ignored
```

精确命令参数预期：`[["git","status","--short","--ignored"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.git-status-ignored.macos32

macos · bash · bash-3.2 · 预期 valid

```text
git status --short --ignored
```

精确命令参数预期：`[["git","status","--short","--ignored"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。按只读/输出或工作区内非破坏性写入语义预期直接允许；Git 查询/本地操作要求系统 Git 与配置可核验且无外部 helper/活动 hook；未覆盖选项导致的保守审批保留为能力差异。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-disk-query.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh fixture-host "df -h"
```

精确命令参数预期：`[["ssh","fixture-host","df -h"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-disk-query.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh fixture-host "df -h"
```

精确命令参数预期：`[["ssh","fixture-host","df -h"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-quoted-process-summary.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh fixture-host "uptime; echo '---'; ps aux --sort=-%mem | head -8"
```

精确命令参数预期：`[["ssh","fixture-host","uptime; echo '---'; ps aux --sort=-%mem | head -8"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-quoted-process-summary.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh fixture-host "uptime; echo '---'; ps aux --sort=-%mem | head -8"
```

精确命令参数预期：`[["ssh","fixture-host","uptime; echo '---'; ps aux --sort=-%mem | head -8"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-inventory-script.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'echo "= KES TREE ="; ls -la /kingbase/apps/KingbaseES/; echo "= DATA DIR ="; ls -la /kingbase/apps/KingbaseES/data 2>/dev/null | head -30; echo "= DATA USAGE ="; du -xhd1 /kingbase/apps/KingbaseES/data 2>/dev/null | sort -h | tail -12; echo "= SOFTWARE ="; ls -la /kingbase/software'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","echo \"= KES TREE =\"; ls -la /kingbase/apps/KingbaseES/; echo \"= DATA DIR =\"; ls -la /kingbase/apps/KingbaseES/data 2>/dev/null | head -30; echo \"= DATA USAGE =\"; du -xhd1 /kingbase/apps/KingbaseES/data 2>/dev/null | sort -h | tail -12; echo \"= SOFTWARE =\"; ls -la /kingbase/software"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-inventory-script.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'echo "= KES TREE ="; ls -la /kingbase/apps/KingbaseES/; echo "= DATA DIR ="; ls -la /kingbase/apps/KingbaseES/data 2>/dev/null | head -30; echo "= DATA USAGE ="; du -xhd1 /kingbase/apps/KingbaseES/data 2>/dev/null | sort -h | tail -12; echo "= SOFTWARE ="; ls -la /kingbase/software'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","echo \"= KES TREE =\"; ls -la /kingbase/apps/KingbaseES/; echo \"= DATA DIR =\"; ls -la /kingbase/apps/KingbaseES/data 2>/dev/null | head -30; echo \"= DATA USAGE =\"; du -xhd1 /kingbase/apps/KingbaseES/data 2>/dev/null | sort -h | tail -12; echo \"= SOFTWARE =\"; ls -la /kingbase/software"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-sql-read-script.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp && sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d postgres -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -30'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp && sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d postgres -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -30"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-sql-read-script.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp && sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d postgres -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -30'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp && sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d postgres -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -30"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-loop-literal-db.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo "--- try db ---"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d "db" -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -20; done'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo \"--- try db ---\"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d \"db\" -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -20; done"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-loop-literal-db.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo "--- try db ---"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d "db" -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -20; done'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo \"--- try db ---\"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d \"db\" -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -20; done"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-loop-variable-db.linux52

linux · bash · bash-5.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo "--- try db ---"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d "$db" -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -20; done'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo \"--- try db ---\"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d \"$db\" -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -20; done"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。

### bash.user.ssh-loop-variable-db.macos32

macos · bash · bash-3.2 · 预期 valid

```text
ssh -o ConnectTimeout=10 -o BatchMode=yes fixture-host 'cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo "--- try db ---"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d "$db" -c "select datname, pg_database_size(datname) from pg_database order by 1;" 2>&1 | head -20; done'
```

精确命令参数预期：`[["ssh","-o","ConnectTimeout=10","-o","BatchMode=yes","fixture-host","cd /tmp; for db in test TEST kingbase KES zc40_app_cq zc40_flow_cq; do echo \"--- try db ---\"; sudo -u kingbase /kingbase/apps/KingbaseES/KESRealPro/V009R001C010/Server/bin/ksql -U system -d \"$db\" -c \"select datname, pg_database_size(datname) from pg_database order by 1;\" 2>&1 | head -20; done"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：默认策略与命令语义合同；macOS Host；Workspace 与 cwd 为同一普通可访问目录、editing=true、无已有批准。未完整建模的程序、动态参数或复杂语法：BashOpaqueCommand/BashComplexFilesystem 与运行时包装器按三档默认动作处理。 目录映射或实际环境不满足条件时保留不符预期，不用本次结果改写预期。
