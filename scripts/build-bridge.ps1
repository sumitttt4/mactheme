<#
Builds wsbridge.exe inside upstream/ and deploys it, with the Qt DLLs it
needs, to shell/bridge-bin/ (where the shell finds it in development and
electron-builder picks it up).

    ./scripts/build-bridge.ps1                  # release
    ./scripts/build-bridge.ps1 -Config Debug
    ./scripts/build-bridge.ps1 -All             # every upstream target and its tests too

Qt, Visual Studio: found as upstream's scripts/build.ps1 finds them.
#>
param(
    [ValidateSet('Debug', 'Release')] [string] $Config = 'Release',
    [string] $QtDir = $env:QTDIR,
    [switch] $All
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$upstream = Join-Path $root 'upstream'
if (-not (Test-Path "$upstream\CMakeLists.txt")) { throw 'upstream/ is missing: run ./scripts/setup-upstream.ps1 first' }

if (-not $QtDir -or -not (Test-Path "$QtDir\bin\qmake.exe")) {
    $QtDir = Get-ChildItem 'C:\Qt' -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending |
        ForEach-Object { Join-Path $_.FullName 'msvc2022_64' } | Where-Object { Test-Path "$_\bin\qmake.exe" } | Select-Object -First 1
}
if (-not $QtDir) { throw 'Qt not found. Pass -QtDir C:\Qt\<version>\msvc2022_64' }
$env:QTDIR = $QtDir
Write-Host "Qt:  $QtDir"

if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    $vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $vs) { throw 'Visual Studio with the C++ workload was not found.' }
    $env:PATH = "$(Split-Path $vswhere);$env:PATH"
    Import-Module "$vs\Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
    Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64' | Out-Null
}

$preset = $Config.ToLower()
Push-Location $upstream
try {
    cmake --preset $preset "-DLODE_ROOT=$root"
    if ($LASTEXITCODE) { throw 'configure failed' }
    if ($All) {
        cmake --build --preset $preset
        if ($LASTEXITCODE) { throw 'build failed' }
        ctest --preset $preset --output-on-failure
        if ($LASTEXITCODE) { throw 'upstream tests failed' }
    } else {
        cmake --build --preset $preset --target wsbridge
        if ($LASTEXITCODE) { throw 'build failed' }
    }
} finally {
    Pop-Location
}

$exe = Join-Path $upstream "build\$preset\bridge\wsbridge.exe"
$bin = Join-Path $root 'shell\bridge-bin'
New-Item -ItemType Directory -Force $bin | Out-Null
Copy-Item $exe $bin -Force
& "$QtDir\bin\windeployqt.exe" --no-translations --no-system-d3d-compiler --no-opengl-sw --no-compiler-runtime "$bin\wsbridge.exe"
if ($LASTEXITCODE) { throw 'windeployqt failed' }
Write-Host "wsbridge deployed to $bin"
