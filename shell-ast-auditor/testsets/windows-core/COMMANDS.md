# Windows 核心测试集

108 条 Windows PowerShell 5.1、PowerShell 7.6 与 CMD/Batch 用例，仅声明解析预期。Windows 原生验证待完成。

本文件由 `npm run catalog` 生成，修改命令请编辑同目录 JSONL，不手工维护此目录。

## powershell.jsonl · 66 条

### powershell.pipeline

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem | Where-Object { $_.Length -gt 10 } | Select-Object Name
```

### powershell.nested-scriptblock

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-ChildItem | ForEach-Object { Remove-Item $_ }
```

### powershell.quoted-pipe

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 'a|b' "x|y"
```

### powershell.and-or

windows · powershell · pwsh-7.6 · 预期 valid

```text
a && b || c
```

### powershell.sequence

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date; Get-Location
Write-Output ok
```

### powershell.redirection-a

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git status 2>&1 > out.txt
```

### powershell.redirection-b

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git status > out.txt 2>&1
```

### powershell.all-streams

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Process *> out.txt
```

### powershell.append

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Process >> out.txt
```

### powershell.merge-warning

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Warning x 3>&1
```

### powershell.dynamic

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& $command @args
```

### powershell.literal-invoke

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
& 'C:\Program Files\Tool\tool.exe' -x
```

### powershell.dotsource

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
. '.\env.ps1'; git status
```

### powershell.subexpression

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "result $(Get-Date)"
```

### powershell.array-subexpression

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$a = @(Get-ChildItem; Get-Date); git $a
```

### powershell.splat

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$o = @{Path=".";Recurse=$true}; Get-ChildItem @o
```

### powershell.array

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$a = "x","y"; git $a
```

### powershell.hashtable

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
@{name="x"; data=@(1,2)}
```

### powershell.here-string

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output @'
hello | $(not_a_call)
'@

```

### powershell.here-interpolated

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output @"
hello $(Get-Date)
"@

```

### powershell.function

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
function Test-Probe($x) { Write-Output $x }; Test-Probe hi
```

### powershell.filter

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
filter Test-Probe { $_ | Write-Output }
```

### powershell.if

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
if ($x) { Get-Date } elseif ($y) { Get-Location } else { Write-Output no }
```

### powershell.for

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
for ($i=0; $i -lt 3; $i++) { Write-Output $i }
```

### powershell.foreach

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
foreach ($f in $files) { Get-Content $f }
```

### powershell.while

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
while ($x) { Get-Date; break }
```

### powershell.do-until

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
do { Get-Date } until ($ready)
```

### powershell.switch

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
switch -Regex ($x) { "a|b" { Get-Date } default { Get-Location } }
```

### powershell.try

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
try { Get-Content x } catch { Write-Error $_ } finally { Write-Output done }
```

### powershell.class

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
class Probe { [string] $Name; [string] GetName() { return $this.Name } }
```

### powershell.enum

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
enum Color { Red; Green; Blue }
```

### powershell.param

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
param([string]$Name="a") Write-Output $Name
```

### powershell.using

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
using module ./module.psm1
Get-Date
```

### powershell.requires

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
#Requires -Version 5.1
Get-Date
```

### powershell.member

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$obj.Name
```

### powershell.method

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
$obj.Run()
```

### powershell.static

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[IO.File]::ReadAllText($p)
```

### powershell.cast

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[int]$value
```

### powershell.scriptblock-create

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
[scriptblock]::Create($s).Invoke()
```

### powershell.iex

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
iex $s; git status
```

### powershell.iex-literal

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Invoke-Expression 'Get-Date'
```

### powershell.add-type

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Add-Type -TypeDefinition $code
```

### powershell.stop-parsing

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
tool.exe --% a|b >x
```

### powershell.ternary

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ? "yes" : "no"
```

### powershell.null-coalesce

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ?? "default"
```

### powershell.null-assign

windows · powershell · pwsh-7.6 · 预期 valid

```text
$x ??= "default"
```

### powershell.null-conditional

windows · powershell · pwsh-7.6 · 预期 valid

```text
${x}?.Name
```

### powershell.native-array

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
git @("x","y")
```

### powershell.nested

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell -Command 'Get-Date'
```

### powershell.encoded

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
pwsh -EncodedCommand RwBlAHQALQBEAGEAdABlAA==
```

### powershell.file

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
powershell -File ./script.ps1
```

### powershell.background

windows · powershell · pwsh-7.6 · 预期 valid

```text
Get-Process &
```

### powershell.unicode

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output 中文 😀
```

### powershell.crlf

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date
Write-Output 中文

```

### powershell.smart-dash

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output a –b
```

### powershell.smart-quote

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output “hello”
```

### powershell.escaped

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Write-Output "a`"b"
```

### powershell.empty

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
tool '' ""
```

### powershell.comment

windows · powershell · windows-powershell-5.1 · 预期 valid

```text
Get-Date # ignored | fake
Get-Location
```

### powershell.invalid-quote

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Write-Output 'bad
```

### powershell.invalid-block

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
if ($x) { Get-Date
```

### powershell.invalid-pipe

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
Get-Date |
```

### powershell.invalid-here

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
@'
x

```

### powershell.ps51-and-or

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
a && b || c
```

### powershell.ps51-ternary

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x ? "yes" : "no"
```

### powershell.ps51-null-coalesce

windows · powershell · windows-powershell-5.1 · 预期 invalid

```text
$x ?? "default"
```

## cmd.jsonl · 42 条

### cmd.simple

windows · cmd · cmd-batch · 预期 valid

```text
git status

```

### cmd.pipeline

windows · cmd · cmd-batch · 预期 valid

```text
dir /b | sort | findstr /i txt

```

### cmd.and-or

windows · cmd · cmd-batch · 预期 valid

```text
git status && echo ok || echo fail

```

### cmd.sequence

windows · cmd · cmd-batch · 预期 valid

```text
echo a & echo b

```

### cmd.quoted-pipe

windows · cmd · cmd-batch · 预期 valid

```text
echo "a|b"

```

### cmd.escape

windows · cmd · cmd-batch · 预期 valid

```text
echo a^|b ^& c

```

### cmd.caret-newline

windows · cmd · cmd-batch · 预期 valid

```text
echo hello ^
world

```

### cmd.redirection-a

windows · cmd · cmd-batch · 预期 valid

```text
tool 2>&1 >out

```

### cmd.redirection-b

windows · cmd · cmd-batch · 预期 valid

```text
tool >out 2>&1

```

### cmd.append

windows · cmd · cmd-batch · 预期 valid

```text
tool >>out 2>>err

```

### cmd.group

windows · cmd · cmd-batch · 预期 valid

```text
(echo a & echo b) >out

```

### cmd.if-exist

windows · cmd · cmd-batch · 预期 valid

```text
if exist file.txt (type file.txt) else (echo missing)

```

### cmd.if-errorlevel

windows · cmd · cmd-batch · 预期 valid

```text
if errorlevel 1 echo failed

```

### cmd.if-compare

windows · cmd · cmd-batch · 预期 valid

```text
if /I "%X%"=="hello" echo yes

```

### cmd.for-files

windows · cmd · cmd-batch · 预期 valid

```text
for %%F in (*.txt) do type "%%F"

```

### cmd.for-range

windows · cmd · cmd-batch · 预期 valid

```text
for /L %%i in (1,1,5) do echo %%i

```

### cmd.for-f

windows · cmd · cmd-batch · 预期 valid

```text
for /F "tokens=1,2 delims=," %%a in (data.csv) do echo %%a %%b

```

### cmd.for-f-command

windows · cmd · cmd-batch · 预期 valid

```text
for /F "delims=" %%a in ('dir /b') do echo %%a

```

### cmd.for-usebackq

windows · cmd · cmd-batch · 预期 valid

```text
for /F "usebackq delims=" %%a in (`dir /b`) do echo %%a

```

### cmd.for-recursive

windows · cmd · cmd-batch · 预期 valid

```text
for /R . %%F in (*.go) do echo %%~fF

```

### cmd.call-file

windows · cmd · cmd-batch · 预期 valid

```text
call script.cmd arg

```

### cmd.call-label

windows · cmd · cmd-batch · 预期 valid

```text
call :worker arg
goto :eof
:worker
echo %1

```

### cmd.call-expansion

windows · cmd · cmd-batch · 预期 valid

```text
call echo %%X%%

```

### cmd.goto

windows · cmd · cmd-batch · 预期 valid

```text
goto done
echo skipped
:done
echo done

```

### cmd.set

windows · cmd · cmd-batch · 预期 valid

```text
set "X=a & del x"
echo %X%

```

### cmd.set-arithmetic

windows · cmd · cmd-batch · 预期 valid

```text
set /A x=1+2

```

### cmd.set-prompt

windows · cmd · cmd-batch · 预期 valid

```text
set /P X=Name: 

```

### cmd.setlocal

windows · cmd · cmd-batch · 预期 valid

```text
setlocal enabledelayedexpansion
set X=a
echo !X!
endlocal

```

### cmd.delayed

windows · cmd · cmd-batch · 预期 valid

```text
echo !X!

```

### cmd.percent

windows · cmd · cmd-batch · 预期 valid

```text
echo %PATH% %~dp0 %1 %%i

```

### cmd.parameter-mod

windows · cmd · cmd-batch · 预期 valid

```text
echo %~f1 %~nx1 %~dp0

```

### cmd.variable-slice

windows · cmd · cmd-batch · 预期 valid

```text
echo %X:~0,3% %X:a=b%

```

### cmd.echo-off

windows · cmd · cmd-batch · 预期 valid

```text
@echo off
echo hello

```

### cmd.label

windows · cmd · cmd-batch · 预期 valid

```text
:: comment
:label
echo hi

```

### cmd.exit

windows · cmd · cmd-batch · 预期 valid

```text
exit /b 1

```

### cmd.nested

windows · cmd · cmd-batch · 预期 valid

```text
cmd /d /s /c "echo hello"

```

### cmd.parenthesis-echo

windows · cmd · cmd-batch · 预期 valid

```text
echo hello (world)

```

### cmd.pipe-group

windows · cmd · cmd-batch · 预期 valid

```text
(echo a & echo b) | findstr a

```

### cmd.unicode

windows · cmd · cmd-batch · 预期 valid

```text
echo 中文 😀

```

### cmd.invalid-paren

windows · cmd · cmd-batch · 预期 invalid

```text
(echo a

```

### cmd.invalid-pipe

windows · cmd · cmd-batch · 预期 invalid

```text
echo a |

```

### cmd.no-final-newline

windows · cmd · cmd-batch · 预期 valid

```text
git status
```
