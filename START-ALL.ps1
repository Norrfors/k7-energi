# START-ALL.ps1
# Startar hela stacken i ratt ordning med health checks

Write-Host "Startar Hem Dashboard (v0.31)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. Starta databasen
Write-Host "`n📦 Starta PostgreSQL..." -ForegroundColor Yellow
docker start homey_db 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Vänta på att databasen är redo
$dbReady = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $result = docker exec homey_db pg_isready -U postgres 2>&1
        if ($result -like "*accepting*") {
            $dbReady = $true
            Write-Host "✅ Database klar" -ForegroundColor Green
            break
        }
    }
    catch {}
    Write-Host "   Väntar på database... ($($i+1)/15)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

if (-not $dbReady) {
    Write-Host "❌ Database startade inte" -ForegroundColor Red
    exit 1
}

# 2. Starta Backend i ny terminal
Write-Host "`n🔧 Startar Backend..." -ForegroundColor Yellow
$backendScript = @"
cd "$PSScriptRoot\backend"
npm run dev
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit -File $env:TEMP\start-backend.ps1"
Start-Sleep -Seconds 3

# 3. Vänta på backend hälsokontroll
Write-Host "`n🏥 Väntar på Backend health check..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2
        if ($response) {
            Write-Host "✅ Backend svarar på port 3001" -ForegroundColor Green
            $backendReady = $true
            break
        }
    }
    catch {}
    Write-Host "   Väntar på backend... ($($i+1)/20)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

if (-not $backendReady) {
    Write-Host "⚠️  Backend svarar inte ännu (debug i Backend-terminal)" -ForegroundColor Yellow
}

# 4. Starta Frontend i ny terminal
Write-Host "`n🎨 Startar Frontend..." -ForegroundColor Yellow
$frontendScript = @"
cd "$PSScriptRoot\frontend"
npm run dev
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit -File $env:TEMP\start-frontend.ps1"
Start-Sleep -Seconds 3

# 5. Vänta på frontend
Write-Host "`n🏥 Väntar på Frontend..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend körs på port 3000" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    }
    catch {}
    Write-Host "   Väntar på frontend... ($($i+1)/20)" -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Slutresultat
Write-Host "`n================================" -ForegroundColor Cyan
if ($backendReady -and $frontendReady) {
    Write-Host "✅ ALLT ÄR IGÅNG!" -ForegroundColor Green
    Write-Host "🌐 Öppna: http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Någonting startar ännu..." -ForegroundColor Yellow
    Write-Host "Backend: $($backendReady ? '✅' : '⏱️ ')" -ForegroundColor Gray
    Write-Host "Frontend: $($frontendReady ? '✅' : '⏱️ ')" -ForegroundColor Gray
    Write-Host "Se terminal-fönstren för detaljer" -ForegroundColor Yellow
}

Write-Host "`nTryck Enter to hålla denna terminal öppen..." -ForegroundColor Gray
Read-Host
