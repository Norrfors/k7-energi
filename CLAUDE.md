# CLAUDE.md – Instruktioner för AI-assistenten

Den här filen innehåller instruktioner och konventioner som gäller när GitHub Copilot / Claude hjälper till i det här projektet.

---

## Projekt: Hem Dashboard

Ett smarthems-dashboard som kopplar mot **Homey Pro** via lokalt nätverk och visar realtidsdata (temperaturer, energiförbrukning) i en webbapp.

**Repo:** https://github.com/Svinninge/homey

### Teknikstack

| Lager | Teknik |
|-------|--------|
| Backend API | TypeScript, Fastify, Node.js |
| Databas | PostgreSQL (Docker only) |
| Frontend | Next.js 14, React, Tailwind CSS |
| Delat | `shared/types.ts` – kontrakt mellan front och back |
| Schemaläggning | `node-cron` – loggar data var 5:e minut |
| **Dev-miljö** | **LOCAL (inte Docker)** - bara DB i container |

### 🚀 Starta utveckling (rekommenderat)

**Ett kommando (startar allt i rätt ordning):**

```powershell
.\START-ALL.ps1
```

Detta startar:
1. 📦 PostgreSQL Database (Docker)
2. 🔧 Backend (port 3001)
3. 🎨 Frontend (port 3000)

med health checks mellan varje steg.

**Eller manuellt (3 separata CMD-fönster - DEPRECATED):**
```
1-START-DB.bat        # Terminal 1
2-START-BACKEND.bat   # Terminal 2  
3-START-FRONTEND.bat  # Terminal 3
```

**Diagnostik:**
```powershell
.\DIAGNOSE.ps1        # Visa status på alla tjänster
.\STOP-ALL.ps1        # Stäng allt
```

### Portar

| Tjänst | Port |
|--------|------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| PostgreSQL | 5432 |

### API-endpoints

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/health` | Hälsokontroll + DB-status |
| GET | `/api/homey/temperatures` | Realtidstemperaturer från Homey |
| GET | `/api/homey/energy` | Realtidsenergidata från Homey |
| GET | `/api/history/temperatures` | Historisk temperaturlogg |
| GET | `/api/history/energy` | Historisk energilogg |

### Databasmodeller (Prisma)

- **TemperatureLog** – `deviceId`, `deviceName`, `zone`, `temperature`, `createdAt`
- **EnergyLog** – `deviceId`, `deviceName`, `zone`, `watts`, `createdAt`
- **ExternalData** – `source`, `data` (JSON), `fetchedAt`

---

## � Homey Pro - K7Energy API

**API-nyckel (2026-02-26):**  
`b4809290-ee33-47ec-a01e-709a79fef249:bff3730e-d41b-4647-b66c-5ba256c3769c:7d78b40e702dd6848f1e05abaedbb06a779a14bf`

Sparad i: `backend/.env` → `HOMEY_TOKEN`

---

## �🔴 NÄSTA SESSION - MÅSTE GÖRAS FÖRST

### VERSIONSNUMRET I DASHBOARD-RUBRIKEN ⭐⭐⭐

**Problem:** Dashboard visar inte versionsnumret. Användaren kan inte se att ny kod körs.

**Lösning:**
1. Läs `git describe --tags` och injicera i frontend environment
2. Visa i header: `Krokgatan 7 - v0.30`
3. Build med `docker-compose build --no-cache` (force rebuild!)
4. Verifiera: reload browser → ser du `v0.30`?
5. Bumpa till `v0.31`, ändra något litet, rebuild, verifiera

**Filer att ändra:**
- [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) – lägg till version i `<h1>`
- [frontend/Dockerfile](frontend/Dockerfile) – injicera version vid build
- [docker-compose.yml](docker-compose.yml) – pass version till frontend

**Användarens krav:** 30 år programmering = version i UI på VARJE change. Punkt.

---

## Session 2026-02-25 - Vad var gjort

✅ v0.29 sparat och pushad  
✅ Frontend production build fungerar  
✅ Infinite loop fixat (retries 20→3, refresh 30s→60s)  
✅ Homey Pro verifierat (backend hämtar enheter)  
✅ Zone-struktur redo (null | string)  

---

Aktuell version: **v0.31** (Zone-funktionaliteten implementerad)

---

## 🟢 SESSION 2026-02-27 CONT. - v0.31 Zone-Funktionalitet

✅ **v0.31 implementerad och pushad:**
- Backend: `/api/settings/sensors/:deviceId/zone` (PUT) - sparar zone per sensor
- Frontend: Zone-selector i Settings → Temperatursensorer
- UI: Radio buttons för INNE/UTE per sensor med async save-feedback
- Database: `SensorVisibility.zone` persisterar klassificering
- Async loading: "Sparar..." visas när zone uppdateras

**Commit:** `040825f` - "Implementera zone-funktionaliteten med backend-persistering"

**Test:** Gå till http://localhost:3000 → Settings → Temperatursensorer → klicka INNE/UTE för vilken sensor

---

**Versionshistorik:**
- **v0.31** 🟢 NYTT – Zone-funktionaliteten, backend-persistering av INNE/UTE klassificering
- **v0.30** ✅ STABILT – Version-display på två ställen, databasen körs, infinite loop fixat
- **v0.29** ✅ – Frontend production build, Tailwind CSS fixed
- **v0.28** ✅ – Zone-struktur i databas (zone nullable)

### Kommandot "starta"

Enklast möjliga: **Kör bara ett script**

```powershell
.\START-ALL.ps1
```

Det startar allt i rätt ordning med health checks.

**Eller diagnostisera befintligt system:**

```powershell
.\DIAGNOSE.ps1     # Visar vad som körs / inte körs
.\STOP-ALL.ps1     # Stänger allt
```

Frontend är då klar på: http://localhost:3000

---

### Kommandot "bumpa"

När användaren skriver **bumpa** ska följande göras automatiskt:

1. Läs senaste git-tag med `git tag --sort=-v:refname | head -1`
2. Incrementera med 0.01 (t.ex. `v0.01` → `v0.02`, `v0.09` → `v0.10`)
3. gör commit med kommentar om allt du gjort nyligen
4. Skapa ny annoterad tag: `git tag -a vX.XX -m "Release vX.XX"`
5. Pusha taggen: `git push origin vX.XX`
6. Bekräfta för användaren

---

## Viktiga filer

```
backend/src/app.ts                    # Serverstart, routes, health check
backend/src/modules/homey/            # Homey Pro-integration
  homey.service.ts                    # HTTP-anrop mot Homey API
  homey.controller.ts                 # Fastify route-definitioner
backend/src/modules/history/          # Historikdata från DB
  history.controller.ts
backend/src/shared/
  db.ts                               # Prisma-klient (singleton)
  scheduler.ts                        # Cron-jobb (var 5:e minut)
backend/prisma/schema.prisma          # Databasschema
frontend/src/app/page.tsx             # Dashboard-sidan
frontend/src/components/StatusCard.tsx # UI-komponent
frontend/src/lib/api.ts               # API-klient mot backend
shared/types.ts                       # Delade TypeScript-typer
```

---

## Vanliga åtgärder

```powershell
# Starta hela stacken
.\START-ALL.ps1

# Diagnostisera problem
.\DIAGNOSE.ps1

# Stäng allt
.\STOP-ALL.ps1

# Ny Prisma-migration efter schemaändring
cd backend
npx prisma migrate dev --name beskrivning

# Commit + push + tag
git add -A
git commit -m "meddelande"
git push
git tag -a vX.XX -m "Release vX.XX"
git push origin vX.XX
```

---

## Konventioner

- Kod och kommentarer skrivs på **svenska** (inklusive felmeddelanden i loggarna)
- Nya features läggs i egna moduler under `backend/src/modules/`
- Dela typer via `shared/types.ts` – importeras av både front och back
- Schemaläggaren (`scheduler.ts`) hanterar all bakgrundsloggning
- Kommentera bort `startScheduler()` i `app.ts` om Homey inte är konfigurerad
