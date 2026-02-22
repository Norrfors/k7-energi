# ============================================
# DEV.PS1 - Lokal utveckling (INTE Docker)
# ============================================
# Kommando: .\scripts\dev.ps1
# 
# Denna script:
# 1. Startar PostgreSQL i Docker
# 2. Startar Backend i ny terminal (npm run dev)
# 3. Startar Frontend i ny terminal (npm run dev)
# 4. Öppnar dashboard i webbläsare
# ============================================

param(
    [string]$Action = "start"
)

$projectRoot = Split-Path -Parent -Path (Split-Path -Parent -Path $MyInvocation.MyCommand.Path)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       💻 K7-ENERGI LOKAL UTVECKLING (Non-Docker)               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($Action -eq "start") {
    Write-Host "→ Startar lokalt utvecklings-environment..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location $projectRoot
    
    # Starta bara PostgreSQL i Docker
    Write-Host "1️⃣  Startar PostgreSQL i Docker..." -ForegroundColor Cyan
    docker compose up -d db
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker PostgreSQL misslyckades!" -ForegroundColor Red
        exit 1
    }
    
    Start-Sleep -Seconds 2
    
    # Starta Backend i ny PowerShell terminal
    Write-Host "2️⃣  Startar Backend (npm run dev)..." -ForegroundColor Cyan
    $backendScript = {
        Set-Location "$using:projectRoot\backend"
        Write-Host "🔄 Backend startar..." -ForegroundColor Green
        npm run dev
    }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
    
    Start-Sleep -Seconds 3
    
    # Starta Frontend i ny PowerShell terminal
    Write-Host "3️⃣  Startar Frontend (npm run dev)..." -ForegroundColor Cyan
    $frontendScript = {
        Set-Location "$using:projectRoot\frontend"
        Write-Host "🔄 Frontend startar..." -ForegroundColor Green
        npm run dev
    }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
    
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ LOKAL UTVECKLING STARTAD!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Åtkomst:" -ForegroundColor Green
    Write-Host "   • Frontend:    http://localhost:3000" -ForegroundColor White
    Write-Host "   • Backend API: http://localhost:3001/api/health" -ForegroundColor White
    Write-Host ""
    Write-Host "📍 Processerna körs i separata terminaler:" -ForegroundColor Cyan
    Write-Host "   • Terminal 1: PostgreSQL (Docker)" -ForegroundColor White
    Write-Host "   • Terminal 2: Backend (npm run dev)" -ForegroundColor White
    Write-Host "   • Terminal 3: Frontend (npm run dev)" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Cyan
    Write-Host "   • Hot-reload aktiverat för både backend och frontend" -ForegroundColor Gray
    Write-Host "   • Stäng terminalerna för att stoppa." -ForegroundColor Gray
    Write-Host "   • Eller: .\scripts\dev.ps1 stop" -ForegroundColor Gray
    Write-Host ""
    
    # Öppna frontend i webbläsare
    Start-Sleep -Seconds 2
    Write-Host "🌐 Öppnar webbläsaren..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"

} elseif ($Action -eq "stop") {
    Write-Host "→ Stoppar lokal utveckling..." -ForegroundColor Yellow
    Set-Location $projectRoot
    
    Write-Host "1️⃣  Stoppar Docker PostgreSQL..." -ForegroundColor Cyan
    docker compose down
    
    Write-Host "2️⃣  Stänger Node-processer..." -ForegroundColor Cyan
    taskkill /F /IM node.exe 2>&1 | findstr /V "not found"
    
    Write-Host ""
    Write-Host "✅ Stoppad!" -ForegroundColor Green

} elseif ($Action -eq "clean") {
    Write-Host "→ Rengör utvecklings-environment..." -ForegroundColor Yellow
    
    Write-Host "1️⃣  Stoppar Docker..." -ForegroundColor Cyan
    Set-Location $projectRoot
    docker compose down -v
    
    Write-Host "2️⃣  Stänger Node-processer..." -ForegroundColor Cyan
    taskkill /F /IM node.exe 2>&1 | findstr /V "not found"
    
    Write-Host ""
    Write-Host "✅ Rengjort!" -ForegroundColor Green

} else {
    Write-Host "❌ Okänd åtgärd: $Action" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tillgängliga åtgärder:" -ForegroundColor Yellow
    Write-Host "  start   - Startar lokal dev-miljö" -ForegroundColor White
    Write-Host "  stop    - Stoppar lokal dev-miljö" -ForegroundColor White
    Write-Host "  clean   - Stoppar och rengör" -ForegroundColor White
    Write-Host ""
    Write-Host "Exempel:" -ForegroundColor Cyan
    Write-Host "  .\scripts\dev.ps1 start" -ForegroundColor White
    Write-Host "  .\scripts\dev.ps1 stop" -ForegroundColor White
    Write-Host ""
}
