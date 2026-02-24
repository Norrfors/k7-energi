# Läs token från .env
$token = (Get-Content "backend\.env" | Select-String "HOMEY_TOKEN=").ToString() -Replace "HOMEY_TOKEN=", ""
$homey = "http://192.168.1.122"

$output = @()
$output += "🔄 Hämtar enheter från Homey..."
$output += ""

try {
    # Gör anrop
    $response = Invoke-WebRequest -Uri "$homey/api/manager/devices/device/" `
        -Headers @{ Authorization = "Bearer $token" } `
        -UseBasicParsing

    $devices = $response.Content | ConvertFrom-Json
    $output += "✅ Mottog $(($devices.PSObject.Properties | Measure-Object).Count) enheter"
    $output += ""

    # Visa temperaturer
    $output += "🌡️  TEMPERATURSENSORER:"
    $output += ("━" * 70)

    $devices.PSObject.Properties | ForEach-Object {
        $d = $_.Value
        if ($d.capabilities -contains "measure_temperature" -or $d.capabilities -contains "outdoorTemperature") {
            if ($d.capabilities -contains "outdoorTemperature") {
                $temp = $d.capabilitiesObj.outdoorTemperature.value
            } else {
                $temp = $d.capabilitiesObj.measure_temperature.value
            }
            
            $output += ""
            $output += "  📍 $($d.name)"
            $output += "     Zone: $($d.zoneName)"
            $output += "     Temp: $temp °C"
        }
    }

    # Visa energi
    $output += ""
    $output += ""
    $output += "⚡ ENERGISENSORER:"
    $output += ("━" * 70)

    $devices.PSObject.Properties | ForEach-Object {
        $d = $_.Value
        if ($d.capabilities -contains "measure_power") {
            $watts = $d.capabilitiesObj.measure_power.value
            
            $output += ""
            $output += "  📍 $($d.name)"
            $output += "     Zone: $($d.zoneName)"
            $output += "     Watts: $watts W"
        }
    }

    $output += ""
    $output += "✅ Klar!"

} catch {
    $output += "❌ Fel: $($_.Exception.Message)"
    $output += "$($_.ScriptStackTrace)"
}

# Skriv till både konsol och fil
$output | ForEach-Object { Write-Host $_ }
$output | Out-File -FilePath ".\test-result.log" -Encoding UTF8

Write-Host ""
Write-Host "📄 Resultat sparad i: test-result.log" -ForegroundColor Cyan
