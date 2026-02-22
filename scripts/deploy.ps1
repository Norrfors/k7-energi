# ============================================
# DEPLOY.PS1 - Driftsätt i Docker
# ============================================
# Kommando: .\scripts\deploy.ps1
# 
# Denna script:
# 1. Bygger Docker-images för backend och frontend
# 2. Startar alla tjänster (DB, Backend, Frontend)
# 3. Visar status och URL:er
# ============================================

param(
    [string]$Action = "start",
    [string]$HomeyAddress = "http://192.168.1.122",
    [string]$HomeyToken = ""
)

$projectRoot = Split-Path -Parent -Path (Split-Path -Parent -Path $MyInvocation.MyCommand.Path)
$scriptName = Split-Path -Leaf -Path $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          🐳 K7-ENERGI DOCKER DRIFT-DEPLOYMENT                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($Action -eq "start") {
    Write-Host "→ Starta Docker-drift..." -ForegroundColor Yellow
    Write-Host ""
    
    # Kontrollera även om env-variabler är satta
    if (-not $HomeyToken) {
        Write-Host "⚠️  VARNING: HOMEY_TOKEN är inte satt!" -ForegroundColor Yellow
        Write-Host "   Om du inte sätter den kommer Homey-anslutningen att misslyckas." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Sätt den med:" -ForegroundColor Gray
        Write-Host "   `$env:HOMEY_TOKEN = 'din-token-här'" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Sätt environment variabler
    $env:HOMEY_ADDRESS = $HomeyAddress
    if ($HomeyToken) {
        $env:HOMEY_TOKEN = $HomeyToken
    }
    
    # Gå till projektrot
    Set-Location $projectRoot
    
    # Starta Docker Compose
    Write-Host "1️⃣  Bygger Docker-images..." -ForegroundColor Cyan
    Write-Host ""
    docker compose build --no-cache
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build misslyckades!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "2️⃣  Startar tjänster (PostgreSQL, Backend, Frontend)..." -ForegroundColor Cyan
    Write-Host ""
    docker compose up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker compose up misslyckades!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "3️⃣  Väntar på självkontroll..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ DRIFT I DOCKER STARTAD!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Åtkomst:" -ForegroundColor Green
    Write-Host "   • Frontend:    http://localhost:3000" -ForegroundColor White
    Write-Host "   • Backend API: http://localhost:3001/api/health" -ForegroundColor White
    Write-Host "   • Database:    postgresql://postgres:postgres@localhost:5432/homey_db" -ForegroundColor White
    Write-Host ""
    Write-Host "📦 Containers:" -ForegroundColor Green
    docker compose ps
    Write-Host ""
    Write-Host "🔍 Loggar:  docker compose logs -f backend" -ForegroundColor Gray
    Write-Host "🛑 Stoppa:  docker compose down" -ForegroundColor Gray
    Write-Host ""

} elseif ($Action -eq "stop") {
    Write-Host "→ Stoppar Docker-tjänster..." -ForegroundColor Yellow
    Set-Location $projectRoot
    docker compose down
    Write-Host "✅ Stoppat!" -ForegroundColor Green
    Write-Host ""

} elseif ($Action -eq "restart") {
    Write-Host "→ Omstartar Docker-tjänster..." -ForegroundColor Yellow
    Set-Location $projectRoot
    docker compose restart
    Write-Host "✅ Omstartat!" -ForegroundColor Green
    Write-Host ""

} elseif ($Action -eq "logs") {
    Write-Host "→ Visar loggar (Ctrl+C för att avsluta)..." -ForegroundColor Yellow
    Set-Location $projectRoot
    docker compose logs -f

} elseif ($Action -eq "status") {
    Write-Host "→ Visar status..." -ForegroundColor Yellow
    Set-Location $projectRoot
    docker compose ps
    Write-Host ""

} else {
    Write-Host "❌ Okänd åtgärd: $Action" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tillgängliga åtgärder:" -ForegroundColor Yellow
    Write-Host "  start       - Bygger och startar tjänster" -ForegroundColor White
    Write-Host "  stop        - Stoppar tjänster" -ForegroundColor White
    Write-Host "  restart     - Omstartar tjänster" -ForegroundColor White
    Write-Host "  logs        - Visar live-loggar" -ForegroundColor White
    Write-Host "  status      - Visar status" -ForegroundColor White
    Write-Host ""
    Write-Host "Exempel:" -ForegroundColor Cyan
    Write-Host "  .\scripts\deploy.ps1 start" -ForegroundColor White
    Write-Host "  .\scripts\deploy.ps1 stop" -ForegroundColor White
    Write-Host "  .\scripts\deploy.ps1 logs" -ForegroundColor White
    Write-Host ""
}
