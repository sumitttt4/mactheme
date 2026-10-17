param([ValidateRange(0,100)][int]$Value)
$ErrorActionPreference='Stop'
$monitors = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop)
if ($monitors.Count -eq 0) { throw 'This display does not support WMI brightness. Open Windows display settings.' }
foreach ($m in $monitors) { $result = Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{Timeout=[uint32]0;Brightness=[byte]$Value}; if ($result.ReturnValue -ne 0) { throw 'Windows rejected the brightness change.' } }
