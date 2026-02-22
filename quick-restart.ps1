# ============================================
# quick-restart.ps1 - ENKEL OMSTART
# ============================================

Write-Host "`n🔄 QUICK RESTART`n"

Write-Host "1. Stänger allt..."
docker compose down 2>$null

Write-Host "2. Väntar..."
Start-Sleep -Seconds 5

Write-Host "3. Startar allt..."
docker compose up -d

Write-Host "4. Väntar på startup (30 sek)..."
Start-Sleep -Seconds 30

Write-Host "`n✅ KLART!"
Write-Host "Öppna: http://localhost:3000"
Write-Host "Tryck: Ctrl+Shift+R för hårdladdning`n"
