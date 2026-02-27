# STOP-ALL.ps1
# Stänger av hela stacken

Write-Host "🛑 Stänger av Hem Dashboard..." -ForegroundColor Red

# Stäng alla Node processer
Write-Host "   Stänger Backend & Frontend..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force 2>&1 | Out-Null

# Stäng terminal-fönster från START-ALL.ps1
Get-Process powershell | Where-Object {$_.MainWindowTitle -like "*start-backend*" -or $_.MainWindowTitle -like "*start-frontend*"} | Stop-Process -Force 2>&1 | Out-Null

Start-Sleep -Seconds 2

# Stäng databasen
Write-Host "   Stänger Database..." -ForegroundColor Yellow
docker stop homey_db 2>&1 | Out-Null

Write-Host "✅ Allt stängt" -ForegroundColor Green
