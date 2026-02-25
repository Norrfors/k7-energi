@echo off
REM ============================================
REM RESTART AFTER POWEROFF
REM Returns to v0.28 state
REM ============================================
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi"

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║  STARTING SYSTEM - v0.28 RECOVERY      ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/3] Starta Docker containers...
docker-compose up -d

echo [2/3] Vänta på systemstart (15 sekunder)...
timeout /t 15 /nobreak

echo [3/3] Verifiera status...
docker ps

echo.
echo ╔════════════════════════════════════════╗
echo ║  SYSTEM READY                          ║
echo ╟────────────────────────────────────────╢
echo ║ FRONTEND:  http://localhost:3000       ║
echo ║ BACKEND:   http://localhost:3001       ║
echo ║ VERSION:   v0.28                       ║
echo ╚════════════════════════════════════════╝
echo.
echo Öppna http://localhost:3000 i webbläsaren
echo.

pause
