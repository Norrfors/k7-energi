param(
    [string] $OutCsv = "data/homey_devices.csv"
)

Set-StrictMode -Version Latest

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

# Konvertera objekt till array
$devices = @()
foreach ($p in $resp.PSObject.Properties) { $devices += $p.Value }

if ($devices.Count -eq 0) { Write-Host "Inga enheter hittades"; exit 0 }


# Hitta max antal capabilities för någon enhet
$maxCaps = ($devices | ForEach-Object { $_.capabilities.Count }) | Measure-Object -Maximum | Select-Object -ExpandProperty Maximum

# Bygg header: DeviceName;var1;var2;...
$header = @('DeviceName')
for ($i = 1; $i -le $maxCaps; $i++) { $header += "var$i" }
$headerLine = ($header -join ';')

# Skapa mapp för CSV om den inte finns
$outDir = Split-Path -Path $OutCsv -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Set-Content -Path $OutCsv -Value $headerLine -Encoding UTF8

# Skriv rader: DeviceName;cap1;cap2;...
foreach ($d in $devices) {
    $row = @()
    $row += $d.name
    if ($d.capabilities) {
        $row += $d.capabilities[0..($d.capabilities.Count-1)]
    }
    # Fyll ut med tomma kolumner om färre capabilities än max
    while ($row.Count -lt ($maxCaps+1)) { $row += "" }
    $line = ($row -join ';')
    Add-Content -Path $OutCsv -Value $line -Encoding UTF8
}

Write-Host "CSV skapad: $OutCsv" -ForegroundColor Green
