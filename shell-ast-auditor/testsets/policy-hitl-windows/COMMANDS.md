# HITL 命令审批回归

收录 Windows HITL 审批命令、对照用例、文本处理和文件名筛选回归。PowerShell 5.1 和 7.6 各 43 条，共 86 条。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## powershell.jsonl · 86 条

### policy.hitl-windows.a1-r2-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& ".\chat-fixture\map_images.ps1" -DocPath ".\chat-fixture\awcp_x\word\document.xml" -RelsPath ".\chat-fixture\awcp_x\word\_rels\document.xml.rels"
```

### policy.hitl-windows.a1-r2-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& ".\chat-fixture\map_images.ps1" -DocPath ".\chat-fixture\awcp_x\word\document.xml" -RelsPath ".\chat-fixture\awcp_x\word\_rels\document.xml.rels"
```

### policy.hitl-windows.a1-r5-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& ".\chat-fixture\dump_docx.ps1" -Path ".\chat-fixture\awcp_x\word\document.xml"
```

### policy.hitl-windows.a1-r5-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& ".\chat-fixture\dump_docx.ps1" -Path ".\chat-fixture\awcp_x\word\document.xml"
```

### policy.hitl-windows.a1-r7-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -File ".\chat-fixture\dump_docx.ps1" -Path ".\chat-fixture\awcp_x\word\document.xml"
```

### policy.hitl-windows.a1-r7-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -File ".\chat-fixture\dump_docx.ps1" -Path ".\chat-fixture\awcp_x\word\document.xml"
```

### policy.hitl-windows.a1-r11-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\chat-fixture\scripts\extract-docx2.ps1' -Path '.\chat-fixture\awcp.docx' -MediaOut '.\chat-fixture\media'
```

### policy.hitl-windows.a1-r11-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\chat-fixture\scripts\extract-docx2.ps1' -Path '.\chat-fixture\awcp.docx' -MediaOut '.\chat-fixture\media'
```

### policy.hitl-windows.a1-r13-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\chat-fixture\scripts\extract-docx.ps1' -Path '.\chat-fixture\awcp.docx'
```

### policy.hitl-windows.a1-r13-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File '.\chat-fixture\scripts\extract-docx.ps1' -Path '.\chat-fixture\awcp.docx'
```

### policy.hitl-windows.a2-r2-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git -C ".\示例仓库" log --oneline -20
```

精确命令参数预期：`[["git","-C",".\\示例仓库","log","--oneline","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r2-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git -C ".\示例仓库" log --oneline -20
```

精确命令参数预期：`[["git","-C",".\\示例仓库","log","--oneline","-20"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r2-i2.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
go version
```

精确命令参数预期：`[["go","version"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 Windows PowerShell 原生 CLI 审查未登记 go。Go 自动选择工具链可能执行其他 Go 程序。

### policy.hitl-windows.a2-r2-i2.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
go version
```

精确命令参数预期：`[["go","version"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 Windows PowerShell 原生 CLI 审查未登记 go。Go 自动选择工具链可能执行其他 Go 程序。

### policy.hitl-windows.a2-r2-i3.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git -C ".\示例仓库" status --short
```

精确命令参数预期：`[["git","-C",".\\示例仓库","status","--short"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r2-i3.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git -C ".\示例仓库" status --short
```

精确命令参数预期：`[["git","-C",".\\示例仓库","status","--short"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git status -sb
```

精确命令参数预期：`[["git","status","-sb"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git status -sb
```

精确命令参数预期：`[["git","status","-sb"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i2.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git branch -vv
```

精确命令参数预期：`[["git","branch","-vv"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i2.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git branch -vv
```

精确命令参数预期：`[["git","branch","-vv"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i3.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git log -5 --oneline --decorate
```

精确命令参数预期：`[["git","log","-5","--oneline","--decorate"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i3.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git log -5 --oneline --decorate
```

精确命令参数预期：`[["git","log","-5","--oneline","--decorate"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i4.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git stash list
```

精确命令参数预期：`[["git","stash","list"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r3-i4.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git stash list
```

精确命令参数预期：`[["git","stash","list"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r4-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git log --oneline -n 30
```

精确命令参数预期：`[["git","log","--oneline","-n","30"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r4-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git log --oneline -n 30
```

精确命令参数预期：`[["git","log","--oneline","-n","30"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.a2-r16-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell -NoProfile -Command "$r=Invoke-WebRequest -Uri 'https://feed.example.invalid/list=sh000001,sz399001,sz399006' -Headers @{Referer='https://finance.example.invalid'} -UseBasicParsing; [System.Text.Encoding]::GetEncoding('GB18030').GetString($r.RawContentStream.ToArray())"
```

### policy.hitl-windows.a2-r16-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
powershell -NoProfile -Command "$r=Invoke-WebRequest -Uri 'https://feed.example.invalid/list=sh000001,sz399001,sz399006' -Headers @{Referer='https://finance.example.invalid'} -UseBasicParsing; [System.Text.Encoding]::GetEncoding('GB18030').GetString($r.RawContentStream.ToArray())"
```

### policy.hitl-windows.a2-r18-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -s --max-time 25 -H "Referer: https://finance.example.invalid" -H "User-Agent: Mozilla/5.0" "https://feed.example.invalid/list=s_sh000001,s_sz399001,s_sz399006,s_sh000300,s_sh000688,s_sz399905"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.a2-r18-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -s --max-time 25 -H "Referer: https://finance.example.invalid" -H "User-Agent: Mozilla/5.0" "https://feed.example.invalid/list=s_sh000001,s_sz399001,s_sz399006,s_sh000300,s_sh000688,s_sz399905"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.a2-r29-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=sz399006,sz399106,s_sz399106,sz399005" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r29-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=sz399006,sz399106,s_sz399106,sz399005" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r30-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-WebRequest -Uri "https://market.example.invalid/api/qt/ulist.np/get?fields=f2,f3,f4,f6,f12,f14,f124&secids=1.000001,0.399001,0.399006" -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r30-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Invoke-WebRequest -Uri "https://market.example.invalid/api/qt/ulist.np/get?fields=f2,f3,f4,f6,f12,f14,f124&secids=1.000001,0.399001,0.399006" -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r31-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$r = Invoke-WebRequest -Uri "https://quotes.example.invalid/q=sh000001" -UseBasicParsing -TimeoutSec 20; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $r.Content
```

### policy.hitl-windows.a2-r31-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$r = Invoke-WebRequest -Uri "https://quotes.example.invalid/q=sh000001" -UseBasicParsing -TimeoutSec 20; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $r.Content
```

### policy.hitl-windows.a2-r33-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Resolve-DnsName bridge.example.invalid -ErrorAction Continue
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Resolve-DnsName 语义。

### policy.hitl-windows.a2-r33-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Resolve-DnsName bridge.example.invalid -ErrorAction Continue
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Resolve-DnsName 语义。

### policy.hitl-windows.a2-r42-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=s_sh000001,s_sz399001,s_sz399006" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r42-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=s_sh000001,s_sz399001,s_sz399006" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r45-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
python3 -c 'pass'
```

精确命令参数预期：`[["python3","-c","pass"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：已核验解释器和字面代码使用独立自写策略。Auditor 空配置使用 Go 内置 hitl/auto/allow，显式加载当前 tools.yml 时按需审批档的该项为 allow。

### policy.hitl-windows.a2-r45-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
python3 -c 'pass'
```

精确命令参数预期：`[["python3","-c","pass"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：已核验解释器和字面代码使用独立自写策略。Auditor 空配置使用 Go 内置 hitl/auto/allow，显式加载当前 tools.yml 时按需审批档的该项为 allow。

### policy.hitl-windows.a2-r48-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl -sS -o NUL -D - --max-time 20 https://bridge.example.invalid/mcp
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：裸 curl 的身份可能是 PowerShell 别名，当前精确审查要求 curl.exe。

### policy.hitl-windows.a2-r48-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl -sS -o NUL -D - --max-time 20 https://bridge.example.invalid/mcp
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：裸 curl 的身份可能是 PowerShell 别名，当前精确审查要求 curl.exe。

### policy.hitl-windows.a2-r52-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -s -o NUL -w "%{http_code} sitemap=%{size_download}\n" https://site.example.invalid/sitemap.xml
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Windows NUL 目前不进入已核验 curl 的普通文件输出子集。

### policy.hitl-windows.a2-r52-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -s -o NUL -w "%{http_code} sitemap=%{size_download}\n" https://site.example.invalid/sitemap.xml
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Windows NUL 目前不进入已核验 curl 的普通文件输出子集。

### policy.hitl-windows.a2-r54-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=sh000001,sz399001,sz399006" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r54-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Invoke-WebRequest -Uri "https://feed.example.invalid/list=sh000001,sz399001,sz399006" -Headers @{"Referer"="https://finance.example.invalid/"} -UseBasicParsing | Select-Object -ExpandProperty Content
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查未登记 Invoke-WebRequest 语义。

### policy.hitl-windows.a2-r77-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl -s -i https://site.example.invalid/mcp
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：裸 curl 的身份可能是 PowerShell 别名，当前精确审查要求 curl.exe。

### policy.hitl-windows.a2-r77-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl -s -i https://site.example.invalid/mcp
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：裸 curl 的身份可能是 PowerShell 别名，当前精确审查要求 curl.exe。

### policy.hitl-windows.a2-r85-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File ".\chat-fixture\extract_docx_media.ps1" -Path ".\chat-fixture\awcp.docx" -OutDir ".\chat-fixture\media"
```

### policy.hitl-windows.a2-r85-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File ".\chat-fixture\extract_docx_media.ps1" -Path ".\chat-fixture\awcp.docx" -OutDir ".\chat-fixture\media"
```

### policy.hitl-windows.a2-r89-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -File '.\chat-fixture\em_collect.ps1'
```

### policy.hitl-windows.a2-r89-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -File '.\chat-fixture\em_collect.ps1'
```

### policy.hitl-windows.a2-r91-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\chat-fixture\A7_verify.ps1'
```

### policy.hitl-windows.a2-r91-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\chat-fixture\A7_verify.ps1'
```

### policy.hitl-windows.a2-r92-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File ".\chat-fixture\read_docx.ps1" -Path ".\chat-fixture\awcp.docx" -Out ".\chat-fixture\awcp.txt"
```

### policy.hitl-windows.a2-r92-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -ExecutionPolicy Bypass -File ".\chat-fixture\read_docx.ps1" -Path ".\chat-fixture\awcp.docx" -Out ".\chat-fixture\awcp.txt"
```

### policy.hitl-windows.a2-r95-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\chat-fixture\A7_ks_detail.ps1'
```

### policy.hitl-windows.a2-r95-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\chat-fixture\A7_ks_detail.ps1'
```

### policy.hitl-windows.a2-r97-i1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -NoProfile -File '.\chat-fixture\em_idx_retry.ps1'
```

### policy.hitl-windows.a2-r97-i1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh -NoProfile -File '.\chat-fixture\em_idx_retry.ps1'
```

### policy.hitl-windows.control-1.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git --no-optional-locks status -sb
```

精确命令参数预期：`[["git","--no-optional-locks","status","-sb"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.control-1.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
git --no-optional-locks status -sb
```

精确命令参数预期：`[["git","--no-optional-locks","status","-sb"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：普通可编辑测试工作区、匹配启动快照的 Git、可核验的仓库配置且无执行型依赖。status 额外核验索引写入，--no-optional-locks 对照按只读检查。

### policy.hitl-windows.control-2.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -sSI 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.control-2.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -sSI 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.control-3.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -sS -o '.\response.txt' -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.control-3.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -sS -o '.\response.txt' -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 curl.exe，HTTP GET 与普通请求头。缺省配置用例须确认无活动 curlrc，且无额外 TLS 和 curl 环境覆盖。

### policy.hitl-windows.control-4.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -sS -o NUL -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查尚未把这个响应体丢弃参数建模，须保留保守预审结果。

### policy.hitl-windows.control-4.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -sS -o NUL -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查尚未把这个响应体丢弃参数建模，须保留保守预审结果。

### policy.hitl-windows.control-5.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -sS --out-null -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查尚未把这个响应体丢弃参数建模，须保留保守预审结果。

### policy.hitl-windows.control-5.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -sS --out-null -w '%{http_code}' 'https://site.example.invalid/'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：当前 PowerShell 审查尚未把这个响应体丢弃参数建模，须保留保守预审结果。

### policy.hitl-windows.control-6.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
nslookup.exe bridge.example.invalid
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 nslookup.exe 的非交互式普通域名查询。

### policy.hitl-windows.control-6.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
nslookup.exe bridge.example.invalid
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：已核验 nslookup.exe 的非交互式普通域名查询。

### policy.hitl-windows.text-data-local-length-and-line-count.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; $length = $body.Length; Write-Output "Hits=$hits"; Write-Output "Length=$length"; Write-Output "Rows=$($rows.Count)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：Desktop 5.1、匹配的 Host 启动合同及可读测试工作区。静态局部变量中的单文件路径走 LiteralPath 读取审查，后续仅处理已证明的文本和计数。

### policy.hitl-windows.text-data-local-length-and-line-count.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; $length = $body.Length; Write-Output "Hits=$hits"; Write-Output "Length=$length"; Write-Output "Rows=$($rows.Count)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Core 7.4+ 当前将这类赋值与文本表达式交给未知语义审批。仅在实际执行审查的 Host 为受支持的 pwsh.exe 时比较三档预期，默认运行只检查语法。

### policy.hitl-windows.text-data-interpolated-length.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; Write-Output "Hits=$hits"; Write-Output "Length=$($body.Length)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：Desktop 5.1、匹配的 Host 启动合同及可读测试工作区。静态局部变量中的单文件路径走 LiteralPath 读取审查，后续仅处理已证明的文本和计数。

### policy.hitl-windows.text-data-interpolated-length.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; Write-Output "Hits=$hits"; Write-Output "Length=$($body.Length)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Core 7.4+ 当前将这类赋值与文本表达式交给未知语义审批。仅在实际执行审查的 Host 为受支持的 pwsh.exe 时比较三档预期，默认运行只检查语法。

### policy.hitl-windows.text-data-literal-regex-replace.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; Write-Output "Hits=$hits"; Write-Output "Length=$($body.Length)"; Write-Output "NoSpace=$((($body -replace '\s','')).Length)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：Desktop 5.1、匹配的 Host 启动合同及可读测试工作区。静态局部变量中的单文件路径走 LiteralPath 读取审查，后续仅处理已证明的文本和计数。

### policy.hitl-windows.text-data-literal-regex-replace.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$file = ".\chat-fixture\sample [text].txt"; $rows = Get-Content -LiteralPath $file -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }; $body = ($rows -join ''); $hits = ([regex]::Matches($body, '[\u4e00-\u9fff]')).Count; Write-Output "Hits=$hits"; Write-Output "Length=$($body.Length)"; Write-Output "NoSpace=$((($body -replace '\s','')).Length)"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Core 7.4+ 当前将这类赋值与文本表达式交给未知语义审批。仅在实际执行审查的 Host 为受支持的 pwsh.exe 时比较三档预期，默认运行只检查语法。

### policy.hitl-windows.filename-literal-eq.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -eq '.kbx' } | Select-Object Mode,FullName | Format-Table -AutoSize
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：核验本地工作目录的递归枚举及读权限，按字面等值筛选已枚举项目的 Name，再显式投影 Mode 和 FullName。使用 Desktop 5.1 的 Host 启动合同及默认权限配置。

### policy.hitl-windows.filename-literal-eq.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -eq '.kbx' } | Select-Object Mode,FullName | Format-Table -AutoSize
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：核验本地工作目录的递归枚举及读权限，按字面等值筛选已枚举项目的 Name，再显式投影 Mode 和 FullName。使用受支持的 Core Host 启动合同进行权限预审，默认仅检查语法。

### policy.hitl-windows.filename-literal-like.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -like '*kbx*' } | Select-Object Mode,FullName | Format-Table -AutoSize; Write-Output 'search-done'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：核验本地工作目录的递归枚举及读权限，按字面通配筛选已枚举项目的 Name，显式投影后执行独立的字面输出。使用 Desktop 5.1 的 Host 启动合同及默认权限配置。

### policy.hitl-windows.filename-literal-like.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -like '*kbx*' } | Select-Object Mode,FullName | Format-Table -AutoSize; Write-Output 'search-done'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：核验本地工作目录的递归枚举及读权限，按字面通配筛选已枚举项目的 Name，显式投影后执行独立的字面输出。使用受支持的 Core Host 启动合同进行权限预审，默认仅检查语法。

### policy.hitl-windows.filename-dynamic-predicate.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -eq $candidate } | Select-Object Mode,FullName | Format-Table -AutoSize
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：比较操作数来自未经证明的变量，按需审批和自动审批档仍须人工。全权访问按默认未知语义策略处理。使用 Desktop 5.1 的 Host 启动合同及默认权限配置。

### policy.hitl-windows.filename-dynamic-predicate.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem -LiteralPath '.' -Force -Recurse | Where-Object { $_.Name -eq $candidate } | Select-Object Mode,FullName | Format-Table -AutoSize
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：比较操作数来自未经证明的变量，按需审批和自动审批档仍须人工。全权访问按默认未知语义策略处理。使用受支持的 Core Host 启动合同进行权限预审，默认仅检查语法。
