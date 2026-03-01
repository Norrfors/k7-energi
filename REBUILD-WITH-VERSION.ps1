#!/usr/bin/env powershell
# REBUILD-WITH-VERSION.ps1
# Bygger om docker-compose med korrekt version från .env

# Läs VERSION från .env-fil
$envFile = ".env"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $versionLine = ($content | Where-Object { $_ -match "^VERSION=" }) | Select-Object -First 1
    if ($versionLine) {
        $version = $versionLine -replace "VERSION=", ""
        Write-Host "Using VERSION from .env: $version" -ForegroundColor Cyan
    } else {
        $version = "dev"
        Write-Host "VERSION not found in .env, using dev" -ForegroundColor Yellow
    }
} else {
    $version = "dev"
    Write-Host ".env not found, using dev" -ForegroundColor Yellow
}

Write-Host "Building with VERSION=$version" -ForegroundColor Cyan

# Stäng gamla containers
docker-compose down 2>&1 | Out-Null

# Bygg och starta med korrekt VERSION
$env:VERSION = $version
docker-compose up -d --build

Write-Host "System startat med version: $version" -ForegroundColor Green

# Vänta och verifiera
Start-Sleep -Seconds 10
$response = Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "Frontend körs på port 3000" -ForegroundColor Green
} else {
    Write-Host "Frontend svarar inte än" -ForegroundColor Yellow
}
