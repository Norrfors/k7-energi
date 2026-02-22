@echo off
REM Install Task Scheduler tasks for database backups
REM Kl 11:00 och 23:00

echo.
echo === Install Backup Scheduler ===
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Run as Administrator!
    pause
    exit /b 1
)

set BACKUP_SCRIPT=C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi\scripts\backup-database.ps1
set PS_CMD=powershell -ExecutionPolicy Bypass -File "%BACKUP_SCRIPT%"

echo Creating Task: K7-Energi-Backup-1100...
schtasks /create /tn "K7-Energi-Backup-1100" /tr "%PS_CMD%" /sc daily /st 11:00:00 /ru SYSTEM /rl HIGHEST /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Created: K7-Energi-Backup-1100
) else (
    echo [FAIL] Could not create K7-Energi-Backup-1100
)

echo Creating Task: K7-Energi-Backup-2300...
schtasks /create /tn "K7-Energi-Backup-2300" /tr "%PS_CMD%" /sc daily /st 23:00:00 /ru SYSTEM /rl HIGHEST /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Created: K7-Energi-Backup-2300
) else (
    echo [FAIL] Could not create K7-Energi-Backup-2300
)

echo.
echo === Verifying Tasks ===
echo.

schtasks /query /tn "K7-Energi-Backup-1100" /v /fo list 2>nul | find "Task To Run" >nul
if %errorlevel% equ 0 (
    echo [OK] K7-Energi-Backup-1100 registered
) else (
    echo [FAIL] K7-Energi-Backup-1100 not found
)

schtasks /query /tn "K7-Energi-Backup-2300" /v /fo list 2>nul | find "Task To Run" >nul
if %errorlevel% equ 0 (
    echo [OK] K7-Energi-Backup-2300 registered
) else (
    echo [FAIL] K7-Energi-Backup-2300 not found
)

echo.
echo === Installation Complete ===
echo.
echo Backups will run automatically:
echo   - Daily at 11:00 (K7-Energi-Backup-1100)
echo   - Daily at 23:00 (K7-Energi-Backup-2300)
echo.
echo Backups saved to: C:\Users\jan\OneDrive\Dokument\Backup\
echo.
pause
