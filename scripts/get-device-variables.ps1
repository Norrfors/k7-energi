param(
    [string] $DeviceName = 'Pulse Krokgatan 7'
)

# Läs .env från backend
$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\backend\.env" | Resolve-Path -ErrorAction Stop
$lines = Get-Content -Path $envPath
$env = @{}
foreach ($line in $lines) {
    if ($line.Trim().StartsWith('#') -or [string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split '=', 2
    if ($parts.Length -eq 2) { $env[$parts[0].Trim()] = $parts[1].Trim() }
}

if (-not $env.HOMEY_ADDRESS) { Write-Error "HOMEY_ADDRESS saknas i backend/.env"; exit 1 }
if (-not $env.HOMEY_TOKEN) { Write-Error "HOMEY_TOKEN saknas i backend/.env"; exit 1 }

$homey = $env.HOMEY_ADDRESS.TrimEnd('/')
$token = $env.HOMEY_TOKEN

Write-Host "Anropar Homey på: $homey" -ForegroundColor Cyan

try {
    $resp = Invoke-RestMethod -Uri "$homey/api/manager/devices/device/" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing
} catch {
    Write-Error "Fel vid anrop mot Homey: $($_.Exception.Message)"
    exit 2
}

# Convert response (object with deviceId keys) to array of device objects
$devices = @()
foreach ($p in $resp.PSObject.Properties) { $devices += $p.Value }

$device = $devices | Where-Object { $_.name -eq $DeviceName -or $_.name -like "*$DeviceName*" -or $_.id -eq $DeviceName } | Select-Object -First 1

if (-not $device) {
    Write-Host "Enhet med namn/id '$DeviceName' hittades ej. Tillgängliga enheter (namn):" -ForegroundColor Yellow
    $devices | ForEach-Object { Write-Host "- $($_.name) (id: $($_.id))" }
    exit 3
}

Write-Host "Enhet hittad:" -ForegroundColor Green
Write-Host "  Name: $($device.name)" -ForegroundColor Green
Write-Host "  Id:   $($device.id)" -ForegroundColor Green
Write-Host "  Zone: $($device.zoneName)`n"

Write-Host "Capabilities:`n" -ForegroundColor Cyan
foreach ($cap in $device.capabilities) { Write-Host "- $cap" }

Write-Host "`nCapability values:`n" -ForegroundColor Cyan
if ($device.capabilitiesObj) {
    foreach ($prop in $device.capabilitiesObj.PSObject.Properties) {
        $name = $prop.Name
        $val = $prop.Value.value
        $updated = $prop.Value.lastUpdated
        Write-Host "${name}:`n  value: ${val}`n  lastUpdated: ${updated}`n"
    }
} else {
    Write-Host "Inga capability-värden tillgängliga" -ForegroundColor Yellow
}

Write-Host "Slutfört." -ForegroundColor Green
