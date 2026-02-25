@echo off
REM ============================================
REM FRESH START - Renstart helt från scratch
REM ============================================
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi"

echo.
echo ██████████████████████████████████████████
echo    FRESH START - RENSTART UTAN CACHE
echo ██████████████████████████████████████████
echo.

echo [1/5] Stänger ner gambla containers...
docker-compose down

echo [2/5] Rensar ALL Docker cache och volumes...
docker system prune -af --volumes

echo [3/5] Bygger och startar allt från scratch...
docker-compose up -d --build

echo [4/5] Väntar på att system startar (20 sekunder)...
timeout /t 20 /nobreak

echo.
echo [5/5] Status:
docker ps

echo.
echo ██████████████████████████████████████████
echo ✓ FRONTEND:  http://localhost:3000
echo ✓ BACKEND:   http://localhost:3001
echo ✓ DATABASE:  localhost:5432
echo ██████████████████████████████████████████
echo.

pause
