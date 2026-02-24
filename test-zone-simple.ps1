# Läs token från .env
$token = (Get-Content "backend\.env" | Select-String "HOMEY_TOKEN=").ToString() -Replace "HOMEY_TOKEN=", ""
$homey = "http://192.168.1.122"

Write-Host "🔄 Hämtar enheter från Homey..." -ForegroundColor Cyan
Write-Host ""

# Gör anrop
$response = Invoke-WebRequest -Uri "$homey/api/manager/devices/device/" `
    -Headers @{ Authorization = "Bearer $token" } `
    -UseBasicParsing

$devices = $response.Content | ConvertFrom-Json

# Visa temperaturer
Write-Host "🌡️  TEMPERATURSENSORER:" -ForegroundColor Yellow
Write-Host "━" * 70

$devices.PSObject.Properties | ForEach-Object {
    $d = $_.Value
    if ($d.capabilities -contains "measure_temperature" -or $d.capabilities -contains "outdoorTemperature") {
        if ($d.capabilities -contains "outdoorTemperature") {
            $temp = $d.capabilitiesObj.outdoorTemperature.value
        } else {
            $temp = $d.capabilitiesObj.measure_temperature.value
        }
        
        Write-Host "`n  📍 $($d.name)" -ForegroundColor White
        Write-Host "     Zone: $($d.zoneName)" -ForegroundColor Cyan -BackgroundColor DarkGray
        Write-Host "     Temp: $temp °C" -ForegroundColor Gray
    }
}

# Visa energi
Write-Host ""
Write-Host ""
Write-Host "⚡ ENERGISENSORER:" -ForegroundColor Yellow
Write-Host "━" * 70

$devices.PSObject.Properties | ForEach-Object {
    $d = $_.Value
    if ($d.capabilities -contains "measure_power") {
        $watts = $d.capabilitiesObj.measure_power.value
        
        Write-Host "`n  📍 $($d.name)" -ForegroundColor White
        Write-Host "     Zone: $($d.zoneName)" -ForegroundColor Cyan -BackgroundColor DarkGray
        Write-Host "     Watts: $watts W" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Klar!" -ForegroundColor Green
