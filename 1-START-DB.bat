@echo off
REM ============================================
REM STARTA DATABASE I DOCKER
REM ============================================
echo.
echo Starting PostgreSQL database...
docker-compose up -d db

echo.
echo Waiting for database to be healthy...
timeout /t 5 /nobreak

docker-compose ps

echo.
echo ✓ Database is ready on: localhost:5432
echo.
pause
