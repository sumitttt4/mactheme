<#
Phase 0, step 1: what is installed. Read-only: it installs and changes nothing.
    ./scripts/check-toolchain.ps1
#>
$ErrorActionPreference = 'Continue'
function Report($name, $ok, $detail) {
    $mark = if ($ok) { '[ok]  ' } else { '[--]  ' }
    Write-Host ("{0}{1,-26} {2}" -f $mark, $name, $detail)
}

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vs = if (Test-Path $vswhere) { & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath } else { $null }
Report 'Visual Studio C++ tools' ([bool]$vs) ($(if ($vs) { $vs } else { 'needs "Desktop development with C++" (VS 2022)' }))

$qt = Get-ChildItem 'C:\Qt' -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending |
    ForEach-Object { Join-Path $_.FullName 'msvc2022_64' } | Where-Object { Test-Path "$_\bin\qmake.exe" } | Select-Object -First 1
if ($env:QTDIR -and (Test-Path "$env:QTDIR\bin\qmake.exe")) { $qt = $env:QTDIR }
$qtVersion = if ($qt) { (Split-Path (Split-Path $qt -Parent) -Leaf) } else { $null }
Report 'Qt msvc2022_64 (6.8+)' ($qtVersion -and [version]$qtVersion -ge [version]'6.8.0') ($(if ($qt) { $qt } else { 'not under C:\Qt and no QTDIR' }))

foreach ($tool in @(
        @{ Name = 'CMake (3.25+)'; Cmd = 'cmake'; Args = '--version'; Min = '3.25' },
        @{ Name = 'Ninja'; Cmd = 'ninja'; Args = '--version'; Min = $null },
        @{ Name = 'Node.js LTS'; Cmd = 'node'; Args = '--version'; Min = '22.0' },
        @{ Name = 'Git'; Cmd = 'git'; Args = '--version'; Min = $null })) {
    $cmd = Get-Command $tool.Cmd -ErrorAction SilentlyContinue
    if (-not $cmd) { Report $tool.Name $false 'not on PATH'; continue }
    $text = (& $tool.Cmd $tool.Args 2>$null | Select-Object -First 1)
    $ok = $true
    if ($tool.Min -and $text -match '(\d+\.\d+)') { $ok = [version]$Matches[1] -ge [version]$tool.Min }
    Report $tool.Name $ok $text
}

$inno = Test-Path "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
Report 'Inno Setup 6.5+ (later)' $inno ($(if ($inno) { 'found' } else { 'only needed for packaging' }))

$svc = Get-Service -Name 'WinShun' -ErrorAction SilentlyContinue
Report 'Stock WinShun service' ([bool]$svc) ($(if ($svc) { "installed, $($svc.Status)" } else { 'not installed' }))
