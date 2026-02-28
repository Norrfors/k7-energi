# ==============================================================================
# START-ALL SCRIPT - Stabil startprocedur for K7-ENERGI
# ==============================================================================

Write-Host "`n[START] K7-ENERGI INITIALIZING...`n" -ForegroundColor Cyan

# Step 1: Kill old processes
Write-Host "[1/5] Killing old processes..." -ForegroundColor Yellow
$killed = 0
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force 2>$null
    $killed++
}
Write-Host "      - Killed $killed node processes`n" -ForegroundColor Green

# Step 2: Verify database
Write-Host "[2/5] Verifying database..." -ForegroundColor Yellow
$dbRunning = Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded
if ($dbRunning) {
    Write-Host "      - Database OK (5432)`n" -ForegroundColor Green
} else {
    Write-Host "      - Database not responding - Starting docker..." -ForegroundColor Red
    docker start homey_db 2>$null
    Start-Sleep 3
    Write-Host "      - Docker started`n" -ForegroundColor Green
}

# Step 3: Start Backend
Write-Host "[3/5] Starting Backend (port 3001)..." -ForegroundColor Yellow
Push-Location backend
$backendJob = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command `"npm run dev`"" -PassThru -WindowStyle Hidden
Pop-Location
Start-Sleep 6
$backendOK = Test-NetConnection localhost -Port 3001 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded
if ($backendOK) {
    Write-Host "      - Backend OK (port 3001)`n" -ForegroundColor Green
} else {
    Write-Host "      - BACKEND FAILED!" -ForegroundColor Red
    exit 1
}

# Step 4: Start Frontend
Write-Host "[4/5] Starting Frontend (port 3000)..." -ForegroundColor Yellow
Push-Location frontend
$frontendJob = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command `"npm run dev`"" -PassThru -WindowStyle Hidden
Pop-Location
Start-Sleep 6
$frontendOK = Test-NetConnection localhost -Port 3000 -WarningAction SilentlyContinue | Select-Object -ExpandProperty TcpTestSucceeded
if ($frontendOK) {
    Write-Host "      - Frontend OK (port 3000)`n" -ForegroundColor Green
} else {
    Write-Host "      - FRONTEND FAILED!" -ForegroundColor Red
    exit 1
}

# Step 5: Final verification
Write-Host "[5/5] Final verification..." -ForegroundColor Yellow
Start-Sleep 2

$allGood = $true
try {
    $backendHealthResponse = Invoke-WebRequest -Uri http://localhost:3001/api/health -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      - Backend health: HTTP $($backendHealthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "      - Backend health FAILED" -ForegroundColor Red
    $allGood = $false
}

try {
    $frontendResponse = Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      - Frontend health: HTTP $($frontendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "      - Frontend health FAILED" -ForegroundColor Red
    $allGood = $false
}

if ($allGood) {
    Write-Host "`n[OK] ALL SERVICES RUNNING" -ForegroundColor Green
    Write-Host "     Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "     Backend: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "     Database: port 5432" -ForegroundColor Cyan
    Write-Host "     Version: v0.45`n" -ForegroundColor Cyan
} else {
    Write-Host "`n[ERROR] START FAILED - See errors above" -ForegroundColor Red
    exit 1
}
