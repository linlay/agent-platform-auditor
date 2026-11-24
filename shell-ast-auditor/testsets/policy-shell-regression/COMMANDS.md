# Bash 审批回归

覆盖 Bash 元数据检查、find 筛选、递归删除、macOS strings，以及版本查询和 Go 参数的三档审批预期。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 18 条

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

### policy.bash-strings-regular-file

macos · bash · bash-3.2 · 预期 valid

```text
strings package.json
```

精确命令参数预期：`[["strings","package.json"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：受信系统入口经 xcrun 解析到 Apple Command Line Tools，单个现存普通文件在只读 Workspace 内，三档均可读取。

### policy.bash-strings-read-only-pipelines

macos · bash · bash-3.2 · 预期 valid

```text
cd . && strings package.json 2>/dev/null | grep -o 'shell-ast-auditor' | sort -u | head -1; echo marker; /usr/bin/strings package.json 2>/dev/null | grep -oE 'shell-ast-auditor' | head -1
```

精确命令参数预期：`[["cd","."],["strings","package.json"],["grep","-o","shell-ast-auditor"],["sort","-u"],["head","-1"],["echo","marker"],["/usr/bin/strings","package.json"],["grep","-oE","shell-ast-auditor"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：两条管线中的 strings 读取 Workspace 普通文件，grep、sort、head 消费标准流，stderr 指向系统空设备。

### policy.bash-strings-outside-input

macos · bash · bash-3.2 · 预期 valid

```text
strings /usr/share/dict/words
```

精确命令参数预期：`[["strings","/usr/share/dict/words"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：输入必须解析为当前 Host 上读取根之外的普通文件。受信 strings 只产生区外读取要求。

### policy.bash-strings-outside-pipeline-input

macos · bash · bash-3.2 · 预期 valid

```text
strings package.json | head -n 1 /usr/share/dict/words
```

精确命令参数预期：`[["strings","package.json"],["head","-n","1","/usr/share/dict/words"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：strings 的输入在 Workspace；head 自行打开读取根之外的词表，独立产生区外读取要求。

### policy.bash-strings-outside-redirect

macos · bash · bash-3.2 · 预期 valid

```text
strings package.json > /usr/share/dict/auditor-strings-output.log
```

精确命令参数预期：`[["strings","package.json"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：strings 只读 Workspace 文件。stdout 的目标位于写根之外，按外部写入策略独立审查。

### policy.bash-strings-path-shadow

macos · bash · bash-3.2 · 预期 valid

```text
PATH=./testsets/policy-shell-regression/fixtures:/usr/bin:/bin strings package.json
```

精确命令参数预期：`[["strings","package.json"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：PATH 首项命中测试集附带的可执行同名夹具，继续按不透明命令策略审查。

### policy.bash-strings-unmodeled-option

macos · bash · bash-3.2 · 预期 valid

```text
strings -a package.json
```

精确命令参数预期：`[["strings","-a","package.json"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：这个版本只建模无选项单文件调用，-a 保留不透明命令审查。

### policy.bash-strings-toolchain-override

macos · bash · bash-3.2 · 预期 valid

```text
DEVELOPER_DIR=. strings package.json
```

精确命令参数预期：`[["strings","package.json"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：显式 DEVELOPER_DIR 使系统 shim 的下游选择超出已核验合同，继续检查执行效果。

### policy.bash-strings-missing-file

macos · bash · bash-3.2 · 预期 valid

```text
strings auditor-strings-missing-input.dat
```

精确命令参数预期：`[["strings","auditor-strings-missing-input.dat"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：测试输入路径须保持缺失，审查无法确认普通文件，继续按不透明执行策略处理。

## version-queries.jsonl · 6 条

### policy.version.git.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
git --version
```

精确命令参数预期：`[["git","--version"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：受信 Git 的独立版本查询在只读工作区内直接允许。

### policy.version.python.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
python3 --version
```

精确命令参数预期：`[["python3","--version"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：受信的原生 Python 解释器只接收 --version，直接报告版本。

### policy.version.node-extra.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
node --version extra.js
```

精确命令参数预期：`[["node","--version","extra.js"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：附加参数超出单独版本查询的范围，按默认 opaque 程序策略进行审批。

### policy.version.go-m-inside.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
go version -m bin/auditor
```

精确命令参数预期：`[["go","version","-m","bin/auditor"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验的本地 Go 工具链，GOENV=off、GOTOOLCHAIN=local，遥测已关闭且启动配置可读。目标为可读工作区内已有的普通文件，三档直接允许。

### policy.version.go-m-outside.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
go version -m ../bin/auditor
```

精确命令参数预期：`[["go","version","-m","../bin/auditor"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：已核验的本地 Go 工具链，GOENV=off、GOTOOLCHAIN=local，遥测已关闭且启动配置可读。以 testsets 为工作区和 cwd，同一二进制在其父目录的 bin 下，须按区外读取策略判断。

### policy.version.go-exec.bash

macos / linux · bash · bash-3.2 · 预期 valid

```text
go run -exec=fixture-tool main.go
```

精确命令参数预期：`[["go","run","-exec=fixture-tool","main.go"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | requires_approval |

预期依据：发布的 risk-options.yml 将 Go 的 -exec 列为 require。绑定参数值时三档仍须人工审批。
