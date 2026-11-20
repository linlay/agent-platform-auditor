# macOS HTTP 取数审批回归

9 条脱敏日志用例与 10 条权限边界对照，覆盖 Bash 管道、curl 默认配置与重定向、动态值、scutil 和 iconv。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## bash.jsonl · 19 条

### policy.http-curl-config-disjoint

macos · bash · bash-3.2 · 预期 valid

```text
HOME=./auditor-fixture-home
CURL_HOME=
XDG_CONFIG_HOME=
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
UT="fixture-token"
echo "--- A: quote probe"
curl -s -4 --max-time 15 -H "User-Agent: $UA" -H "Referer: https://quote-site.example.invalid/" "https://quotes.example.invalid/api/qt/ulist/get?ut=$UT&fltt=2&invt=2&np=1&fields=f1,f2,f3,f4,f12,f13,f14,f124&secids=index-a,index-b,index-c" | head -c 700; echo
echo "--- B: quote probe"
curl -s -4 --max-time 15 -o /tmp/auditor-quote-probe.fixture -w "http=%{http_code} size=%{size_download}\n" -H "User-Agent: $UA" -H "Referer: https://quote-site.example.invalid/" "https://quotes.example.invalid/api/qt/ulist.np/get?ut=$UT&fltt=2&invt=2&np=1&fields=f1,f2,f3,f4,f12,f13,f14,f124&secids=index-a,index-b,index-c"; head -c 700 /tmp/auditor-quote-probe.fixture; echo
echo "--- C: quote probe"
curl -s -4 --max-time 15 -H "User-Agent: $UA" -H "Referer: https://quote-site.example.invalid/" "https://quotes.example.invalid/api/qt/ulist/get?ut=$UT&fltt=2&invt=2&np=1&fields=f2,f3,f4,f12,f13,f14,f124&secids=index-a,index-b,index-c&_=1" | head -c 700; echo
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为已知临时输出与 curl 默认配置候选互不重叠。要求工作区可编辑、无活动 curlrc 或影响调用的 curl 环境配置。

### policy.http-curl-loop-display-slice

macos · bash · bash-3.2 · 预期 valid

```text
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
U="https://quotes.example.invalid/api/qt/ulist.np/get?fltt=2&invt=2&fields=f1,f2,f3,f4,f12,f13,f14,f124&secids=index-a,index-b,index-c"
for H in delay.quotes.example.invalid 2.quotes.example.invalid 3.quotes.example.invalid 6.quotes.example.invalid 7.quotes.example.invalid 8.quotes.example.invalid 9.quotes.example.invalid quotes.example.invalid; do
  printf "%-32s " "$H"
  R=$(curl -s -4 --max-time 12 -H "User-Agent: $UA" -H "Referer: https://quote-site.example.invalid/" "https://$H/api/qt/ulist.np/get?fltt=2&invt=2&fields=f1,f2,f3,f4,f12,f13,f14,f124&secids=index-a,index-b,index-c" 2>/dev/null)
  if [ -z "$R" ]; then echo "EMPTY"; else echo "${R:0:120}"; fi
  sleep 1
done
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为字面主机循环的 GET 逐条审查，命令替换输出只用于判空和双引号内常量边界截取显示。要求无活动 curlrc。

### policy.http-scutil-proxy

macos · bash · bash-3.2 · 预期 valid

```text
ls -la ./.curlrc 2>/dev/null; echo "---"; cat ./.curlrc 2>/dev/null; echo "--- scutil proxy ---"; scutil --proxy 2>/dev/null | head -30
```

精确命令参数预期：`[["scutil","--proxy"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为 macOS 系统 scutil --proxy 可只读查询，curlrc 使用工作区内文件路径审查。

### policy.http-iconv-sector-head

macos · bash · bash-3.2 · 预期 valid

```text
curl -s "https://sectors.example.invalid/q/view/newSinaHy.php" -H "Referer: https://finance.example.invalid/" -H "User-Agent: Mozilla/5.0" | iconv -f GBK -t UTF-8 2>/dev/null | head -c 3000
```

精确命令参数预期：`[["iconv","-f","GBK","-t","UTF-8"],["head","-c","3000"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为只读 HTTP 请求和已核验系统 iconv 的标准输入转码。结果按字节截断，stderr 指向已核验的空设备。要求无活动 curlrc。

### policy.http-iconv-quote-stream

macos · bash · bash-3.2 · 预期 valid

```text
curl -s "https://feed.example.invalid/list=index-a,index-b,index-c" -H "Referer: https://finance.example.invalid/" -H "User-Agent: Mozilla/5.0" | iconv -f GBK -t UTF-8
```

精确命令参数预期：`[["iconv","-f","GBK","-t","UTF-8"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为只读 HTTP 请求接系统 iconv 的标准输入转码。要求无活动 curlrc。

### policy.http-iconv-clean-and-filter

macos · bash · bash-3.2 · 预期 valid

```text
curl -s --max-time 40 "https://finance.example.invalid/" -H "Referer: https://finance.example.invalid/" -H "User-Agent: Mozilla/5.0" | iconv -f UTF-8 -t UTF-8 -c | grep -oE 'href="[^"]*\.shtml"[^>]*>[^<]*(快讯汇总|财经早知道|要闻TOP10|要闻回顾|今日财经热点要闻回顾)[^<]*' | head -20
```

精确命令参数预期：`[["iconv","-f","UTF-8","-t","UTF-8","-c"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：目标预期为已核验系统 iconv 以 -c 清理标准输入，后续 grep 与 head 只处理管道数据。要求无活动 curlrc。

### policy.http-iconv-inline-python

macos · bash · bash-3.2 · 预期 valid

```text
curl -s "https://feed.example.invalid/list=equity-a,equity-b" -H "Referer: https://finance.example.invalid/" -H "User-Agent: Mozilla/5.0" | iconv -f GBK -t UTF-8 | python3 -c "
import sys, re
for line in sys.stdin:
    m = re.search(r'hq_str_(\w+)=\"([^\"]*)\"', line)
    if not m: continue
    code, f = m.group(1), m.group(2).split(',')
    if len(f) < 10: continue
    name, now, pre = f[0], float(f[3]), float(f[2])
    print(f'{name:<10}({code}) 收盘={now:>9.3f} 昨收={pre:>9.3f} 涨跌幅={(now-pre)/pre*100:>+7.2f}% 成交额={float(f[9])/1e8:>7.2f}亿')
"
```

精确命令参数预期：`[["iconv","-f","GBK","-t","UTF-8"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：目标预期为系统 iconv 的标准输入转码直接通过，字面 Python 仍按 Auditor 内置自写代码策略独立判定。桌面试跑的 tools.yml 对该项为 allow。

### policy.http-curl-config-overlap

macos · bash · bash-3.2 · 预期 valid

```text
HOME=./auditor-fixture-home
CURL_HOME=
XDG_CONFIG_HOME=
printf "%s\n" "# auditor fixture" > ./auditor-fixture-home/.curlrc
curl -s https://quotes.example.invalid/market
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：同一段脚本可写入后续 curl 可能加载的默认配置。以可编辑工作区和默认策略预审，仍按未知执行效果处理。

### policy.http-slice-dynamic-output

macos · bash · bash-3.2 · 预期 valid

```text
R=$(curl -q -s https://quotes.example.invalid/market)
printf "%s\n" fixture > "${R:0:120}"
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | auto_approved |

预期依据：截取网络响应后用于重定向路径，目标依赖运行时数据。保留复杂文件效果审批。

### policy.http-scutil-other-mode

macos · bash · bash-3.2 · 预期 valid

```text
scutil --prefs
```

精确命令参数预期：`[["scutil","--prefs"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：系统 scutil 的交互式配置模式缺少只读证明，继续执行保守审查。

### policy.http-iconv-explicit-input

macos · bash · bash-3.2 · 预期 valid

```text
iconv -f GBK -t UTF-8 /auditor-fixture-outside/market.gbk
```

精确命令参数预期：`[["iconv","-f","GBK","-t","UTF-8","/auditor-fixture-outside/market.gbk"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：目标预期为非工作区、非临时根的显式输入走文件读取策略，保留越界读取审批。

### policy.http-curl-upload

macos · bash · bash-3.2 · 预期 valid

```text
curl -q -T /dev/null https://quotes.example.invalid/market
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：首参 -q 关闭默认配置。上传仍按远端修改审查，/dev/null 为系统空设备。

### policy.http-curl-readonly-output

macos · bash · bash-3.2 · 预期 valid

```text
curl -q -o ./auditor-quote-output.fixture https://quotes.example.invalid/market
```

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：首参 -q 关闭默认配置，只读工作区上的 curl 显式输出在三档都必须阻断。

### policy.http-curl-location-stdout

macos · bash · bash-3.2 · 预期 valid

```text
curl -4 -s -L --max-time 25 -H "User-Agent: Mozilla/5.0" -H "Referer: https://quote.example.invalid/" "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-4","-s","-L","--max-time","25","-H","User-Agent: Mozilla/5.0","-H","Referer: https://quote.example.invalid/","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：系统 curl 无外部配置影响时，-L 沿用默认重定向协议，响应输出到 stdout。

### policy.http-curl-location-temp-output

macos · bash · bash-3.2 · 预期 valid

```text
curl -4 -s -L -m 30 -o /tmp/auditor-curl-location.fixture.json -w "http=%{http_code} url=%{url_effective}\n" -H "User-Agent: Mozilla/5.0" -H "Referer: https://quote.example.invalid/" "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-4","-s","-L","-m","30","-o","/tmp/auditor-curl-location.fixture.json","-w","http=%{http_code} url=%{url_effective}\\n","-H","User-Agent: Mozilla/5.0","-H","Referer: https://quote.example.invalid/","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | allow |
| auto_approve | allow |
| full_access | allow |

预期依据：系统 curl 无外部配置影响时，-L 沿用默认重定向协议。响应写入允许的临时根，-w 仅输出状态码与最终 URL。

### policy.http-curl-location-all-protocols

macos · bash · bash-3.2 · 预期 valid

```text
curl -q -L --proto-redir "=all" "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-q","-L","--proto-redir","=all","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：显式开启所有重定向协议，按各档复杂 Shell 策略处理。

### policy.http-curl-location-trusted

macos · bash · bash-3.2 · 预期 valid

```text
curl -q --location-trusted "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-q","--location-trusted","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | auto_approved |
| full_access | allow |

预期依据：允许信任重定向目标的调用继续按各档复杂 Shell 策略处理。

### policy.http-curl-location-upload

macos · bash · bash-3.2 · 预期 valid

```text
curl -q -L -T /dev/null "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-q","-L","-T","/dev/null","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | requires_approval |
| auto_approve | requires_approval |
| full_access | allow |

预期依据：默认重定向可分析，-T 仍是远端写入。ask_for_approval 和 auto_approve 均需人工批准。

### policy.http-curl-location-readonly-output

macos · bash · bash-3.2 · 预期 valid

```text
curl -q -L -o ./auditor-quote-output.fixture "https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"
```

精确命令参数预期：`[["curl","-q","-L","-o","./auditor-quote-output.fixture","https://quotes.example.invalid/api/qt/ulist/get?fields=f2,f3,f124&secids=index-a,index-b"]]`

| 权限档位 | 预期决定 |
| --- | --- |
| ask_for_approval | block |
| auto_approve | block |
| full_access | block |

预期依据：输出文件位于 editing=false 的 Workspace，三档均硬阻断。
