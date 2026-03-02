# Plan: Fixa dev hot-reload och Docker-driftsättning

## Kontext
Två separata problem:

1. **Dev-läge: äldre kod körs** – `.next`-cachen är stale, dessutom har versionen tre motstridiga källor
2. **Docker: dör när VSCode stängs** – `START-ALL.ps1` startar backend+frontend som lokala Node-processer i terminaler. När terminalen stängs dör de. Lösning är att köra i full Docker-läge, men det fungerar inte pålitligt idag

---

## Rotorsaksanalys

### Problem 1 – Dev-läge kör gamla filer

**Orsak A: `.next`-cache är inte rensad**
Next.js kompilerar sidor till `.next/`. Om cachen är korrupt eller gammal serveras gamla filer. Inget rensas idag vid dev-start.

**Orsak B: Tre motstridiga versionskällor**
| Källfil | Vad den gör | Värde |
|---------|-------------|-------|
| `set-version.js` | Skriver git-tag till `.env.local` | Korrekt (v0.61) |
| `next.config.js` | Läser från `package.json` och sätter `NEXT_PUBLIC_VERSION` | Fel (0.56.0) – ÖVERSKRIVER .env.local |
| `layout.tsx` | Hårdkodat `"v0.60"` | Korrekt men fragilt |

`next.config.js` env-fältet bäddas in i bundeln vid build och har högre prioritet än `.env.local`. Alltså: `set-version.js` skriver rätt version till `.env.local`, men `next.config.js` överskriver det med `0.56.0` från `package.json`.

### Problem 2 – Docker fungerar inte pålitligt

**Orsak A: `NODE_ENV: development` i docker-compose.yml**
Docker bygger produktionsimage (`npm run build → node dist/app.js`), men kör den med `NODE_ENV=development`. Inkonsekvens.

**Orsak B: Frontend startar innan backend är redo**
```yaml
depends_on:
  - backend   # ← bara att containern startade, inte att API:et svarar
```
Backend kör migrationer (`execSync prisma migrate deploy`) innan den svarar. Frontend startar och gör API-anrop som misslyckas.

**Orsak C: VERSION byggs inte korrekt i Docker**
`next.config.js` läser `package.json` version (`0.56.0`) i stället för build-argumentet `VERSION=v0.61`. Versionen i dashboarden stämmer inte.

**Orsak D: START-ALL.ps1 är inte persistent**
Startar backend/frontend som lokala Node-processer i separata terminal-fönster. Dessa dör när terminalen stängs. Inget i Docker.

---

## Åtgärder

### 1. `frontend/next.config.js`
**Prioritetsordning för version:** `process.env.NEXT_PUBLIC_VERSION` (satt av set-version.js via .env.local ELLER Docker build-arg) → fallback till `package.json`.

```js
let version = 'dev';
const envVersion = process.env.NEXT_PUBLIC_VERSION;
if (envVersion) {
  version = envVersion;
} else {
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    version = packageJson.version;
  } catch (e) {}
}
```

### 2. `frontend/src/app/layout.tsx`
Byt ut hårdkodad version mot env-variabel (server component kan läsa process.env):
```tsx
const version = process.env.NEXT_PUBLIC_VERSION || "v?";
```

### 3. `frontend/package.json`
Uppdatera `version` från `0.56.0` till `0.61.0` (synkronisera med projekt-versionen).

### 4. `START-ALL.ps1`
Lägg till rensning av `.next`-cache innan frontend startas:
```powershell
# Rensa Next.js-cache för att säkerställa att ny kod körs
Write-Host "Rensar .next-cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$PSScriptRoot\frontend\.next" -ErrorAction SilentlyContinue
```

### 5. `docker-compose.yml`
Tre ändringar:
- `NODE_ENV: development` → `NODE_ENV: production` (för backend och frontend)
- Lägg till healthcheck på backend-service
- Frontend `depends_on` väntar på backend healthcheck

```yaml
backend:
  environment:
    NODE_ENV: production
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://localhost:3001/api/health || exit 1"]
    interval: 15s
    timeout: 5s
    retries: 5
    start_period: 30s

frontend:
  environment:
    NODE_ENV: production
  depends_on:
    backend:
      condition: service_healthy
```

### 6. NY fil: `DOCKER-DEPLOY.ps1`
Script för Docker-driftsättning (persistent, överlever VSCode-stängning):

```powershell
# DOCKER-DEPLOY.ps1
# Startar hela stacken i Docker (persistent drift)
# Överlever VSCode-stängning, omstart av datorn, allt.

# Läs VERSION från .env
$version = (Get-Content .env | Where-Object { $_ -match "^VERSION=" }) -replace "VERSION=", ""
$env:VERSION = $version

Write-Host "Startar Docker-stack version $version..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Vänta och verifiera
Write-Host "Väntar på tjänster..."
Start-Sleep -Seconds 20
docker-compose ps

# Hälsokontroll
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 5
    Write-Host "Backend OK: $($health.status)"
} catch {
    Write-Host "Backend svarar inte ännu - se: docker logs homey_backend"
}

Write-Host "Dashboard: http://localhost:3000"
Write-Host "Stacken körs nu i bakgrunden och överlever VSCode-stängning"
```

---

## Filer som ändras

| Fil | Ändring | Status |
|-----|---------|--------|
| `frontend/next.config.js` | Läs version från env-variabel FÖRE package.json | ⬜ Ej gjord |
| `frontend/src/app/layout.tsx` | Ersätt hårdkodad version med `process.env.NEXT_PUBLIC_VERSION` | ⬜ Ej gjord |
| `frontend/package.json` | Uppdatera `version` till `0.61.0` | ⬜ Ej gjord |
| `START-ALL.ps1` | Rensa `.next`-cache vid start | ⬜ Ej gjord |
| `docker-compose.yml` | NODE_ENV=production, backend healthcheck, frontend depends_on healthcheck | ⬜ Ej gjord |
| `DOCKER-DEPLOY.ps1` | NY – persistent Docker-driftsättning | ⬜ Ej gjord |

---

## Verifiering

**Dev-läge:**
1. Kör `.\START-ALL.ps1`
2. Verifiera att `.next` rensas i outputen
3. Öppna http://localhost:3000 → ska visa `Krokgatan 7 - v0.61`
4. Ändra en text i `page.tsx` → Next.js Fast Refresh ska uppdatera utan reload

**Docker-läge:**
1. Kör `.\DOCKER-DEPLOY.ps1`
2. Verifiera med `docker-compose ps` – alla containers ska vara `Up (healthy)`
3. Öppna http://localhost:3000 → ska visa `Krokgatan 7 - v0.61`
4. Stäng VSCode
5. Öppna http://localhost:3000 igen → ska fortfarande fungera
6. Kör `docker-compose ps` i ny terminal → containers ska fortfarande vara `Up`
