#!/usr/bin/env pwsh
Write-Host "=== CLEAN RESTART ===" -ForegroundColor Green

Write-Host "`n1. Stopping Docker..." -ForegroundColor Cyan
docker-compose down -v --remove-orphans 2>&1 | Out-Null
Start-Sleep -Seconds 3

Write-Host "`n2. Cleaning Docker system..." -ForegroundColor Cyan
docker system prune -af 2>&1 | Out-Null

Write-Host "`n3. Removing old images..." -ForegroundColor Cyan
docker rmi k7-energi-frontend k7-energi-backend 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "`n4. Building and starting fresh..." -ForegroundColor Cyan
docker-compose up -d --build
Start-Sleep -Seconds 5

Write-Host "`n5. Checking status..." -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n6. Waiting for frontend to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

Write-Host "`n7. Testing frontend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Frontend is UP! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is DOWN" -ForegroundColor Red
    docker-compose logs frontend --tail 20
}

Write-Host "`n✓ DONE" -ForegroundColor Green
