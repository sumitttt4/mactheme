$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$brightness = $null
try { $b = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop | Select-Object -First 1; if ($null -ne $b) { $brightness = [int]$b.CurrentBrightness } } catch {}
$wifi = 'Open Wi-Fi settings'
try {
  $adapter = Get-NetAdapter -Physical -ErrorAction Stop | Where-Object { $_.NdisPhysicalMedium -eq 9 -or $_.PhysicalMediaType -eq 'Native 802.11' } | Select-Object -First 1
  if ($null -ne $adapter) { $wifi = if ($adapter.Status -eq 'Up') { 'Connected' } else { [string]$adapter.Status } }
} catch {}
$bluetooth = 'Open Bluetooth settings'
try {
  $radios = @(Get-PnpDevice -Class Bluetooth -PresentOnly -ErrorAction Stop | Where-Object { $_.InstanceId -match '^USB\\|^PCI\\' })
  if ($radios.Count -gt 0) { $bluetooth = if (@($radios | Where-Object Status -eq 'OK').Count -gt 0) { 'Adapter available' } else { 'Adapter unavailable' } }
} catch {}
@{brightness=$brightness;wifi=$wifi;bluetooth=$bluetooth} | ConvertTo-Json -Compress
