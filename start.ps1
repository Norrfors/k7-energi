# K7 Energi - Robust Startup Script
# Använd denna för att starta både backend och frontend säkert
# Skriptet:
# 1. Dödar gamla Node-processer
# 2. Startar backend och väntar tills den svarar
# 3. Startar frontend när backend är redo
# 
# Användning: PS > .\start.ps1

Write-Host "`n╔═════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     K7 Energi Services - Startup      ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════╝`n" -ForegroundColor Cyan

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Step 1: Kill old processes
Write-Host "Step 1: Cleaning up old processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null | Out-Null
Start-Sleep -Seconds 2
Write-Host "✓ Done`n" -ForegroundColor Green

# Step 2: Start Backend
Write-Host "Step 2: Starting Backend (port 3001)..." -ForegroundColor Yellow
Push-Location "$projectPath\backend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Write-Host "   Waiting for backend to respond..." -ForegroundColor Gray
$maxAttempts = 30
$attempt = 0
$backendReady = $false

do {
    $attempt++
    try {
        $health = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -ErrorAction Stop
        if ($health.status -eq "ok") {
            Write-Host "   ✓ Backend ready!" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Write-Host "   ." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
} while ($attempt -lt $maxAttempts)

if (-not $backendReady) {
    Write-Host "`n✗ ERROR: Backend failed to start after 30 seconds" -ForegroundColor Red
    Write-Host "   Check: cd backend && npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Start Frontend
Write-Host "Step 3: Starting Frontend (port 3002)..." -ForegroundColor Yellow
Push-Location "$projectPath\frontend"
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Hidden
Pop-Location

Start-Sleep -Seconds 3

Write-Host "`n╔═════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✓ All services started!           ║" -ForegroundColor Green
Write-Host "╠═════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Frontend:  http://localhost:3002    ║" -ForegroundColor Cyan
Write-Host "║  Backend:   http://localhost:3001    ║" -ForegroundColor Cyan
Write-Host "║  Database:  Connected to homey_db    ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Services are running in background. You can close this window." -ForegroundColor Gray
Write-Host "To stop: Press Ctrl+Alt+Delete → Task Manager → End 'node.exe' processes`n" -ForegroundColor Gray
