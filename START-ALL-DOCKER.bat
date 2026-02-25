@echo off
cd /d "c:\Users\jan\OneDrive\Dokument\GitHub\k7-energi"

echo ========================================
echo STARTA DOCKER - ALLT
echo ========================================
echo.

echo [1/3] Stanger ner gamla containers...
docker-compose down

echo [2/3] Startar allt...
docker-compose up -d

echo [3/3] Vantar pa att system startas... (10 sekunder)
timeout /t 10 /nobreak

echo.
echo ========================================
echo STATUS:
docker ps

echo.
echo FRONTEND: http://localhost:3000
echo BACKEND:  http://localhost:3001
echo DB:       localhost:5432
echo ========================================
echo.

pause
