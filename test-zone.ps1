# Test: Hämta ZONE från Homey direkt
# Samma logik som homey.service.ts

param(
    [string]$Address = "http://192.168.1.122",
    [string]$Token = $env:HOMEY_TOKEN
)

# Försök läsa token från backend/.env om den inte är satt
if (-not $Token) {
    $envFile = Join-Path $PSScriptRoot "backend" ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match 'HOMEY_TOKEN=(.+)') {
            $Token = $matches[1].Trim()
            Write-Host "✓ Token läst från .env" -ForegroundColor Green
        }
    }
}

if (-not $Token) {
    Write-Host "❌ Token saknas! Sätt HOMEY_TOKEN:" -ForegroundColor Red
    Write-Host "`$env:HOMEY_TOKEN = 'din-token-här'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 Ansluter till Homey: $Address" -ForegroundColor Cyan
Write-Host "🔑 Token längd: $($Token.Length) tecken"
Write-Host ""

try {
    # Samma anrop som homey.service.ts
    $url = "$Address/api/manager/devices/device/"
    Write-Host "GET $url" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri $url `
        -Headers @{ Authorization = "Bearer $Token" } `
        -UseBasicParsing -ErrorAction Stop
    
    $devices = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Mottog enheter" -ForegroundColor Green
    Write-Host ""
    
    # Filter och visa temperatursensorer med zon
    Write-Host "🌡️  TEMPERATURSENSORER:" -ForegroundColor Yellow
    Write-Host "─" * 60
    
    $tempCount = 0
    $devices.PSObject.Properties | ForEach-Object {
        $device = $_.Value
        
        if ($device.capabilities -contains "measure_temperature" -or $device.capabilities -contains "outdoorTemperature") {
            $tempCount++
            
            # Samma logik som getTemperatures()
            if ($device.capabilities -contains "outdoorTemperature") {
                $tempValue = $device.capabilitiesObj.outdoorTemperature.value
            } else {
                $tempValue = $device.capabilitiesObj.measure_temperature.value
            }
            
            $zone = $device.zoneName ?? "[INGEN ZON]"
            
            Write-Host ""
            Write-Host "  $($tempCount). $($device.name)" -ForegroundColor White
            Write-Host "     ID:    $($device.id)" -ForegroundColor Gray
            Write-Host "     ZONE:  '$zone'" -ForegroundColor Cyan -BackgroundColor DarkGray
            Write-Host "     Temp:  $tempValue °C" -ForegroundColor Gray
        }
    }
    
    if ($tempCount -eq 0) {
        Write-Host "  (inga temperatursensorer funna)" -ForegroundColor DarkGray
    }
    
    # Filter och visa energisensorer
    Write-Host ""
    Write-Host "⚡ ENERGISENSORER:" -ForegroundColor Yellow
    Write-Host "─" * 60
    
    $energyCount = 0
    $devices.PSObject.Properties | ForEach-Object {
        $device = $_.Value
        
        if ($device.capabilities -contains "measure_power") {
            $energyCount++
            
            $watts = $device.capabilitiesObj.measure_power.value
            $zone = $device.zoneName ?? "[INGEN ZON]"
            
            Write-Host ""
            Write-Host "  $($energyCount). $($device.name)" -ForegroundColor White
            Write-Host "     ID:    $($device.id)" -ForegroundColor Gray
            Write-Host "     ZONE:  '$zone'" -ForegroundColor Cyan -BackgroundColor DarkGray
            Write-Host "     Watts: $watts W" -ForegroundColor Gray
        }
    }
    
    if ($energyCount -eq 0) {
        Write-Host "  (inga energisensorer funna)" -ForegroundColor DarkGray
    }
    
    Write-Host ""
    Write-Host "✓ Totalt: $tempCount temp + $energyCount energi sensorer" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Fel: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Säkerställ att:" -ForegroundColor Yellow
    Write-Host "  • Homey är påslaget och i nätverket" -ForegroundColor Gray
    Write-Host "  • Token är rätt" -ForegroundColor Gray
    Write-Host "  • Du kan nå $Address från denna datorn" -ForegroundColor Gray
    exit 1
}
