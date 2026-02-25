@echo off
cd C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
docker exec homey_backend npx prisma migrate deploy
echo.
echo Migrations complete! Restarting containers...
docker-compose restart backend frontend
echo.
docker ps
pause
