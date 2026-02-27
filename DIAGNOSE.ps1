# DIAGNOSE.ps1
# Diagnostiserar system-status

Write-Host "🔍 Diagnostiserar Hem Dashboard..." -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# 1. Database
Write-Host "`n📦 DATABASE" -ForegroundColor Yellow
try {
    $container = docker ps -a --filter "name=homey_db" --format "{{.Status}}"
    if ($container -like "*Up*") {
        Write-Host "   ✅ Docker container körs" -ForegroundColor Green
        $dbReady = docker exec homey_db pg_isready -U postgres 2>&1
        if ($dbReady -like "*accepting*") {
            Write-Host "   ✅ PostgreSQL svarar" -ForegroundColor Green
        } else {
            Write-Host "   ❌ PostgreSQL svarar inte: $dbReady" -ForegroundColor Red
        }
    } elseif ($container -like "*Exited*") {
        Write-Host "   ⏹️  Container är stoppad" -ForegroundColor Yellow
        Write-Host "   Kör: docker start homey_db" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ Container finns inte" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Docker error: $_" -ForegroundColor Red
}

# 2. Backend
Write-Host "`n🔧 BACKEND (port 3001)" -ForegroundColor Yellow
try {
    $conn = [System.Net.Sockets.TcpClient]::new()
    $conn.Connect("localhost", 3001)
    if ($conn.Connected) {
        Write-Host "   ✅ Port 3001 lyssnar" -ForegroundColor Green
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2
            if ($health.status -eq "ok") {
                Write-Host "   ✅ /api/health = OK" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Status: $($health | ConvertTo-Json -Depth 1)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ /api/health error: $_" -ForegroundColor Red
        }
    }
    $conn.Dispose()
} catch {
    Write-Host "   ❌ Port 3001 svarar inte - Backend körs ej" -ForegroundColor Red
}

# 3. Frontend
Write-Host "`n🎨 FRONTEND (port 3000)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Port 3000 svarar" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Port 3000 svarar inte - Frontend körs ej" -ForegroundColor Red
}

# 4. Node Processer
Write-Host "`n⚙️ NODE PROCESSER" -ForegroundColor Yellow
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    $nodeProcs | ForEach-Object {
        Write-Host "   ✅ node.exe PID $($_.Id) - Minne: $($_.WorkingSet / 1MB | [math]::Round())MB" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Ingen Node process körs" -ForegroundColor Red
}

# 5. Nätverk
Write-Host "`n🌐 NÄTVERKSPORTAR" -ForegroundColor Yellow
$ports = @{
    3000 = "Frontend"
    3001 = "Backend"
    5432 = "Database"
}
$ports.GetEnumerator() | ForEach-Object {
    $listening = netstat -ano | Select-String ":$($_.Key)" | Select-String "LISTENING"
    if ($listening) {
        Write-Host "   ✅ Port $($_.Key) ($($_.Value)) lyssnar" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Port $($_.Key) ($($_.Value)) lyssnar INTE" -ForegroundColor Red
    }
}

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Lösningar:" -ForegroundColor Cyan
Write-Host "  • Starta allt: .\START-ALL.ps1" -ForegroundColor Cyan
Write-Host "  • Stäng allt:  .\STOP-ALL.ps1" -ForegroundColor Cyan
