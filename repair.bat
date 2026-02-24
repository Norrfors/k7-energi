@echo off
REM Repair script - kör migrations och restart services

echo 🔧 Reparerar databasen och backend...
echo.

REM Restart backend container
echo 1. Startar om backend-containern...
docker container restart homey_backend

REM Vänta
echo 2. Väntar på backend att starta (30 sek)...
timeout /t 30 /nobreak

REM Visa status
echo.
echo 3. Container-status:
docker compose ps

echo.
echo OK - Reparation klar!
echo.
echo Testa nu:
echo   Frontend: http://localhost:3000
echo   API:      http://localhost:3001/api/homey/temperatures
