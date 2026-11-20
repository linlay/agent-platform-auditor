# macOS SQLite CLI 审批回归

13 条用例覆盖 SQLite schema、目录权限、备份和不透明调用。使用 Apple /usr/bin/sqlite3、默认权限、独立的 Workspace 及没有 SQLite 启动脚本的测试环境。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 13 条

### policy.sqlite-schema

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 "auditor-kanban.db" ".schema issue"
```

精确命令参数预期：`[["sqlite3","auditor-kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：复现原命令的 argv 形状。默认可建库，所涉路径位于可编辑 Workspace 和系统临时目录。

### policy.sqlite-absolute-readonly

macos · bash · bash-3.2 · 预期 valid

```text
/usr/bin/sqlite3 -readonly auditor-kanban.db ".schema issue"
```

精确命令参数预期：`[["/usr/bin/sqlite3","-readonly","auditor-kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：绝对路径与受信系统入口一致。回滚模式的干净库使用显式只读打开。

### policy.sqlite-default-open-readonly-workspace

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 auditor-kanban.db ".schema issue"
```

精确命令参数预期：`[["sqlite3","auditor-kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：默认打开可写，Workspace 的只读能力阻止主库及日志写入。

### policy.sqlite-read-outside

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 -readonly "/sqlite-auditor-outside/kanban.db" ".schema issue"
```

精确命令参数预期：`[["sqlite3","-readonly","/sqlite-auditor-outside/kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：显式只读调用命中读权限根之外的数据库路径。

### policy.sqlite-default-open-outside

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 "/sqlite-auditor-outside/kanban.db" ".schema issue"
```

精确命令参数预期：`[["sqlite3","/sqlite-auditor-outside/kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认打开可建库或更新日志，命中写权限根之外的数据库路径。

### policy.sqlite-backup

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 -readonly auditor-kanban.db ".backup auditor-copy.db"
```

精确命令参数预期：`[["sqlite3","-readonly","auditor-kanban.db",".backup auditor-copy.db"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：源库显式只读，备份目标及其日志按 Workspace 写入审查。

### policy.sqlite-backup-readonly-workspace

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 -readonly auditor-kanban.db ".backup auditor-copy.db"
```

精确命令参数预期：`[["sqlite3","-readonly","auditor-kanban.db",".backup auditor-copy.db"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：源库的只读标志不改变备份目标的写入效果。

### policy.sqlite-sql-write

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 auditor-kanban.db "UPDATE issue SET status=1;"
```

精确命令参数预期：`[["sqlite3","auditor-kanban.db","UPDATE issue SET status=1;"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：任意 SQL 的触发器、扩展和间接文件效果没有静态证明。

### policy.sqlite-stdin

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 auditor-kanban.db < auditor-input.sql
```

精确命令参数预期：`[["sqlite3","auditor-kanban.db"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：重定向提供的 SQL 或点命令可改变数据库及外围文件。

### policy.sqlite-multiple-commands

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 auditor-kanban.db ".output auditor-copy.txt" ".schema issue"
```

精确命令参数预期：`[["sqlite3","auditor-kanban.db",".output auditor-copy.txt",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：前一个点命令重定向后续输出，不能按单条 schema 查询审查。

### policy.sqlite-uri

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 "file:auditor-kanban.db?mode=ro" ".schema issue"
```

精确命令参数预期：`[["sqlite3","file:auditor-kanban.db?mode=ro",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：URI 参数会改变 SQLite 打开行为，保留不透明分类。

### policy.sqlite-init

macos · bash · bash-3.2 · 预期 valid

```text
sqlite3 -init auditor-input.sql auditor-kanban.db ".schema issue"
```

精确命令参数预期：`[["sqlite3","-init","auditor-input.sql","auditor-kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：启动文件可以在 schema 命令之前执行任意 SQL 或点命令。

### policy.sqlite-legacy

macos · bash · bash-3.2 · 预期 valid

```text
sqlite auditor-kanban.db ".schema issue"
```

精确命令参数预期：`[["sqlite","auditor-kanban.db",".schema issue"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：sqlite 名称不能证明 Apple SQLite 3 CLI 身份。
