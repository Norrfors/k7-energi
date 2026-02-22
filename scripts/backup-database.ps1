# ============================================
# BACKUP-DATABASE.PS1 - Backa upp PostgreSQL
# ============================================
# Kör av Task Scheduler: kl 11:00 och 23:00

param(
    [string]$BackupDir = "C:\Users\jan\OneDrive\Dokument\Backup",
    [string]$DbUser = "dev",
    [string]$DbPassword = "dev123",
    [string]$DbName = "mittproject",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupFile = "$BackupDir\mittproject_$timestamp.sql"
$logFile = "$BackupDir\backup.log"
$backupSuccess = $false

# Skapa katalog
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $msg = "$ts | $Message"
    Write-Host $msg
    Add-Content -Path $logFile -Value $msg -ErrorAction SilentlyContinue
}

# ========== START BACKUP ==========
Write-Log "════════════════════════════════════════════"
Write-Log "DATABASE BACKUP STARTAR"
Write-Log "Destination: $backupFile"

# ========== KONTROLLERA DOCKER ==========
$dockerReady = $false

Write-Log "Kontrollerar PostgreSQL container..."
# Hitta container som innehåller _db eller postgresql
$dbContainer = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -match "_db|postgres" } | Select-Object -First 1

if ($dbContainer) {
    Write-Log "Hittat container: $dbContainer"
    $dockerReady = $true
} else {
    Write-Log "Ingen container hittas, startar docker compose..."
    docker compose -f "C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi\docker-compose.yml" up -d db 2>$null
    Start-Sleep -Seconds 3
    # Hitta igen
    $dbContainer = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -match "_db|postgres" } | Select-Object -First 1
    if ($dbContainer) {
        Write-Log "Container startad: $dbContainer"
        $dockerReady = $true
    }
}

# ========== KÖRA PG_DUMP ==========
if ($dockerReady) {
    Write-Log "Startar pg_dump..."
    $env:PGPASSWORD = $DbPassword
    
    $cmd = "pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName"
    $result = docker exec $dbContainer bash -c $cmd 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        $result | Out-File -FilePath $backupFile -Encoding UTF8
        $size = (Get-Item $backupFile).Length / 1MB
        Write-Log "OK - Backup sparat: $([Math]::Round($size, 2)) MB"
        $backupSuccess = $true
    } else {
        Write-Log "FEL - pg_dump misslyckades: $result"
    }
    
    Remove-Item -Path env:PGPASSWORD -ErrorAction SilentlyContinue
}

# ========== RENGÖRING GAMLA BACKUPS ==========
if ($backupSuccess) {
    Write-Log "Rensar gamla backups (behåller 14 senaste)..."
    
    $files = @(Get-ChildItem -Path $BackupDir -Filter "mittproject_*.sql" -ErrorAction SilentlyContinue | Sort-Object -Descending)
    
    if ($files.Count -gt 14) {
        $old = $files | Select-Object -Skip 14
        foreach ($f in $old) {
            Remove-Item -Path $f.FullName -Force -ErrorAction SilentlyContinue
            Write-Log "Tog bort: $($f.Name)"
        }
    }
    
    Write-Log "Rengöring klar. Total backups: $($files.Count)"
}

# ========== AVSLUT ==========
if ($backupSuccess) {
    Write-Log "BACKUP SLUTFÖRT OK"
} else {
    Write-Log "BACKUP MISSLYCKADES"
}

Write-Log "════════════════════════════════════════════"
Write-Log ""
