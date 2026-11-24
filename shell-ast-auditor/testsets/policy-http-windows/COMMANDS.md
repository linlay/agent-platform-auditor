# HTTP 取数审批回归

10 组 Windows curl.exe 权限场景，分别覆盖 PowerShell 5.1 与 7.6，共 20 条用例。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## powershell.jsonl · 20 条

### policy.http-windows-get-with-header-and-status.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -s -H 'Accept: application/json' --compressed -w 'code=%{http_code} bytes=%{size_download}' -o '.\result.json' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：确认默认 curlrc 配置候选不存在时，只读请求、普通请求头、压缩和状态格式不增加审批。输出是可编辑 Workspace 中的字面文件。

### policy.http-windows-get-with-header-and-status.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -s -H 'Accept: application/json' --compressed -w 'code=%{http_code} bytes=%{size_download}' -o '.\result.json' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：确认默认 curlrc 配置候选不存在时，只读请求、普通请求头、压缩和状态格式不增加审批。输出是可编辑 Workspace 中的字面文件。

### policy.http-windows-header-file-and-response.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -H '@.\request-headers.txt' -D '.\response-headers.txt' 'https://quotes.example.invalid/market'
```

精确命令参数预期：`[["curl.exe","-q","-H","@.\\request-headers.txt","-D",".\\response-headers.txt","https://quotes.example.invalid/market"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：请求头文件走 Workspace 读取权限，响应头文件走 Workspace 写入权限。首参 -q 关闭默认配置。

### policy.http-windows-header-file-and-response.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -H '@.\request-headers.txt' -D '.\response-headers.txt' 'https://quotes.example.invalid/market'
```

精确命令参数预期：`[["curl.exe","-q","-H","@.\\request-headers.txt","-D",".\\response-headers.txt","https://quotes.example.invalid/market"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：请求头文件走 Workspace 读取权限，响应头文件走 Workspace 写入权限。首参 -q 关闭默认配置。

### policy.http-windows-redirect-then-get.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' > '.\snapshot file.txt'; curl.exe -s 'https://quotes.example.invalid/snapshot'
```

精确命令参数预期：`[["curl.exe","-q","-s","https://quotes.example.invalid/market"],["curl.exe","-s","https://quotes.example.invalid/snapshot"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：PowerShell 的字面重定向写到可编辑 Workspace。后续 GET 的默认配置候选不存在，且前序写入与候选路径无关。

### policy.http-windows-redirect-then-get.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' > '.\snapshot file.txt'; curl.exe -s 'https://quotes.example.invalid/snapshot'
```

精确命令参数预期：`[["curl.exe","-q","-s","https://quotes.example.invalid/market"],["curl.exe","-s","https://quotes.example.invalid/snapshot"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：PowerShell 的字面重定向写到可编辑 Workspace。后续 GET 的默认配置候选不存在，且前序写入与候选路径无关。

### policy.http-windows-earlier-curlrc-write.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' -o '.\_curlrc'; curl.exe -s 'https://quotes.example.invalid/snapshot'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Workspace 根作为 cwd 与 curlrc 搜索目录。若 cwd 不是有效的默认配置候选位置，先在 Windows 测试环境把 HOME 指向该根。前序输出可能创建默认配置，后续调用在受限档位需审批。

### policy.http-windows-earlier-curlrc-write.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' -o '.\_curlrc'; curl.exe -s 'https://quotes.example.invalid/snapshot'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Workspace 根作为 cwd 与 curlrc 搜索目录。若 cwd 不是有效的默认配置候选位置，先在 Windows 测试环境把 HOME 指向该根。前序输出可能创建默认配置，后续调用在受限档位需审批。

### policy.http-windows-text-pipeline.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' | Select-String -Pattern fixture | Out-String
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：curl 的标准输出供已核验的 PowerShell 文本处理命令消费，管道没有文件写入。

### policy.http-windows-text-pipeline.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' | Select-String -Pattern fixture | Out-String
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：curl 的标准输出供已核验的 PowerShell 文本处理命令消费，管道没有文件写入。

### policy.http-windows-readonly-append.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' >> '.\report.txt'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：PowerShell 的 >> 是文件写入。editing=false 时即使在全权限档，也禁止向只读 Workspace 追加。

### policy.http-windows-readonly-append.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' >> '.\report.txt'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：PowerShell 的 >> 是文件写入。editing=false 时即使在全权限档，也禁止向只读 Workspace 追加。

### policy.http-windows-outside-header-file.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -H '@..\outside-headers.txt' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：cwd 为 Workspace 根且父目录不属于其它读权限根。请求头文件解析到 Workspace 外，沿用三档越界读策略。

### policy.http-windows-outside-header-file.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -H '@..\outside-headers.txt' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：cwd 为 Workspace 根且父目录不属于其它读权限根。请求头文件解析到 Workspace 外，沿用三档越界读策略。

### policy.http-windows-upload.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -T '.\input.txt' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Workspace 内的上传源文件允许读。上传另外命中远端修改规则，按需审批与自动审批档均要求人工确认。

### policy.http-windows-upload.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -T '.\input.txt' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：Workspace 内的上传源文件允许读。上传另外命中远端修改规则，按需审批与自动审批档均要求人工确认。

### policy.http-windows-readonly-write-out-format.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -w '%output{.\report.txt}%{http_code}' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：write-out 的文件指令有写入效果，作用于只读 Workspace 时三档都阻断。

### policy.http-windows-readonly-write-out-format.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -w '%output{.\report.txt}%{http_code}' 'https://quotes.example.invalid/market'
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：write-out 的文件指令有写入效果，作用于只读 Workspace 时三档都阻断。

### policy.http-windows-dynamic-redirect.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' > "$env:AUDITOR_OUTPUT"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：输出路径依赖运行时环境，受限档位继续要求人工审查。全权限预审保留未知语义。

### policy.http-windows-dynamic-redirect.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
curl.exe -q -s 'https://quotes.example.invalid/market' > "$env:AUDITOR_OUTPUT"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：输出路径依赖运行时环境，受限档位继续要求人工审查。全权限预审保留未知语义。
