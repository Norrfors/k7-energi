# CLAUDE.md – Instruktioner för AI-assistenten

Den här filen innehåller instruktioner och konventioner som gäller när GitHub Copilot / Claude hjälper till i det här projektet.

---

## Projekt: K7 Energi (Krokgatan 7)

Ett smarthems-dashboard som kopplar mot **Homey Pro** via lokalt nätverk och visar realtidsdata (temperaturer, energiförbrukning) i en webbapp. Specifikt för Krokgatan 7.

**Repo:** https://github.com/Norrfors/k7-energi

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

Aktuell version: **v0.71** (Tailscale remote access)

---

## 🪑 Bordsplacering-System (Vira)

**Katalog:** `Vira/`

**Filer:**
- **`vira.html`** (v0.89) ← **Huvudversion** - Bordslottning med 3 sorteringsmöjligheter
- `vira088.html` - Backup av tidigare version (sparad för referens)
- `bordsplacering.html` (v1.00) - Alternativ implementering (visuell grid-layout)

**Versionshistorik:** Se `Vira/VIRA-VERSION.md`

### vira.html v0.89 - Bordslottning med sortering
**Primär funktion:** Generera slumpmässiga bordsplaceringar för 32 spelare vid 8 bord

#### Funktionalitet
- 📂 **Filuppladdning** - ladda deltagarlista (`.txt`, `.csv`)
- 🔄 **Automatisk parsning** - format: `Nr;Förnamn;Efternamn`
- **3 sorteringsalternativ** när spelare visas:
  - 🔢 **Nummer** (1-32 stigande) → visar "Förnamn Efternamn"
  - 🔤 **Förnamn** (alfabetiskt A-Ö) → visar "Förnamn Efternamn"
  - 🔤 **Efternamn** (alfabetiskt A-Ö, sekundär på förnamn) → visar "**Efternamn Förnamn**"
- 🎲 **Generera schema** - algoritm minimerar upprepade par
- 👤 **Visa per bord** eller **Visa per spelare** - två layoutlägen
- 🖨️ **Skriv ut/PDF** - optimering för utskrift

#### Layout & Design
- Alla knappar på **en rad** för maximering av deltagar-rader
- Version i rubrikraden: "Vira v0.89 · 32 deltagare · 8 bord · 6 omgångar"
- "Klicka på siffra..."-hint visas endast i "vis per bord"-vyn
- Sorteringsknapparna ligger direkt efter filnamnet
- Filnamn visas renare (utan prefix)

#### Format för medlemslista
```
Nr;Förnamn;Efternamn
1;Anders;Berkmo
2;Anna;Svanquist
3;Anita;Bergstedt
```

Separatorer som stöds: `;` (semikolon), `\t` (tab), `,` (komma)

---

## bordsplacering.html v1.00 - Visuell bordsplaceringslayout

**Alternativ implementering** med grid-baserad visuell layout (se `Vira/VERSION.md`)

---

## 🟢 SESSION 2026-02-28 CONT. - v0.41 Energisensor-Historik

✅ **v0.41 implementerad:**
- **Backend endpoint:** `/api/history/energy-summary` - returnerar aktuell förbrukning + medelvärden för 1h/12h/24h
- **API struktur:** `currentWatts`, `averageWatts1h`, `averageWatts12h`, `averageWatts24h`
- **Frontend funktioner:** `getEnergySummary()` och `getEnergyHistory()` i `api.ts`
- **Database:** Använder befintlig `EnergyLog` för historikdata
- **Beräkningar:** Genomsnittsvärden beräknas baserat på alla datapunkter för aktuell tidsperiod

**Nästa steg:**
- Visa detta på Dashboard (nya widget för energiförbrukning)
- UI för att visa senaste timmen, senaste 12 tim, senaste 24 tim

---

**Versionshistorik:**
- **v0.71** 🟢 NYTT – Tailscale Docker-sidecar, remote access via https://k7-energi.tail498395.ts.net
- **v0.70** ✅ – meterImported (meter_power.imported) som primär källa för exakt förbrukning
- **v0.69** ✅ – Fixat totalMeterValue (visade 291 kWh istället för ~65100), korrekta kolumnrubriker
- **v0.68** ✅ – Inline kalibrering under Inställningar/El, Mätardata flyttat dit, flicker-fix
- **v0.67** ✅ – Dagsaggregering, EnergySettings (spotpris, nätavgift), mätarkalibrering
- **v0.60** ✅ – Zonmappning för energisensorer, rensat versionsvisning
- **v0.59** ✅ – Zonmappning från sensorer.txt: Soldäck, Altan norr, Kök, Tvätt/Pann/Bad
- **v0.58** ✅ – Hårdkoda version i layout.tsx, ta bort miljövariabler för version
- **v0.41** ✅ – Energisensor-historik API (aktuell + 1h/12h/24h medelvärden)
- **v0.40** ✅ – Dual API response (zone från Homey + classification från DB)
- **v0.31** ✅ – Zone-funktionaliteten, backend-persistering av INNE/UTE klassificering
- **v0.30** ✅ – Version-display, databasen körs, infinite loop fixat

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

Se globalt versionsregelverk: `C:\Users\perno\OneDrive\Dokument\Claude\memory\versioning_rules.md`

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

---

## 🟢 Status-feedback till användaren

**VIKTIGT:** När jag avslutar arbete och systemet är klart för testning ska jag skriva:

```
KLART vX.XX
```

Där `X.XX` är det versionsnummer som ska visas i dashboardrubrikens header.

**Exempel:**
- `KLART v0.53` – systemet är klar, användaren ska se v0.53 i rubriken
- `KLART v0.54` – nya ändringar, v0.54 ska visas

Detta är **TYDLIGHETEN** som krävs för att användaren vet att testning kan påbörjas.


## Workflow Orchestration
1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons .md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it
6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
Task Management
1. **Plan First**: Write plan to `tasks/todo .md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo .md`
6. **Capture Lessons**: Update `tasks/lessons .md` after corrections
## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
