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

# Samla alla capabilities-nycklar
$allCaps = New-Object System.Collections.Generic.HashSet[string]
foreach ($d in $devices) {
    if ($d.capabilities) {
        foreach ($c in $d.capabilities) { [void]$allCaps.Add($c) }
    }
}

$capList = $allCaps | Sort-Object

# Skapa mapp för CSV om den inte finns
$outDir = Split-Path -Path $OutCsv -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function Escape-Value([string] $v) {
    if ($null -eq $v) { return "" }
    $s = [string]$v
    $s = $s -replace '"', '""'
    if ($s -match '[;"\n\r]') { return '"' + $s + '"' }
    return $s
}

# Skriv header
$header = @('DeviceName') + ($capList)
$headerLine = ($header -join ';')
Set-Content -Path $OutCsv -Value $headerLine -Encoding UTF8

# Skriv rader
foreach ($d in $devices) {
    $row = @()
    $row += Escape-Value($d.name)
    foreach ($cap in $capList) {
        $val = ""
        if ($d.capabilitiesObj) {
            $prop = $d.capabilitiesObj.PSObject.Properties | Where-Object { $_.Name -eq $cap } | Select-Object -First 1
            if ($prop) { $val = $prop.Value.value }
        }
        $row += Escape-Value($val)
    }
    $line = ($row -join ';')
    Add-Content -Path $OutCsv -Value $line -Encoding UTF8
}

Write-Host "CSV skapad: $OutCsv" -ForegroundColor Green
