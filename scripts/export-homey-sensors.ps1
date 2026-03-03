# =============================================================================
# export-homey-sensors.ps1
# Exporterar alla Homey-enheter till en detaljerad CSV (semikolon-separerat)
# Kor fran projektroten: .\scripts\export-homey-sensors.ps1
# Sparar till: data\homey-sensorer.csv  (oppnas direkt i Excel)
# =============================================================================

param(
    [string]$UtfilCSV = "data\homey-sensorer.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Las konfiguration fran backend/.env
# ---------------------------------------------------------------------------
$envPath = Join-Path $PSScriptRoot "..\backend\.env"
if (-not (Test-Path $envPath)) {
    Write-Error "Hittade inte backend\.env pa: $envPath"
    exit 1
}

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) { $envVars[$parts[0].Trim()] = $parts[1].Trim() }
    }
}

if (-not $envVars['HOMEY_ADDRESS']) { Write-Error "HOMEY_ADDRESS saknas i backend/.env"; exit 1 }
if (-not $envVars['HOMEY_TOKEN'])   { Write-Error "HOMEY_TOKEN saknas i backend/.env";   exit 1 }

$homeyRaw = $envVars['HOMEY_ADDRESS'].TrimEnd('/')
$token    = $envVars['HOMEY_TOKEN']
$headers  = @{ Authorization = "Bearer $token" }

# For lokalt natverk: byt https till http om adressen ar en privat IP
# (Homey Pro har self-signed cert som PowerShell 5.x inte accepterar)
if ($homeyRaw -match '^https://(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)') {
    $homey = $homeyRaw -replace '^https://', 'http://'
    Write-Host "  (anvander http:// for lokalt natverk)" -ForegroundColor DarkGray
} else {
    $homey = $homeyRaw
}

# TLS-fallback ifall https andvands
[Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "Ansluter till Homey: $homey" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 2. Hamta alla zoner - bygg UUID -> zon-objekt med namn och parent
# ---------------------------------------------------------------------------
Write-Host "Hamtar zoner..." -ForegroundColor Gray
$zonKarta  = @{}   # id -> namn
$zonParent = @{}   # id -> parent-id
try {
    $zonesResp = Invoke-RestMethod -Uri "$homey/api/manager/zones/zone/" -Headers $headers -UseBasicParsing
    $zonesResp.PSObject.Properties | ForEach-Object {
        $z = $_.Value
        if ($z.id -and $z.name) {
            $zonKarta[$z.id]  = $z.name
            $zonParent[$z.id] = if ($z.parent) { $z.parent } else { $null }
        }
    }
    Write-Host "  $($zonKarta.Count) zoner hittade" -ForegroundColor Gray
} catch {
    Write-Warning "Kunde inte hamta zoner: $($_.Exception.Message) - ZonNamn blir tomt"
}

# Bygg fullstandig zonestig: "Bottenvaning / Altan norr / KlotRad-3"
function Get-ZonStig($zonId) {
    if (-not $zonId -or -not $zonKarta.ContainsKey($zonId)) { return '' }
    $delar = @()
    $curr  = $zonId
    $skydd = 0
    while ($curr -and $zonKarta.ContainsKey($curr) -and $skydd -lt 10) {
        $delar = @($zonKarta[$curr]) + $delar
        $curr  = $zonParent[$curr]
        $skydd++
    }
    return ($delar -join ' / ')
}

# ---------------------------------------------------------------------------
# 3. Hamta alla enheter
# ---------------------------------------------------------------------------
Write-Host "Hamtar enheter..." -ForegroundColor Gray
$devicesResp = Invoke-RestMethod -Uri "$homey/api/manager/devices/device/" -Headers $headers -UseBasicParsing

$enheter = @()
$devicesResp.PSObject.Properties | ForEach-Object { $enheter += $_.Value }
Write-Host "  $($enheter.Count) enheter hittade" -ForegroundColor Gray

# ---------------------------------------------------------------------------
# 4. Capability-karta: Homey-nyckel -> CSV-kolumnnamn
#    Liknande capabilities hamnar i samma kolumn
# ---------------------------------------------------------------------------
$capKolumner = [ordered]@{
    # Temperatur och klimat
    'measure_temperature'     = 'Temperatur_C'
    'outdoorTemperature'      = 'Temperatur_C'
    'measure_humidity'        = 'Fuktighet_pct'
    'measure_pressure'        = 'Lufttryck_hPa'
    'measure_co2'             = 'CO2_ppm'
    'measure_pm25'            = 'PM25_ugm3'
    'measure_noise'           = 'Ljud_dB'
    'measure_luminance'       = 'Ljus_lux'
    # Vader
    'measure_wind_strength'   = 'Vind_ms'
    'measure_wind_angle'      = 'Vindriktning_grader'
    'measure_gust_strength'   = 'Vindby_ms'
    'measure_rain'            = 'Regn_mmh'
    'measure_ultraviolet'     = 'UV_index'
    # Batteri
    'measure_battery'         = 'Batteri_pct'
    'alarm_battery'           = 'Batteri_alarm'
    # El och energi
    'measure_power'           = 'Effekt_W'
    'measure_voltage'         = 'Spanning_V'
    'measure_current'         = 'Strom_A'
    'meter_power'             = 'Energi_kWh_totalt'
    'meter_power.today'       = 'Energi_idag_kWh'
    'meter_power.lastHour'    = 'Energi_senaste_timme_kWh'
    'meter_power.quarterHour' = 'Energi_15min_kWh'
    'meter_power.lastMonth'   = 'Energi_forramanad_kWh'
    'accumulatedCost'         = 'Kostnad_kr'
    # Switchar och larm
    'onoff'                   = 'Pa_av'
    'dim'                     = 'Dimmer_pct'
    'alarm_motion'            = 'Rorselsedetektor'
    'alarm_contact'           = 'Kontakt_oppnad'
    'alarm_tamper'            = 'Sabotage_alarm'
    'alarm_smoke'             = 'Rok_alarm'
    'alarm_co'                = 'Kolmonoxid_alarm'
    'alarm_water'             = 'Vatten_alarm'
    'alarm_heat'              = 'Varme_alarm'
    # Ljus
    'light_hue'               = 'Ljusfarg_hue'
    'light_saturation'        = 'Ljusfarg_saturation'
    'light_temperature'       = 'Ljustemp_K'
    'light_mode'              = 'Ljuslage'
}

# Alla unika kolumnnamn (ordning bevaras)
$alleKolumnNamn = $capKolumner.Values | Select-Object -Unique

# ---------------------------------------------------------------------------
# 5. Ga igenom alla enheter och bygg rader
# ---------------------------------------------------------------------------
Write-Host "Bygger CSV-rader..." -ForegroundColor Gray

$rader             = @()
$okandaCaps        = [System.Collections.Generic.HashSet[string]]::new()

foreach ($enhet in $enheter) {
    $homeyId  = $enhet.id
    $namn     = $enhet.name
    $klass    = $enhet.class
    $driver   = if ($enhet.driverUri) { ($enhet.driverUri -split ':')[-1] } else { '' }
    $zonId    = $enhet.zone
    $zonNamn  = if ($zonId -and $zonKarta.ContainsKey($zonId)) { $zonKarta[$zonId] } else { '' }
    $zonStig  = Get-ZonStig $zonId
    $capLista = if ($enhet.capabilities) { ($enhet.capabilities -join '; ') } else { '' }

    # Senast uppdaterad = nyaste lastUpdated bland alla capabilities
    # Homey returnerar Unix-ms (t.ex. 1772467960824) - konvertera till lасbart datum
    $senastUppdaterad = ''
    if ($enhet.capabilitiesObj) {
        $ts = @()
        $enhet.capabilitiesObj.PSObject.Properties | ForEach-Object {
            if ($_.Value.lastUpdated) { $ts += [long]$_.Value.lastUpdated }
        }
        if ($ts.Count -gt 0) {
            $newestMs = ($ts | Sort-Object -Descending | Select-Object -First 1)
            $senastUppdaterad = [DateTimeOffset]::FromUnixTimeMilliseconds($newestMs).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss')
        }
    }

    # Bygg radhashtabell
    $rad = [ordered]@{
        HomeyID           = $homeyId
        Namn              = $namn
        Klass             = $klass
        Driver            = $driver
        ZonID             = $zonId
        ZonNamn           = $zonNamn
        ZonStig           = $zonStig
        Senast_uppdaterad = $senastUppdaterad
        Capabilities      = $capLista
    }

    # Fyll alla capability-kolumner med tomt som default
    foreach ($kolNamn in $alleKolumnNamn) {
        $rad[$kolNamn] = ''
    }

    # Fyll in kanda capability-varden
    if ($enhet.capabilitiesObj) {
        $enhet.capabilitiesObj.PSObject.Properties | ForEach-Object {
            $capNyckel = $_.Name
            $capVarde  = $_.Value.value

            if ($capKolumner.Contains($capNyckel)) {
                $kolNamn = $capKolumner[$capNyckel]
                # Skriv bara om kolumnen ar tom (flera caps kan mappa till samma kolumn)
                if ($rad[$kolNamn] -eq '') {
                    $rad[$kolNamn] = if ($null -ne $capVarde) { "$capVarde" } else { '' }
                }
            } else {
                [void]$okandaCaps.Add($capNyckel)
            }
        }
    }

    $rader += [PSCustomObject]$rad
}

# ---------------------------------------------------------------------------
# 6. Spara CSV med semikolon och UTF-8 BOM (Excel oppnar direkt)
# ---------------------------------------------------------------------------
$utDir = Split-Path $UtfilCSV -Parent
if ($utDir -and -not (Test-Path $utDir)) {
    New-Item -ItemType Directory -Path $utDir | Out-Null
}

$csvRader = @()

# Rubrikrad
$huvud    = ($rader[0].PSObject.Properties.Name) -join ';'
$csvRader += $huvud

# Datarader
foreach ($rad in $rader) {
    $falt = $rad.PSObject.Properties.Value | ForEach-Object {
        $v = if ($null -ne $_) { "$_" } else { '' }
        $v = $v -replace '"', '""'
        if ($v -match '[;"\n]') { "`"$v`"" } else { $v }
    }
    $csvRader += ($falt -join ';')
}

# Skriv med UTF-8 BOM sa att Excel hanterar svenska tecken
$utf8Bom  = New-Object System.Text.UTF8Encoding $true
$fullPath = (Resolve-Path $utDir).Path + "\" + (Split-Path $UtfilCSV -Leaf)
$sparadTill = $fullPath
try {
    [System.IO.File]::WriteAllLines($fullPath, $csvRader, $utf8Bom)
} catch [System.IO.IOException] {
    # Filen ar last (t.ex. oppnad i Excel eller synkas av OneDrive) - spara med tidsstampel
    $sparadTill = $fullPath -replace '\.csv$', "-$(Get-Date -Format 'yyyyMMdd-HHmm').csv"
    [System.IO.File]::WriteAllLines($sparadTill, $csvRader, $utf8Bom)
    Write-Host "OBS: $($_.Exception.Message.Split('.')[0]) - sparade till:" -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 7. Rapport
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "CSV sparad: $sparadTill" -ForegroundColor Green
Write-Host "  Enheter:  $($rader.Count)" -ForegroundColor Gray
Write-Host "  Kolumner: $($rader[0].PSObject.Properties.Name.Count)" -ForegroundColor Gray

if ($okandaCaps.Count -gt 0) {
    Write-Host ""
    Write-Host "Okanda capabilities (syns ej i CSV - lagg till i capKolumner om du vill ha dem):" -ForegroundColor Yellow
    $okandaCaps | Sort-Object | ForEach-Object { Write-Host "  - $_" -ForegroundColor DarkYellow }
}

Write-Host ""
Write-Host "Klar!" -ForegroundColor Green
