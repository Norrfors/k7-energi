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

**En terminal:**

```bash
docker-compose up -d
```

Sedan öppna: http://localhost:3000

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

Aktuell version: **v0.30** (STABILT & FUNGERANDE)

---

## 🟢 SESSION 2026-02-27 - v0.30 COMPLETE

✅ **Versionsnumret är nu synligt på två ställen:**
- Dashboard-header (layout.tsx): "Krokgatan 7 - v0.30"
- K7 Energi Dashboard-sektionen: "v0.30"

✅ **Databas:**
- PostgreSQL körs i Docker (homey_db)
- Alla 7 Prisma-migrationer körda
- Tabeller skapade: TemperatureLog, EnergyLog, MeterReading, BackupSettings, SensorVisibility

✅ **Backend & Frontend:**
- Startas lokalt med npm run dev
- Database URL: `postgresql://postgres:postgres@localhost:5432/homey_db`
- Inga hardkodade version-strings – allt från git describe --tags

✅ **Infinite loop fixat:**
- API retries: 20 → 3 försök
- Auto-refresh: 30s → 60s
- Frontend fallback när Homey inte svarar: "Homey ej ansluten"

**Commit:** `37b83a4` - "Fixa version-display även i dashboard-header"

---

## 🔴 NÄSTA PRIORITET - ZONE-FUNKTIONALITETEN (v0.31)

**Mål:** Användaren ska kunna ange i vilken ZON varje Homey-enhet finns.

**Tidigare implementation:** v0.23 hade en zone-UI som kunde tilldelad enheterna.

**Vad behövs:**
1. Backend-endpoint för att spara zone för en enhet
2. Frontend UI för zone-tilldelning (INNE/UTE dropdown)
3. Persistering i databasen (`SensorVisibility.zone`)
4. Sortera/filtrera dashboard efter zone

Versionstaggar följer formatet `vX.XX` (t.ex. `v0.28`, `v0.29`, `v0.30`).

**Versionshistorik:**
- **v0.30** 🟢 STABILT – Version-display på två ställen, databasen körs, infinite loop fixat
- **v0.29** ✅ – Frontend production build, Tailwind CSS fixed
- **v0.28** ✅ – Zone-struktur i databas (zone nullable)

### Kommandot "starta"

Kör dessa 3 commands i **3 separata CMD-fönster**:

```bash
1-START-DB.bat        # Terminal 1
2-START-BACKEND.bat   # Terminal 2  
3-START-FRONTEND.bat  # Terminal 3
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

```bash
# Starta hela stacken
docker compose up -d
cd backend && npm run dev
cd frontend && npm run dev

# Ny Prisma-migration efter schemaändring
cd backend && npx prisma migrate dev --name beskrivning

# Bygg för produktion
cd backend && npm run build
cd frontend && npm run build

# Commit + push
git add -A && git commit -m "meddelande" && git push
```

---

## Konventioner

- Kod och kommentarer skrivs på **svenska** (inklusive felmeddelanden i loggarna)
- Nya features läggs i egna moduler under `backend/src/modules/`
- Dela typer via `shared/types.ts` – importeras av både front och back
- Schemaläggaren (`scheduler.ts`) hanterar all bakgrundsloggning
- Kommentera bort `startScheduler()` i `app.ts` om Homey inte är konfigurerad
