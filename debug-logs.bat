@echo off
cd C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
echo === BACKEND LOGS ===
docker-compose logs backend --tail 30
echo.
echo === FRONTEND LOGS ===
docker-compose logs frontend --tail 15
echo.
echo === CONTAINER STATUS ===
docker ps
pause
