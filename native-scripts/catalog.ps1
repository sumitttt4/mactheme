$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
$shell = New-Object -ComObject WScript.Shell
$roots = @([Environment]::GetFolderPath('StartMenu'), [Environment]::GetFolderPath('CommonStartMenu'))
$seen = @{}
$apps = [System.Collections.Generic.List[object]]::new()
foreach ($root in $roots) {
  if (!(Test-Path -LiteralPath $root)) { continue }
  foreach ($f in Get-ChildItem -LiteralPath $root -Filter *.lnk -Recurse -ErrorAction SilentlyContinue) {
    try {
      $link = $shell.CreateShortcut($f.FullName)
      $target = $link.TargetPath
      if (!$target -or !(Test-Path -LiteralPath $target) -or $target -notmatch '\.exe$') { continue }
      $key = $target.ToLowerInvariant() + '|' + $link.Arguments
      if ($seen.ContainsKey($key)) { continue }; $seen[$key] = $true
      $iconData = $null
      try {
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($target)
        if ($null -ne $icon) {
          $bitmap = $icon.ToBitmap(); $stream = [IO.MemoryStream]::new()
          try { $bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png); $iconData = 'data:image/png;base64,'+[Convert]::ToBase64String($stream.ToArray()) }
          finally { $stream.Dispose(); $bitmap.Dispose(); $icon.Dispose() }
        }
      } catch {}
      $apps.Add([pscustomobject]@{id=$f.FullName;name=$f.BaseName;target=$f.FullName;executable=$target;icon=$iconData})
    } catch {}
  }
}
# Store apps are indexed as documented application user model IDs. Launching uses AppsFolder.
foreach ($a in Get-StartApps -ErrorAction SilentlyContinue) {
  if ($a.AppID -notmatch '!') { continue }
  $apps.Add([pscustomobject]@{id='aumid:'+$a.AppID;name=$a.Name;target=$a.AppID;executable='';icon=$null})
}
@($apps | Sort-Object name | Select-Object -First 1000) | ConvertTo-Json -Depth 4 -Compress
