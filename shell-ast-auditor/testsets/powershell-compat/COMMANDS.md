# Windows PowerShell 双版本扩展测试集

105 组相同输入 × Windows PowerShell 5.1 / PowerShell 7.6，共 210 条。覆盖引用、参数、管道、控制流、定义、动态调用、表达式、版本差异与错误语法。仅声明文档推导的解析预期，Windows 原生验证待完成。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## cases.jsonl · 210 条

### powershell.compat.single-quote-escape.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 'it''s a literal | & ; $(Get-Date)'
```

### powershell.compat.single-quote-escape.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output 'it''s a literal | & ; $(Get-Date)'
```

### powershell.compat.double-quote-literal-dollar.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "`$HOME and `$(Get-Date)"
```

### powershell.compat.double-quote-literal-dollar.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output "`$HOME and `$(Get-Date)"
```

### powershell.compat.interpolation-braced.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "${name}:$($items[0].Name)"
```

### powershell.compat.interpolation-braced.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output "${name}:$($items[0].Name)"
```

### powershell.compat.newline-tab-escape.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "first`nsecond`tend"
```

### powershell.compat.newline-tab-escape.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output "first`nsecond`tend"
```

### powershell.compat.backtick-continuation.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem `
 -LiteralPath .
```

### powershell.compat.backtick-continuation.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem `
 -LiteralPath .
```

### powershell.compat.line-comment-literal.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output '# not a comment' # actual comment
Get-Date
```

### powershell.compat.line-comment-literal.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output '# not a comment' # actual comment
Get-Date
```

### powershell.compat.block-comment.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
<# | & $(Remove-Item x) #>
Get-Date
```

### powershell.compat.block-comment.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
<# | & $(Remove-Item x) #>
Get-Date
```

### powershell.compat.nested-block-comment.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
<# outer <# inner #> outer #> Get-Date
```

### powershell.compat.nested-block-comment.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
<# outer <# inner #> outer #> Get-Date
```

### powershell.compat.literal-here-string.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$s = @'
$(Get-Date) | & ; "quoted"
'@
Write-Output $s
```

### powershell.compat.literal-here-string.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$s = @'
$(Get-Date) | & ; "quoted"
'@
Write-Output $s
```

### powershell.compat.expandable-here-string.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$s = @"
$($env:TEMP)
$(Get-Date)
"@
Write-Output $s
```

### powershell.compat.expandable-here-string.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$s = @"
$($env:TEMP)
$(Get-Date)
"@
Write-Output $s
```

### powershell.compat.unicode-variable.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
${问候} = "你好😀"; Write-Output ${问候}
```

### powershell.compat.unicode-variable.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
${问候} = "你好😀"; Write-Output ${问候}
```

### powershell.compat.escaped-metacharacters.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output a`|b a`;b a`&b
```

### powershell.compat.escaped-metacharacters.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output a`|b a`;b a`&b
```

### powershell.compat.crlf-continuation.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output `
 "hello"

```

### powershell.compat.crlf-continuation.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output `
 "hello"

```

### powershell.compat.literal-double-quotes.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 'say "hello"'
```

### powershell.compat.literal-double-quotes.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output 'say "hello"'
```

### powershell.compat.literal-wildcard-path.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Item -LiteralPath 'C:\work\[draft]\a.txt'
```

### powershell.compat.literal-wildcard-path.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Item -LiteralPath 'C:\work\[draft]\a.txt'
```

### powershell.compat.unc-path.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem -LiteralPath '\\server\share name\folder'
```

### powershell.compat.unc-path.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem -LiteralPath '\\server\share name\folder'
```

### powershell.compat.env-drive-path.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem -LiteralPath $env:TEMP
```

### powershell.compat.env-drive-path.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem -LiteralPath $env:TEMP
```

### powershell.compat.registry-provider.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ItemProperty -LiteralPath 'HKCU:\Software\AuditorFixture'
```

### powershell.compat.registry-provider.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ItemProperty -LiteralPath 'HKCU:\Software\AuditorFixture'
```

### powershell.compat.native-empty-arguments.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\argv-probe.exe' 'before' '' 'after'
```

### powershell.compat.native-empty-arguments.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\argv-probe.exe' 'before' '' 'after'
```

### powershell.compat.native-spaces-quotes.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\argv-probe.exe' 'a b' 'a"b' 'C:\tail\'
```

### powershell.compat.native-spaces-quotes.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\argv-probe.exe' 'a b' 'a"b' 'C:\tail\'
```

### powershell.compat.native-comma.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\argv-probe.exe' one,two
```

### powershell.compat.native-comma.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\argv-probe.exe' one,two
```

### powershell.compat.stop-parsing-env.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
.\argv-probe.exe --% %TEMP% | echo literal > ignored.txt
```

### powershell.compat.stop-parsing-env.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
.\argv-probe.exe --% %TEMP% | echo literal > ignored.txt
```

### powershell.compat.stop-parsing-newline.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
.\argv-probe.exe --% a|b
Get-Date
```

### powershell.compat.stop-parsing-newline.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
.\argv-probe.exe --% a|b
Get-Date
```

### powershell.compat.end-parameters.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output -- -LiteralParameter
```

### powershell.compat.end-parameters.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output -- -LiteralParameter
```

### powershell.compat.switch-false.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Remove-Item -LiteralPath '.\fixture.txt' -Confirm:$false -WhatIf
```

### powershell.compat.switch-false.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Remove-Item -LiteralPath '.\fixture.txt' -Confirm:$false -WhatIf
```

### powershell.compat.native-argument-mode.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$PSNativeCommandArgumentPassing = 'Legacy'; & '.\argv-probe.exe' 'a"b'
```

### powershell.compat.native-argument-mode.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$PSNativeCommandArgumentPassing = 'Legacy'; & '.\argv-probe.exe' 'a"b'
```

### powershell.compat.multiline-pipeline.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem |
 Sort-Object Name |
 Select-Object -First 2
```

### powershell.compat.multiline-pipeline.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem |
 Sort-Object Name |
 Select-Object -First 2
```

### powershell.compat.pipeline-scriptblock.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
1..3 | ForEach-Object { Write-Output ($_ * 2) }
```

### powershell.compat.pipeline-scriptblock.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
1..3 | ForEach-Object { Write-Output ($_ * 2) }
```

### powershell.compat.assignment-pipeline.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$items = Get-ChildItem | Sort-Object Name
```

### powershell.compat.assignment-pipeline.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$items = Get-ChildItem | Sort-Object Name
```

### powershell.compat.parenthesized-command.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
(Get-ChildItem -File).Count
```

### powershell.compat.parenthesized-command.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
(Get-ChildItem -File).Count
```

### powershell.compat.stream-merge-order.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\tool.exe' 2>&1 | Select-String error
```

### powershell.compat.stream-merge-order.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\tool.exe' 2>&1 | Select-String error
```

### powershell.compat.all-streams-append.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& '.\tool.exe' *>> '.\all.log'
```

### powershell.compat.all-streams-append.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& '.\tool.exe' *>> '.\all.log'
```

### powershell.compat.stream-null.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Information message 6> $null
```

### powershell.compat.stream-null.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Information message 6> $null
```

### powershell.compat.stream-file-spaces.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Error message 2> '.\error log.txt'
```

### powershell.compat.stream-file-spaces.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Error message 2> '.\error log.txt'
```

### powershell.compat.stream-verbose-debug.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Verbose message 4>&1 5>&1
```

### powershell.compat.stream-verbose-debug.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Verbose message 4>&1 5>&1
```

### powershell.compat.tee-pipeline.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date | Tee-Object -FilePath '.\date.txt' | Out-String
```

### powershell.compat.tee-pipeline.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Date | Tee-Object -FilePath '.\date.txt' | Out-String
```

### powershell.compat.if-command-condition.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
if (Test-Path -LiteralPath '.\fixture') { Get-Item '.\fixture' } else { Write-Output missing }
```

### powershell.compat.if-command-condition.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
if (Test-Path -LiteralPath '.\fixture') { Get-Item '.\fixture' } else { Write-Output missing }
```

### powershell.compat.for-continue.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
for ($i=0; $i -lt 4; $i++) { if ($i -eq 2) { continue }; Write-Output $i }
```

### powershell.compat.for-continue.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
for ($i=0; $i -lt 4; $i++) { if ($i -eq 2) { continue }; Write-Output $i }
```

### powershell.compat.foreach-array.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
foreach ($item in @('a','b')) { Write-Output $item }
```

### powershell.compat.foreach-array.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
foreach ($item in @('a','b')) { Write-Output $item }
```

### powershell.compat.labelled-break.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
:outer foreach ($x in 1..3) { foreach ($y in 1..3) { break outer } }
```

### powershell.compat.labelled-break.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
:outer foreach ($x in 1..3) { foreach ($y in 1..3) { break outer } }
```

### powershell.compat.do-while.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$i=0; do { $i++; Write-Output $i } while ($i -lt 2)
```

### powershell.compat.do-while.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$i=0; do { $i++; Write-Output $i } while ($i -lt 2)
```

### powershell.compat.switch-wildcard.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
switch -Wildcard ($name) { '*.txt' { Write-Output text; break } default { Write-Output other } }
```

### powershell.compat.switch-wildcard.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
switch -Wildcard ($name) { '*.txt' { Write-Output text; break } default { Write-Output other } }
```

### powershell.compat.switch-file.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
switch -File '.\fixture.txt' { 'yes' { Write-Output accepted } }
```

### powershell.compat.switch-file.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
switch -File '.\fixture.txt' { 'yes' { Write-Output accepted } }
```

### powershell.compat.typed-catch.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
try { Get-Item missing -ErrorAction Stop } catch [System.IO.IOException] { Write-Output io } catch { Write-Output other }
```

### powershell.compat.typed-catch.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
try { Get-Item missing -ErrorAction Stop } catch [System.IO.IOException] { Write-Output io } catch { Write-Output other }
```

### powershell.compat.trap-continue.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
trap { Write-Output trapped; continue }; Get-Item missing
```

### powershell.compat.trap-continue.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
trap { Write-Output trapped; continue }; Get-Item missing
```

### powershell.compat.throw-finally.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
try { throw 'fixture error' } finally { Write-Output cleanup }
```

### powershell.compat.throw-finally.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
try { throw 'fixture error' } finally { Write-Output cleanup }
```

### powershell.compat.advanced-function.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Get-Fixture { [CmdletBinding()] param([Parameter(Mandatory=$true)][string]$Name) process { Write-Output $Name } }; Get-Fixture -Name sample
```

### powershell.compat.advanced-function.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function Get-Fixture { [CmdletBinding()] param([Parameter(Mandatory=$true)][string]$Name) process { Write-Output $Name } }; Get-Fixture -Name sample
```

### powershell.compat.pipeline-function.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Get-Fixture { param([Parameter(ValueFromPipeline=$true)]$InputObject) begin { $n=0 } process { $n++ } end { Write-Output $n } }; 1,2 | Get-Fixture
```

### powershell.compat.pipeline-function.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function Get-Fixture { param([Parameter(ValueFromPipeline=$true)]$InputObject) begin { $n=0 } process { $n++ } end { Write-Output $n } }; 1,2 | Get-Fixture
```

### powershell.compat.validated-function.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Get-Fixture { param([ValidateSet('a','b')][string]$Mode='a') Write-Output $Mode }; Get-Fixture b
```

### powershell.compat.validated-function.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function Get-Fixture { param([ValidateSet('a','b')][string]$Mode='a') Write-Output $Mode }; Get-Fixture b
```

### powershell.compat.remaining-arguments.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Get-Fixture { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest) Write-Output $Rest }; Get-Fixture a b
```

### powershell.compat.remaining-arguments.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function Get-Fixture { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest) Write-Output $Rest }; Get-Fixture a b
```

### powershell.compat.supports-shouldprocess.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Remove-Fixture { [CmdletBinding(SupportsShouldProcess=$true)] param([string]$Path) if ($PSCmdlet.ShouldProcess($Path)) { Remove-Item -LiteralPath $Path } }; Remove-Fixture x -WhatIf
```

### powershell.compat.supports-shouldprocess.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function Remove-Fixture { [CmdletBinding(SupportsShouldProcess=$true)] param([string]$Path) if ($PSCmdlet.ShouldProcess($Path)) { Remove-Item -LiteralPath $Path } }; Remove-Fixture x -WhatIf
```

### powershell.compat.script-param.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[CmdletBinding()] param([string]$Path='.',[switch]$Force) Get-Item -LiteralPath $Path
```

### powershell.compat.script-param.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
[CmdletBinding()] param([string]$Path='.',[switch]$Force) Get-Item -LiteralPath $Path
```

### powershell.compat.function-scope.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function script:Get-Fixture { Write-Output $script:value }; Get-Fixture
```

### powershell.compat.function-scope.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
function script:Get-Fixture { Write-Output $script:value }; Get-Fixture
```

### powershell.compat.filter-return.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
filter Select-Fixture { if ($_ -gt 1) { return $_ } }; 1..3 | Select-Fixture
```

### powershell.compat.filter-return.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
filter Select-Fixture { if ($_ -gt 1) { return $_ } }; 1..3 | Select-Fixture
```

### powershell.compat.class-constructor.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
class Fixture { [string]$Name; Fixture([string]$name) { $this.Name=$name } }; [Fixture]::new('a')
```

### powershell.compat.class-constructor.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
class Fixture { [string]$Name; Fixture([string]$name) { $this.Name=$name } }; [Fixture]::new('a')
```

### powershell.compat.enum-flags.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[Flags()] enum FixtureFlag { None=0; Read=1; Write=2 }; [FixtureFlag]::Read
```

### powershell.compat.enum-flags.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
[Flags()] enum FixtureFlag { None=0; Read=1; Write=2 }; [FixtureFlag]::Read
```

### powershell.compat.scriptblock-invoke.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& { param($x) Write-Output $x } 'sample'
```

### powershell.compat.scriptblock-invoke.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
& { param($x) Write-Output $x } 'sample'
```

### powershell.compat.scriptblock-dot-source.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
. { $script:fixture = 1 }; Write-Output $script:fixture
```

### powershell.compat.scriptblock-dot-source.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
. { $script:fixture = 1 }; Write-Output $script:fixture
```

### powershell.compat.computed-command.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$verb='Get'; & ($verb + '-Date')
```

### powershell.compat.computed-command.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$verb='Get'; & ($verb + '-Date')
```

### powershell.compat.scriptblock-variable.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$action = { Get-Date }; & $action
```

### powershell.compat.scriptblock-variable.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$action = { Get-Date }; & $action
```

### powershell.compat.splat-hashtable.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$params=@{LiteralPath='.';Force=$true}; Get-ChildItem @params
```

### powershell.compat.splat-hashtable.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$params=@{LiteralPath='.';Force=$true}; Get-ChildItem @params
```

### powershell.compat.splat-array.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$argsList=@('status','--short'); & git @argsList
```

### powershell.compat.splat-array.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$argsList=@('status','--short'); & git @argsList
```

### powershell.compat.nested-pwsh-command.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh.exe -NoLogo -NoProfile -NonInteractive -Command 'Get-Date; Get-Location'
```

### powershell.compat.nested-pwsh-command.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
pwsh.exe -NoLogo -NoProfile -NonInteractive -Command 'Get-Date; Get-Location'
```

### powershell.compat.nested-ps-file.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell.exe -NoProfile -File '.\script with spaces.ps1' -Name 'a b'
```

### powershell.compat.nested-ps-file.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
powershell.exe -NoProfile -File '.\script with spaces.ps1' -Name 'a b'
```

### powershell.compat.nested-cmd.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
cmd.exe /d /s /c 'echo a & echo b'
```

### powershell.compat.nested-cmd.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
cmd.exe /d /s /c 'echo a & echo b'
```

### powershell.compat.process-argument-list.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Start-Process -FilePath '.\tool.exe' -ArgumentList @('a b','c') -Wait
```

### powershell.compat.process-argument-list.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Start-Process -FilePath '.\tool.exe' -ArgumentList @('a b','c') -Wait
```

### powershell.compat.job-scriptblock.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Start-Job -ScriptBlock { param($p) Get-Item -LiteralPath $p } -ArgumentList '.'
```

### powershell.compat.job-scriptblock.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Start-Job -ScriptBlock { param($p) Get-Item -LiteralPath $p } -ArgumentList '.'
```

### powershell.compat.remote-scriptblock.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-Command -ComputerName localhost -ScriptBlock { Get-Item -LiteralPath $using:path }
```

### powershell.compat.remote-scriptblock.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Invoke-Command -ComputerName localhost -ScriptBlock { Get-Item -LiteralPath $using:path }
```

### powershell.compat.ordered-hashtable.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$x=[ordered]@{Name='fixture';Count=2}; $x['Name']
```

### powershell.compat.ordered-hashtable.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x=[ordered]@{Name='fixture';Count=2}; $x['Name']
```

### powershell.compat.custom-object.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$x=[pscustomobject]@{Name='fixture';Items=@(1,2)}; $x.Items[0]
```

### powershell.compat.custom-object.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x=[pscustomobject]@{Name='fixture';Items=@(1,2)}; $x.Items[0]
```

### powershell.compat.array-slice.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$items=@('a','b','c'); $items[0,2]
```

### powershell.compat.array-slice.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$items=@('a','b','c'); $items[0,2]
```

### powershell.compat.unary-comma.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$items=,@(1,2); Write-Output $items
```

### powershell.compat.unary-comma.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$items=,@(1,2); Write-Output $items
```

### powershell.compat.format-operator.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output ('{0}:{1}' -f 'fixture',2)
```

### powershell.compat.format-operator.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output ('{0}:{1}' -f 'fixture',2)
```

### powershell.compat.regex-replace.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output ('a1b2' -replace '\d','x')
```

### powershell.compat.regex-replace.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output ('a1b2' -replace '\d','x')
```

### powershell.compat.split-join.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output (('a,b' -split ',') -join '|')
```

### powershell.compat.split-join.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output (('a,b' -split ',') -join '|')
```

### powershell.compat.type-operators.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$value='42'; ($value -as [int]) -is [int]
```

### powershell.compat.type-operators.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$value='42'; ($value -as [int]) -is [int]
```

### powershell.compat.comparison-logical.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
($x -in 1,2,3) -and ($name -notlike 'temp*')
```

### powershell.compat.comparison-logical.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
($x -in 1,2,3) -and ($name -notlike 'temp*')
```

### powershell.compat.bitwise-shift.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output ((3 -shl 2) -band 15)
```

### powershell.compat.bitwise-shift.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output ((3 -shl 2) -band 15)
```

### powershell.compat.subexpression-statements.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output $(Get-Date; Get-Location)
```

### powershell.compat.subexpression-statements.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output $(Get-Date; Get-Location)
```

### powershell.compat.assignment-output.ps51

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
($x = 1 + 2) | Write-Output
```

### powershell.compat.assignment-output.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
($x = 1 + 2) | Write-Output
```

### powershell.compat.chain-and.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date && Get-Location
```

### powershell.compat.chain-and.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Date && Get-Location
```

### powershell.compat.chain-or.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Item missing || Write-Output fallback
```

### powershell.compat.chain-or.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Item missing || Write-Output fallback
```

### powershell.compat.chain-mixed.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date && Get-Location || Write-Output fallback
```

### powershell.compat.chain-mixed.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Date && Get-Location || Write-Output fallback
```

### powershell.compat.ternary-in-argument.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output ($ok ? 'yes' : 'no')
```

### powershell.compat.ternary-in-argument.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output ($ok ? 'yes' : 'no')
```

### powershell.compat.coalesce-in-argument.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output ($value ?? 'fallback')
```

### powershell.compat.coalesce-in-argument.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Write-Output ($value ?? 'fallback')
```

### powershell.compat.coalesce-assignment.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$config.Path ??= '.\default'; Write-Output $config.Path
```

### powershell.compat.coalesce-assignment.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
$config.Path ??= '.\default'; Write-Output $config.Path
```

### powershell.compat.null-member.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
${record}?.Name | Write-Output
```

### powershell.compat.null-member.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
${record}?.Name | Write-Output
```

### powershell.compat.null-index.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
${items}?[0] | Write-Output
```

### powershell.compat.null-index.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
${items}?[0] | Write-Output
```

### powershell.compat.background-sequence.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date &
Get-Location
```

### powershell.compat.background-sequence.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Date &
Get-Location
```

### powershell.compat.leading-pipe.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-ChildItem
 | Sort-Object Name
```

### powershell.compat.leading-pipe.ps76

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-ChildItem
 | Sort-Object Name
```

### powershell.compat.unclosed-double-quote.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output "unterminated
```

### powershell.compat.unclosed-double-quote.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
Write-Output "unterminated
```

### powershell.compat.unclosed-subexpression.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output $(Get-Date
```

### powershell.compat.unclosed-subexpression.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
Write-Output $(Get-Date
```

### powershell.compat.unclosed-array.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$items = @(1,2
```

### powershell.compat.unclosed-array.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$items = @(1,2
```

### powershell.compat.unclosed-hashtable.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$config = @{Name='fixture'
```

### powershell.compat.unclosed-hashtable.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$config = @{Name='fixture'
```

### powershell.compat.unclosed-index.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$items[0
```

### powershell.compat.unclosed-index.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$items[0
```

### powershell.compat.missing-condition.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
if () { Get-Date }
```

### powershell.compat.missing-condition.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
if () { Get-Date }
```

### powershell.compat.missing-foreach-in.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
foreach ($x 1..3) { Get-Date }
```

### powershell.compat.missing-foreach-in.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
foreach ($x 1..3) { Get-Date }
```

### powershell.compat.missing-assignment-value.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x =
```

### powershell.compat.missing-assignment-value.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$x =
```

### powershell.compat.missing-pipe-target.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date | # no target

```

### powershell.compat.missing-pipe-target.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
Get-Date | # no target

```

### powershell.compat.missing-redirect-target.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date 2>
```

### powershell.compat.missing-redirect-target.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
Get-Date 2>
```

### powershell.compat.missing-param-close.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
param([string]$Name
Get-Date
```

### powershell.compat.missing-param-close.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
param([string]$Name
Get-Date
```

### powershell.compat.missing-try-handler.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
try { Get-Date }
```

### powershell.compat.missing-try-handler.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
try { Get-Date }
```

### powershell.compat.here-string-header-content.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$s = @'content
'@
```

### powershell.compat.here-string-header-content.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$s = @'content
'@
```

### powershell.compat.unterminated-block-comment.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date <# never closed
```

### powershell.compat.unterminated-block-comment.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
Get-Date <# never closed
```

### powershell.compat.dangling-binary-operator.ps51

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x = 1 +
```

### powershell.compat.dangling-binary-operator.ps76

windows · powershell · pwsh-7.6 · 预期 invalid

```text
$x = 1 +
```
