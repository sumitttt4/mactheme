<#
Makes the local WinShun clone the bridge is built in: upstream/ (git-ignored),
pinned to the commit the brief was written against, with the one-line
CMake hook applied (patches/, FORK-NOTES.md) on a local branch.

    ./scripts/setup-upstream.ps1

Nothing is pushed anywhere: the clone's push URL is disabled.
#>
param([string] $Commit = '8a90cc2343fc800cde1194aa7b4b9491e32852b2')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$upstream = Join-Path $root 'upstream'

if (-not (Test-Path $upstream)) {
    git clone https://github.com/LingCore/WinShun.git $upstream
    if ($LASTEXITCODE) { throw 'clone failed' }
}
Push-Location $upstream
try {
    git remote set-url --push origin DISABLED-no-push
    $dirty = git status --porcelain
    if ($dirty) { throw "upstream/ has local changes; commit or stash them first" }
    git fetch origin $Commit
    git checkout -B quarry-local $Commit
    if ($LASTEXITCODE) { throw "cannot check out $Commit" }
    foreach ($patch in Get-ChildItem (Join-Path $root 'patches') -Filter '*.patch' | Sort-Object Name) {
        git apply --check $patch.FullName
        if ($LASTEXITCODE) { throw "patch does not apply: $($patch.Name)" }
        git apply $patch.FullName
        git add -A
        git -c user.name=quarry -c user.email=quarry@localhost commit -q -m "quarry: $($patch.BaseName)"
        Write-Host "applied $($patch.Name)"
    }
    Write-Host "upstream/ is at $Commit plus the patches, on branch quarry-local"
} finally {
    Pop-Location
}
