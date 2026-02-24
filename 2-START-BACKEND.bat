@echo off
REM ============================================
REM STARTA BACKEND LOKALT
REM ============================================
echo.
echo Starting Backend API...
echo Connecting to: postgresql://localhost:5432/homey_db
echo.
cd backend
npm run dev
