$logFile = "loggfil.txt"
$lines = @(Get-Content $logFile -Encoding UTF8)
$result = @()
$count = 0

# Hitta cutoff-raden (kan ha varit skadad)
$cutoffIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '00:42:49\.240.*Schemaläggare startad') {
    $cutoffIdx = $i
    break
  }
}

Write-Host "Cutoff index: $cutoffIdx av $($lines.Count) totalt"

if ($cutoffIdx -eq -1) {
  Write-Host "Varning: Cutoff-rad inte hittad, söker efter 2026-02-22..."
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^2026-02-22 00:4[0-9]:00') {
      $cutoffIdx = $i
      Write-Host "Hittade cutoff approximativt vid rad $i"
      break
    }
  }
}

# Process lines
for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  
  if ($i -lt $cutoffIdx -and $line -match '^2026-02-21 ') {
    $ts = $line.Substring(0, 23)
    try {
      $dt = [DateTime]::ParseExact($ts, "yyyy-MM-dd HH:mm:ss.fff", [System.Globalization.CultureInfo]::InvariantCulture)
      $newDt = $dt.AddHours(2)
      $newTs = $newDt.ToString("yyyy-MM-dd HH:mm:ss.fff")
      $result += $newTs + $line.Substring(23)
      $count++
    } catch {
      $result += $line
    }
  } else {
    $result += $line
  }
}

$result | Set-Content $logFile -Encoding UTF8
Write-Host "Lagt till 2 timmar pa $count rader"
