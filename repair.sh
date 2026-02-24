# Repair script - kör migrations och restart services

Write-Host "🔧 Reparerar databasen och backend..." -ForegroundColor Green
Write-Host ""

# Restart backend container för att tvinga migrations
Write-Host "1. Startar om backend-containern..." -ForegroundColor Cyan
docker container restart homey_backend | Out-Null

# Vänta på backend
Write-Host "2. Väntar på backend att starta (30 sek)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Visa status
Write-Host ""
Write-Host "3. Container-status:" -ForegroundColor Cyan
docker compose ps --format "table {{.Names}}`t{{.Status}}"

Write-Host ""
Write-Host "✅ Reparation klar!" -ForegroundColor Green
Write-Host ""
Write-Host "Testa nu:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   API:      http://localhost:3001/api/homey/temperatures" -ForegroundColor White
Write-Host ""
Write-Host "Om det fortfarande inte fungerar, kör:" -ForegroundColor Yellow
Write-Host "   docker compose logs homey_backend --tail 50" -ForegroundColor White
