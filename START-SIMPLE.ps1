Write-Host "Starting database..." -ForegroundColor Cyan
docker start homey_db 2>&1 | Out-Null
Start-Sleep -Seconds 3

Write-Host "Database started" -ForegroundColor Green

Write-Host "Starting backend..." -ForegroundColor Cyan
$backendScript = @"
cd "$PSScriptRoot\backend"
npm run dev
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit -File $env:TEMP\start-backend.ps1"
Start-Sleep -Seconds 5

Write-Host "Starting frontend..." -ForegroundColor Cyan
$frontendScript = @"
cd "$PSScriptRoot\frontend"
npm run dev
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit -File $env:TEMP\start-frontend.ps1"
Start-Sleep -Seconds 5

Write-Host "System started!" -ForegroundColor Green
Write-Host "Open: http://localhost:3000" -ForegroundColor Green
