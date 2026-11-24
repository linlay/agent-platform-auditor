# macOS 对话实录审批样本（2026-11-24）

从 113 次 Shell 审批裁决归并出 49 条现场样本，另有 6 条对照，覆盖路径、执行入口及 Bash 语法。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## paths.jsonl · 23 条

### policy.chat-approval.macos.repo-parent

macos · bash · bash-3.2 · 预期 valid

```text
ls -d /project/testsets/windows-core /project/testsets/shell-core 2>&1; echo "---"; ls /project/testsets 2>&1 | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：单独授权两个目标目录时，末尾的 ls 仍枚举它们的父目录。

### policy.chat-approval.macos.repo-find

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && ls && find . -maxdepth 3 -type d -not -path "*/node_modules*" | head -40
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：跨目录枚举配合 find 深度过滤。

### policy.chat-approval.macos.repo-web

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/windows-core && grep -rn --include="*.jsonl" -l "powershell" . 2>/dev/null | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：第二个独立读取根。保留路径、递归查询和管道。

### policy.chat-approval.macos.repo-count

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && wc -l bash.jsonl 2>/dev/null; grep -rn "workspace" . | head -50
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：同一调用内的文件计数和文本查询。

### policy.chat-approval.macos.repo-sequence

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && sed -n '1,8p' bash.jsonl; echo "---"; grep -rn "workspace" . | head -10
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：保留 && 后有分号续段的工作目录语义。

### policy.chat-approval.macos.repo-sed

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && sed -n '1,8p' bash.jsonl
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：跨目录 sed 只读，目标目录单独授权时可直接放行。

### policy.chat-approval.macos.repo-grep

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && grep -rn --include="*.jsonl" "workspace" . | grep -v fixture | head -20
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：合并同一仓库中的只读查找，搜索表达式及行数不同只记来源。

### policy.chat-approval.macos.repo-read-inside

macos · bash · bash-3.2 · 预期 valid

```text
sed -n '1,8p' bash.jsonl
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：同一套文本读取，在允许的工作区内直接放行。

### policy.chat-approval.macos.chat-directory-list

macos · bash · bash-3.2 · 预期 valid

```text
cd /auditor-chat-fixture/chats; ls *.jsonl 2>/dev/null | head -40; ls *.jsonl 2>/dev/null | wc -l
```

### policy.chat-approval.macos.chat-inline-read

macos · bash · bash-3.2 · 预期 valid

```text
cd /auditor-chat-fixture/chats; python3 - <<'PY'
from pathlib import Path
for path in sorted(Path('.').glob('*.jsonl')):
    print(path.name, len(path.read_text(encoding='utf-8').splitlines()))
PY
```

### policy.chat-approval.macos.chat-inline-timing-write

macos · bash · bash-3.2 · 预期 valid

```text
cd /auditor-chat-fixture/chats; python3 - <<'PY'
import json
from pathlib import Path
Path('/tmp/auditor-timings.json').write_text(json.dumps([2, 3, 5]))
PY
```

### policy.chat-approval.macos.chat-list-abspath

macos · bash · bash-3.2 · 预期 valid

```text
ls -la /auditor-chat-fixture/chats/ | head -40
```

### policy.chat-approval.macos.runtime-and-chats-list

macos · bash · bash-3.2 · 预期 valid

```text
ls -la /auditor-chat-fixture/chats/ 2>/dev/null; ls -la /auditor-chat-fixture/ 2>/dev/null | head -40
```

### policy.chat-approval.macos.foreign-chat-find

macos · bash · bash-3.2 · 预期 valid

```text
find /auditor-chat-fixture/chats/source -maxdepth 3 | head -60
```

### policy.chat-approval.macos.foreign-chat-copy

macos · bash · bash-3.2 · 预期 valid

```text
mkdir -p /tmp/auditor-chat-target/artifacts && cp "/auditor-chat-fixture/chats/source/artifacts/dashboard.html" /tmp/auditor-chat-target/artifacts/
```

### policy.chat-approval.macos.foreign-chat-grep

macos · bash · bash-3.2 · 预期 valid

```text
f="/auditor-chat-fixture/chats/source/artifacts/dashboard.html"; grep -o 'src="[^"]*"' "$f" | head -20
```

### policy.chat-approval.macos.foreign-chat-python

macos · bash · bash-3.2 · 预期 valid

```text
f="/auditor-chat-fixture/chats/source/artifacts/dashboard.html"; python3 - "$f" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).read_text(encoding='utf-8')[:200])
PY
```

### policy.chat-approval.macos.runtime-agent-list

macos · bash · bash-3.2 · 预期 valid

```text
ls -la /auditor-runtime-fixture/connectors/ 2>/dev/null; ls -la /auditor-runtime-fixture/ru-agents/agent/.config/ 2>/dev/null
```

### policy.chat-approval.macos.metadata-multi-path

macos · bash · bash-3.2 · 预期 valid

```text
ls -ld /auditor-work-fixture/docs /auditor-work-fixture/parent/AGENTS.md 2>&1 | head -30
```

### policy.chat-approval.macos.static-dir-loop

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets && for d in shell-core windows-core; do ls -la "$d" 2>/dev/null | head -20; done
```

### policy.chat-approval.macos.ancestor-loop

macos · bash · bash-3.2 · 预期 valid

```text
ls -la /auditor-work-fixture/projects 2>&1; d=$(pwd); while [ "$d" != "/" ]; do [ -d "$d/.git" ] && echo "$d"; d=$(dirname "$d"); done
```

### policy.chat-approval.macos.outside-find

macos · bash · bash-3.2 · 预期 valid

```text
find /auditor-work-fixture -maxdepth 4 -name .git -print 2>/dev/null; find . -name "*.bak" -print
```

### policy.chat-approval.macos.outside-git-remotes

macos · bash · bash-3.2 · 预期 valid

```text
for d in /project/testsets/shell-core /project/testsets/windows-core; do git -C "$d" remote -v 2>&1 | head -4; done
```

## execution.jsonl · 22 条

### policy.chat-approval.macos.node-after-cd

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && node verify-dashboard.js dashboard.html
```

### policy.chat-approval.macos.node-after-cd-tail

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && node verify-dashboard.js dashboard.html 2>&1 | tail -25
```

### policy.chat-approval.macos.node-after-cd-script-only

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && node crosscheck-sql.js 2>&1 | tail -30
```

### policy.chat-approval.macos.node-after-cd-grep

macos · bash · bash-3.2 · 预期 valid

```text
cd /project/testsets/shell-core && node verify-dashboard.js /project/testsets/shell-core/dashboard.html 2>&1 | grep -E "FAIL|核对结果"
```

### policy.chat-approval.macos.node-direct-cwd

macos · bash · bash-3.2 · 预期 valid

```text
node verify-dashboard.js dashboard.html 2>&1 | tail -25
```

### policy.chat-approval.macos.version-probes

macos · bash · bash-3.2 · 预期 valid

```text
node --version 2>/dev/null || echo "no node"; python3 --version
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：保留只读版本探测、失败分支和顺序执行。已核验本机解释器身份时可直接放行。

### policy.chat-approval.macos.version-toolchain-combined

macos · bash · bash-3.2 · 预期 valid

```text
go version 2>&1 | head -2; echo "=== node ==="; node --version 2>&1 | head -2; python3 --version 2>&1 | head -2
```

### policy.chat-approval.macos.version-go-m-pipeline

macos · bash · bash-3.2 · 预期 valid

```text
go version -m ../bin/auditor 2>&1 | head -30
```

### policy.chat-approval.macos.python-compile-module

macos · bash · bash-3.2 · 预期 valid

```text
python3 -m py_compile scripts/sample.py && echo SYNTAX_OK
```

### policy.chat-approval.macos.python-compile-and-run

macos · bash · bash-3.2 · 预期 valid

```text
python3 -m py_compile scripts/sample.py && echo COMPILE_OK && python3 scripts/sample.py sample-data.json --format markdown
```

### policy.chat-approval.macos.python-check-in-memory

macos · bash · bash-3.2 · 预期 valid

```text
python3 -I -c 'import pathlib, sys; p=pathlib.Path(sys.argv[1]); compile(p.read_bytes(), str(p), "exec")' scripts/sample.py && echo SYNTAX_OK
```

### policy.chat-approval.macos.python-script

macos · bash · bash-3.2 · 预期 valid

```text
python3 scripts/sample.py
```

### policy.chat-approval.macos.python-skill-pipeline

macos · bash · bash-3.2 · 预期 valid

```text
python3 scripts/sample.py sample-data.json --format csv | head -5
```

### policy.chat-approval.macos.missing-executable

macos · bash · bash-3.2 · 预期 valid

```text
auditor_fixture_nonexistent_command_z9
```

### policy.chat-approval.macos.compiled-temp-binary

macos · bash · bash-3.2 · 预期 valid

```text
CGO_ENABLED=0 go build -trimpath -o /tmp/auditor-fixture-tool ./cmd/server && /tmp/auditor-fixture-tool --help && /tmp/auditor-fixture-tool --version
```

### policy.chat-approval.macos.temp-binary-help-cleanup

macos · bash · bash-3.2 · 预期 valid

```text
/tmp/auditor-fixture-tool read --help; /tmp/auditor-fixture-tool write --help; rm -f /tmp/auditor-fixture-tool
```

### policy.chat-approval.macos.compare-bytes

macos · bash · bash-3.2 · 预期 valid

```text
cmp -l README.md package.json | head -5; cmp -l README.md package.json | wc -l
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标行为是已核验系统 cmp 对授权范围内的两个文件进行只读比较。未建模时保留差异。

### policy.chat-approval.macos.compare-sorted-files

macos · bash · bash-3.2 · 预期 valid

```text
comm -23 README.md package.json
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：从 Git 复合命令拆出的只读对照。目标行为要求已核验系统 comm，两个操作数都在读取根。

### policy.chat-approval.macos.git-list-and-comm

macos · bash · bash-3.2 · 预期 valid

```text
git -C /tmp/auditor-compare-fixture ls-files | sort > /tmp/auditor-remote-files.txt; comm -23 /tmp/auditor-local-files.txt /tmp/auditor-remote-files.txt
```

### policy.chat-approval.macos.git-config-and-comm

macos · bash · bash-3.2 · 预期 valid

```text
git -C /tmp/auditor-compare-fixture -c core.quotePath=false ls-files | sort > /tmp/auditor-remote-files.txt; comm -23 /tmp/auditor-local-files.txt /tmp/auditor-remote-files.txt
```

### policy.chat-approval.macos.static-server-wrapper

macos · bash · bash-3.2 · 预期 valid

```text
cd /tmp/auditor-preview-fixture && nohup python3 -m http.server 18977 --bind 127.0.0.1 > /tmp/auditor-preview.log 2>&1 &
```

### policy.chat-approval.macos.stop-process-by-pattern

macos · bash · bash-3.2 · 预期 valid

```text
pkill -f "http.server 18977"; echo done
```

## shell-form.jsonl · 10 条

### policy.chat-approval.macos.recursive-cache-delete

macos · bash · bash-3.2 · 预期 valid

```text
ls -laR . && rm -rf scripts/__pycache__
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：清理技能草稿缓存时保留 ls 后的递归删除。该目录名不豁免 destructive。

### policy.chat-approval.macos.report-and-cache-delete

macos · bash · bash-3.2 · 预期 valid

```text
ls -1 testsets/*/testset.json | wc -l && rm -rf scripts/__pycache__
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：从报告批次保留报告通配与删除的组合，同类清理使用同一个规则。

### policy.chat-approval.macos.remove-before-clone

macos · bash · bash-3.2 · 预期 valid

```text
rm -rf /tmp/auditor-compare-fixture && git clone --depth 1 --quiet https://example.invalid/repo.git /tmp/auditor-compare-fixture
```

### policy.chat-approval.macos.process-substitution-diff

macos · bash · bash-3.2 · 预期 valid

```text
diff <(grep -A5 'marker' README.md) <(grep -A5 'marker' package.json)
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：已有核心用例覆盖进程替换的纯解析。此处保留历史报告的只读表象及当前复杂文件系统策略。

### policy.chat-approval.macos.explicit-diff

macos · bash · bash-3.2 · 预期 valid

```text
diff README.md package.json
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：显式文件操作数对照，两个文件都在可读的工作区内。

### policy.chat-approval.macos.loop-unquoted

macos · bash · bash-3.2 · 预期 valid

```text
for f in testsets/*/testset.json; do printf '%s %s\n' "$(basename $f)" "$(grep -m1 'title' $f | awk -F: '{print $2}')"; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：保留未加引号的 glob 循环变量和只读命令替换。词拆分与二次 glob 会影响路径判定。

### policy.chat-approval.macos.loop-quoted

macos · bash · bash-3.2 · 预期 valid

```text
for f in testsets/*/testset.json; do printf '%s %s\n' "$(basename "$f")" "$(grep -m1 'title' "$f" | awk -F: '{print $2}')"; done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：给同一静态循环的文件操作数加引号。匹配项和可读目录符合前提时直接放行。

### policy.chat-approval.macos.loop-command-substitution

macos · bash · bash-3.2 · 预期 valid

```text
for p in $(grep -ohE '\]\(([^)]+)\)' README.md | sort -u); do [ -e "$p" ] && printf '%s\n' "$p"; done
```

### policy.chat-approval.macos.file-command-substitution

macos · bash · bash-3.2 · 预期 valid

```text
file $(command -v fixture-cli) 2>/dev/null; cat README.md
```

### policy.chat-approval.macos.xargs-stat

macos · bash · bash-3.2 · 预期 valid

```text
find . -maxdepth 1 -type f -mtime -30 -print0 2>/dev/null | xargs -0 stat -f "%Sm %z %N" -t "%Y-%m-%d" | sort
```
