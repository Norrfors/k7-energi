# K7 Energi Startup Script - LOCAL DEVELOPMENT
# Runs ONLY the database in Docker
# Frontend and Backend run as local Node processes

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

# Start ONLY the database container (not frontend/backend)
Write-Host "Starting PostgreSQL database..." -ForegroundColor Yellow
Push-Location $projectPath
docker compose up -d db
Pop-Location
Start-Sleep -Seconds 3
Write-Host "Done" -ForegroundColor Green
Write-Host ""

# Start Backend (LOCAL)
Write-Host "Starting Backend (local)..." -ForegroundColor Yellow
Push-Location "$projectPath\backend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Write-Host "Waiting for backend..."
$ready = $false
$attempt = 0

while ($attempt -lt 60 -and -not $ready) {
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

# Start Frontend (LOCAL)
Write-Host "Starting Frontend (local)..." -ForegroundColor Yellow
Push-Location "$projectPath\frontend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== All Services Running ===" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "Database:  PostgreSQL (Docker)" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: taskkill /f /im node.exe" -ForegroundColor Gray
Write-Host ""
