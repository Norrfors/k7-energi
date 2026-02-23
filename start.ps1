# K7 Energi Startup Script
# This script starts Docker, Backend, and Frontend

Write-Host ""
Write-Host "=== K7 Energi Services Startup ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Kill old node processes
Write-Host "Stopping old processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null
Start-Sleep -Seconds 2
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# Start Docker containers
Write-Host "Starting Docker database..." -ForegroundColor Yellow
Push-Location $projectPath
docker compose up -d
Pop-Location
Start-Sleep -Seconds 3
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Push-Location "$projectPath\backend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Write-Host "Waiting for backend..."
$ready = $false
$attempt = 0

while ($attempt -lt 30 -and -not $ready) {
    $attempt++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -ErrorAction Stop
        if ($response.status -eq "ok") {
            Write-Host "Backend ready!" -ForegroundColor Green
            $ready = $true
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "Backend startup failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Push-Location "$projectPath\frontend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== All Services Running ===" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend:   http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: taskkill /f /im node.exe" -ForegroundColor Gray
Write-Host ""
