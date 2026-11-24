# npm 全局路径审批回归

11 条用例覆盖 CuteJ 原命令、npm 查询与动态路径、只读工作区重定向、安装及脚本执行。使用 macOS Host Bash 3.2 和默认三档预审。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 11 条

### policy.npm-original

macos · bash · bash-3.2 · 预期 valid

```text
npm root -g; npm bin -g 2>/dev/null; ls -la "$(npm prefix -g)/bin" 2>/dev/null | head -20
```

精确命令参数预期：`[["npm","root","-g"],["npm","bin","-g"],["npm","prefix","-g"],["head","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：npm 入口效果未知，ls 目标由嵌套的 npm 查询结果决定。两类要求都应保留。npm 9 起移除了 bin 子命令，其运行时兼容性另行验证。

### policy.npm-direct-prefix

macos · bash · bash-3.2 · 预期 valid

```text
npm prefix -g
```

精确命令参数预期：`[["npm","prefix","-g"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：字面参数只请求全局前缀。普通 Host npm 的入口仍按执行效果未知处理。

### policy.npm-literal-listing

macos · bash · bash-3.2 · 预期 valid

```text
ls -la "./auditor npm prefix/bin" 2>/dev/null | head -20
```

精确命令参数预期：`[["ls","-la","./auditor npm prefix/bin"],["head","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：带空格的工作区相对目录仍是单个字面读操作数，使用系统 ls、head 和已核验的空设备时三档均可通过。

### policy.npm-capture-display

macos · bash · bash-3.2 · 预期 valid

```text
prefix=$(npm prefix -g) && printf "%s\n" "$prefix"
```

精确命令参数预期：`[["npm","prefix","-g"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：命令替换的结果只作为 printf 的数据，npm 入口仍按执行效果未知处理。

### policy.npm-guarded-dynamic-listing

macos · bash · bash-3.2 · 预期 valid

```text
if prefix=$(npm prefix -g 2>/dev/null) && test -n "$prefix"; then
  ls -la "$prefix/bin" 2>/dev/null | head -20
fi
```

精确命令参数预期：`[["npm","prefix","-g"],["head","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：成功分支和非空校验无法提供确定的目录。npm 执行与 ls 的动态路径分别审查。

### policy.npm-nested-substitution

macos · bash · bash-3.2 · 预期 valid

```text
ls -la "$(dirname "$(npm root -g)")" 2>/dev/null | head -20
```

精确命令参数预期：`[["npm","root","-g"],["head","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：保留 npm root 调用和 dirname 两层命令替换。外层 ls 的操作数仍依赖执行结果。

### policy.npm-env-prefix-override

macos · bash · bash-3.2 · 预期 valid

```text
env npm_config_prefix="./auditor npm prefix" npm --global prefix
```

精确命令参数预期：`[["env","npm_config_prefix=./auditor npm prefix","npm","--global","prefix"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：env 传入单个带空格的前缀配置，并使用前置长选项。固定前缀无法证明 npm 入口的文件效果。

### policy.npm-read-only-redirect

macos · bash · bash-3.2 · 预期 valid

```text
npm prefix -g > "./auditor npm prefix.txt"
```

精确命令参数预期：`[["npm","prefix","-g"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：editing=false 时，stdout 写入工作区属于硬阻断，三档都拒绝。

### policy.npm-global-install

macos · bash · bash-3.2 · 预期 valid

```text
npm install -g auditor-fixture-package
```

精确命令参数预期：`[["npm","install","-g","auditor-fixture-package"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：全局安装可写入 npm 安装目录并运行生命周期脚本，沿用普通 npm 入口的三档审批策略。

### policy.npm-run-script

macos · bash · bash-3.2 · 预期 valid

```text
npm run build -- --profile=offline
```

精确命令参数预期：`[["npm","run","build","--","--profile=offline"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：npm run 调用 package.json 的脚本并传入字面参数，沿用普通 npm 入口的三档审批策略。

### policy.npm-non-npm-dynamic-listing

macos · bash · bash-3.2 · 预期 valid

```text
ls -la "$(printf '%s' './auditor npm prefix/bin')" 2>/dev/null | head -20
```

精确命令参数预期：`[["printf","%s","./auditor npm prefix/bin"],["head","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：单独验证动态操作数。ls 仍从命令替换取目录，printf 输出中的字面路径在 Shell 审查时保持待解析。
