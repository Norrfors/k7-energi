# ============================================
# restart-dev.ps1
# Omstartar hela dev-miljön efter kodändringar
# ============================================

param(
    [switch]$FullRebuild = $false,
    [switch]$NoCache = $false
)

$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"

Write-Host "`n╔════════════════════════════════════════════╗"
Write-Host "║  K7-ENERGI DEV ENVIRONMENT RESTART SCRIPT  ║"
Write-Host "╚════════════════════════════════════════════╝`n"

# ============================================
# STEG 1: GIT COMMIT (optional)
# ============================================
Write-Host "📝 Steg 1: Git status"
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "  ⚠️  Lokala ändringar detekterade. Committing...`n"
    git add -A
    $commitMsg = Read-Host "  Commit message"
    if ($commitMsg -ne "") {
        git commit -m "$commitMsg" | Out-Null
        Write-Host "  ✓ Committed`n"
    }
} else {
    Write-Host "  ✓ Ingen nya ändringar`n"
}

# ============================================
# STEG 2: DOCKER CLEANUP
# ============================================
Write-Host "🧹 Steg 2: Rensa Docker"

Write-Host "  Stänger containers..."
docker compose kill 2>$null
docker compose rm -f 2>$null

if ($FullRebuild) {
    Write-Host "  Tar bort images..."
    docker rmi k7-energi-backend k7-energi-frontend 2>$null
}

Write-Host "  ✓ Docker rensat`n"

# ============================================
# STEG 3: BYGGA
# ============================================
Write-Host "🔨 Steg 3: Bygger containers"

if ($NoCache -or $FullRebuild) {
    Write-Host "  Bygger utan cache..."
    docker compose build --no-cache 2>&1 | Out-Null
} else {
    Write-Host "  Bygger (med cache)..."
    docker compose build 2>&1 | Out-Null
}

Write-Host "  ✓ Build slutförd`n"

# ============================================
# STEG 4: STARTA CONTAINRAR
# ============================================
Write-Host "🚀 Steg 4: Startar containrar"
docker compose up -d 2>&1 | Out-Null
Write-Host "  Väntar på att system startar..."

# Vänta på services
$maxWait = 0
$ready = $false
while ($maxWait -lt 60 -and -not $ready) {
    Start-Sleep -Seconds 1
    
    $backend = Test-NetConnection localhost -Port 3001 -WarningAction SilentlyContinue
    $frontend = Test-NetConnection localhost -Port 3000 -WarningAction SilentlyContinue
    
    if ($backend.TcpTestSucceeded -and $frontend.TcpTestSucceeded) {
        $ready = $true
        break
    }
    
    $maxWait++
    if ($maxWait % 5 -eq 0) {
        Write-Host "  ⏳ Väntar... ($maxWait sekunder)"
    }
}

if ($ready) {
    Write-Host "  ✓ Alla services är uppe`n"
} else {
    Write-Host "  ⚠️  Services kan inte nå på fullständig tid. Kontrollera docker logs.`n"
    docker compose logs --tail 20
    exit 1
}

# ============================================
# STEG 5: VERIFIERING
# ============================================
Write-Host "✅ Steg 5: Verifiering"

try {
    $healthCheck = Invoke-WebRequest http://localhost:3001/api/health -UseBasicParsing -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "  ✓ Backend svarar på /api/health`n"
    }
} catch {
    Write-Host "  ⚠️  Backend svarar inte ännu - kanske behöver lite mer tid`n"
}

# ============================================
# SLUTSATS
# ============================================
Write-Host "╔════════════════════════════════════════════╗"
Write-Host "║  ✓ SYSTEMET ÄR KLART!                    ║"
Write-Host "╠════════════════════════════════════════════╣"
Write-Host "║  Frontend:  http://localhost:3000         ║"
Write-Host "║  Backend:   http://localhost:3001         ║"
Write-Host "║                                            ║"
Write-Host "║  VIKTIGT: Tryck Ctrl+Shift+R i            ║"
Write-Host "║  webbläsaren för hårdladdning!            ║"
Write-Host "╚════════════════════════════════════════════╝`n"

# ============================================
# VALBARA FLAGGOR
# ============================================
# Användning:
# .\restart-dev.ps1              # Normalt restart
# .\restart-dev.ps1 -NoCache     # Bygga utan cache
# .\restart-dev.ps1 -FullRebuild # Ta bort images helt och bygga om

Write-Host "💡 Tips: Använd -NoCache för att rensa allt cache"
Write-Host "💡 Tips: Använd -FullRebuild för komplett ombyggnad`n"
