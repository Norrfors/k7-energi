# Hem Dashboard – Smarthems-Dashboard för Homey Pro

[![Version](https://img.shields.io/github/v/tag/Norrfors/k7-energi?label=version)](https://github.com/Norrfors/k7-energi/releases)

En komplett webbapplikation för att övervaka och styra **Krokgatan 7** via **Homey Pro**. Systemet samlar realtidsdata från smarthemenheten, lagrar historisk data i en databas och presenterar det i ett interaktivt dashboard med möjlighet till fjärråtkomst över lokalt nätverk.

**Repo:** https://github.com/Norrfors/k7-energi  
**Aktuell version:** v0.40  
**Teknikstack:** TypeScript, Fastify, Next.js 14, PostgreSQL, Prisma ORM, Tailwind CSS  
**Status:** ✅ Produktion-redo för lokal nätverk

---

## ⚡ Quick Start

### 1. Förutsättningar
- Windows 10+ (PowerShell 5.1+)
- Node.js v18+
- Docker Desktop
- Homey Pro på lokala nätverket (t.ex. `192.168.1.122`)

### 2. Installation

```powershell
# Klona repository
git clone https://github.com/Norrfors/k7-energi.git
cd k7-energi

# Installera dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Starta allt automatiskt

Kör `start.ps1`-skriptet från projektets rotmapp:

```powershell
.\start.ps1
```

**Vad skriptet gör:**
1. ✅ Stoppar gamla Node.js-processer
2. ✅ Startar PostgreSQL i Docker
3. ✅ Startar backend-servern
4. ✅ **Väntar** på att backend är redo (poll `/api/health`)
5. ✅ Startar frontend-servern
6. ✅ Visar status och URL:er

**Resultat:**
```
✓ Backend ready!
✓ Frontend starting...
✓ All services running!

📊 Dashboard:  http://localhost:3000 (eller 192.168.1.211:3000)
🔧 API:        http://localhost:3001
```

### 4. Stoppa tjänsterna

Starta **Task Manager** → Sök `node.exe` → Högerklick → **End Task**

Ellan kan du köra:
```powershell
taskkill /f /im node.exe
```

### 🆘 Troubleshooting

**"Connection refused" eller "ERR_NETWORK" i webbläsaren?**
- Vänta 5 sekunder efter att `start.ps1` slutförts
- Backend behöver tid att ansluta till database och Homey
- Uppdatera webbläsaren (F5)

**Backend startar inte?**
- Kontrollera att Docker Desktop körs: `docker ps`
- Kontrollera att port 3001 är ledig: `netstat -ano | findstr :3001`
- Om den är upptagen: `taskkill /f /im node.exe` och försök igen

**Kan inte nå Homey (alla mätvärden är 0)?**
- Verifiera Homey Pro IP: Se `backend/.env` eller `HOMEY_IP` i loggarna
- Pinga Homey från Command Prompt: `ping 192.168.1.122`
- Kontrollera brandvägg

---

## 📋 Systemöversikt

### Arkitektur

```
┌──────────────────────────────────────────────────────────────┐
│                  WEBBLÄSARE (Frontend)                       │
│         http://192.168.1.211:3000 eller localhost:3000      │
│  📊 Dashboard | 📈 Mätardata | ⚙️ Inställningar             │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP/REST (CORS enabled)
                       └─→ window.location.hostname:3001
┌──────────────────────▼───────────────────────────────────────┐
│              BACKEND API (Fastify)                           │
│         http://0.0.0.0:3001 (alla nätverksgränssnitt)        │
│  Startas med: $env:HOST="0.0.0.0"; npm run dev             │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP (Bearer token auth)
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────────┐  ┌──▼────────────┐
│ HOMEY PRO      │  │ PostgreSQL DB │
│ (192.168.1.122)│  │ (Docker :5432)│
│ • Temperaturer│  │ • MeterReading│
│ • Energimätare│  │ • TemperatureLog
└────────────────┘  │ • EnergyLog    │
                    └────────────────┘
```

### Datakällor & Uppdateringsintervall

| Datakälla | Homey-fält | Uppdates | Intervallt | Lagring |
|-----------|-----------|----------|-----------|---------|
| **Temperaturer** | temperaturSensor.measure_temperature | Real-time | 5 min | TemperatureLog |
| **Momentan effekt** | energyMeter.measure_power | Real-time | 5 min | EnergyLog |
| **Ackumulerad förbrukning** | energyMeter.meter_power | Real-time | 1 min | MeterReading |

---

## 🎯 Frontend-Funktionalitet

### 1. Dashboard-flik
**Syfte:** Snabb systemöversikt

- **Systemstatus-kort:**
  - Backend: Visar om API är tillgänglig
  - Database: Visar om PostgreSQL är ansluten
  - Homey: Visar om Homey Pro är tillgänglig
  
- **Temperatur-rutnät:** Visar alla temperatursensorer från Homey med:
  - Sensornamn
  - Nuvarande temperatur
  - Rum/zon
  - Senaste uppdatering
  
- **Energi-rutnät:** Visar all energikonsumtion med:
  - Mätarnamn (t.ex. "Pulse Krokgatan 7")
  - Momentan effektförbrukning i Watt
  - Senaste uppdatering

### 2. Mätardata-flik
**Syfte:** Detaljöversikt över elförbrukning

- **Aktuell status-kort:**
  - Förbrukning sedan midnatt (från Homey meter_power)
  - Total ackumulerad förbrukning sedan installation
  
- **24-timmars historik-tabell:**
  - Visar de senaste mätpunkterna från databasen
  - Automatisk uppdatering varje 60 sekund
  - Sorterat från nyast till äldst
  
- **Diagnostik:**
  - Visar när mätvärden uppdaterades senast
  - Råddata från Homey för verifikation

### 3. Inställningar-flik
**Syfte:** Manuell konfiguration och korrektioner

- **Mätkorrektion:**
  - Textfält för att ange nytt totalMeterValue
  - Validering för rimliga värden (ej negativa, ej för höga ändringar)
  - Verifiering av måttet före uppdatering
  - Framgångs-/felmeddelande
  
- **Beräkningsmall:**
  - Visar formel för hur systemet beräknar förbrukningen
  - Hjälp för felsökning om värdena verkar felaktiga

---

## 🔌 REST API-Endpoints

### `/api/health`
```http
GET /api/health
```
Kontrollerar systemhälsa och all infrastruktur.

**Svar (200 OK):**
```json
{
  "status": "ok",
  "time": "2026-02-21T20:45:30.123Z",
  "database": "ansluten"
}
```

**Möjliga databas-värden:**
- `"ansluten"` – PostgreSQL är igång
- `"ej ansluten"` – PostgreSQL är inte nåbar

---

### Homey Data

#### `GET /api/homey/temperatures`
Hämtar all temperaturdata från Homey Pro.

**Svar (200 OK):**
```json
[
  {
    "deviceName": "Stue",
    "temperature": 21.5,
    "zone": "Vardagsrum",
    "lastUpdated": 1771703450000
  },
  {
    "deviceName": "Sovrum",
    "temperature": 19.2,
    "zone": "Sovrum",
    "lastUpdated": 1771703450000
  }
]
```

#### `GET /api/homey/energy`
Hämtar momentan energikonsumption från Homey.

**Svar (200 OK):**
```json
[
  {
    "deviceName": "Pulse Krokgatan 7",
    "watts": 5775,
    "meterPower": 116.47,
    "zone": "Okänd",
    "lastUpdated": 1771703450000
  }
]
```

**Fält:**
- `watts` – Momentan effekt från `measure_power`
- `meterPower` – Ackumulerad förbrukning från `meter_power`, uppdateras var minut

---

### Mätardata (Meter)

#### `GET /api/meter/latest`
Hämtar senaste mätningspunkt från databasen.

**Svar (200 OK):**
```json
{
  "consumptionSinceMidnight": 116.47,
  "consumptionSincePreviousReading": 0.25,
  "totalMeterValue": 10003.45,
  "lastUpdated": "2026-02-21T20:45:30.000Z"
}
```

#### `GET /api/meter/last24h`
Hämtar alla mätpunkter från de senaste 24 timmarna.

**Svar (200 OK):**
```json
[
  {
    "consumptionSinceMidnight": 95.20,
    "consumptionSincePreviousReading": 0.20,
    "totalMeterValue": 9989.30,
    "time": "2026-02-20T20:45:30.000Z"
  },
  {
    "consumptionSinceMidnight": 115.50,
    "consumptionSincePreviousReading": 0.15,
    "totalMeterValue": 10002.80,
    "time": "2026-02-21T19:45:30.000Z"
  },
  {
    "consumptionSinceMidnight": 116.47,
    "consumptionSincePreviousReading": 0.97,
    "totalMeterValue": 10003.45,
    "time": "2026-02-21T20:45:30.000Z"
  }
]
```

**Använt av:** Frontend Mätardata-flik för att visa 24-timmars historik

#### `POST /api/meter/set-manual`
Uppdaterar mätarvärdet manuellt om det blivit felaktigt.

**Request:**
```json
{
  "totalMeterValue": 10500.00
}
```

**Svar (200 OK):**
```json
{
  "success": true,
  "reading": {
    "consumptionSinceMidnight": 116.47,
    "totalMeterValue": 10500.00,
    "lastUpdated": 1771703450000,
    "time": "2026-02-21T20:45:45.000Z"
  }
}
```

**Viktigt:** Systemet bevarar `consumptionSinceMidnight` från Homey och uppdaterar bara `totalMeterValue`.

**Felkod (400 Bad Request):**
```json
{
  "error": "Invalid totalMeterValue"
}
```

---

## 📊 Databasmodeller (Prisma)

### MeterReading
**Syfte:** Lagra ackumulerad mätardata varje minut för trendanalys.

| Kolumn | Typ | Beskrivning | Status |
|--------|-----|-------------|--------|
| `id` | Integer | Primärnyckel, auto-increment | |
| `deviceId` | String | Homey-enhetens unika ID | Default: "c2314e97-c95b-40d4-9393-dbc541d586d1" |
| `deviceName` | String | "Pulse Krokgatan 7" | Default: "Pulse Krokgatan 7" |
| `consumptionSinceMidnight` | Float | Förbrukning från midnatt (kWh) | Från Homey `meter_power` |
| `consumptionSincePreviousReading` | Float | Förbrukning sedan föregående avläsning (kWh) | Beräknad delta |
| `totalMeterValue` | Float | Total ackumulerad förbrukning (kWh) | Beräknad av scheduler |
| `createdAt` | DateTime | Tidsstämpel | Auto-set |

**Index:**
- Composite: `(deviceId, createdAt)` – optimerar tidsseriefrågningar för "senaste 24 timmar"

**Beräknadslogik för totalMeterValue:**
```typescript
if (today !== lastReading.date) {
  // Nytt dygn: Lägg till förra dagens fullständiga förbrukning
  totalMeterValue = lastReading.totalMeterValue + lastReading.consumptionSinceMidnight;
} else {
  // Samma dag: Lägg till delta
  totalMeterValue = lastReading.totalMeterValue + (consumptionSinceMidnight - lastReading.consumptionSinceMidnight);
}
```

**Viktigt:** Datum-baserad jämförelse för midnattsskifte – inte värde-baserad för att undvika falska nollställningar från sensorbrus.

---

### TemperatureLog
**Syfte:** Lagrad temperaturhistorik för trendanalys (var 5:e minut).

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | Integer | Primärnyckel |
| `deviceId` | String | Homey-enhetens ID |
| `deviceName` | String | Sensornamn (t.ex. "Stue") |
| `zone` | String | Rumszon/område |
| `temperature` | Float | Temperatur i °C |
| `createdAt` | DateTime | Tidsstämpel |

---

### EnergyLog
**Syfte:** Lagrad energihistorik för effektkonsumtion (var 5:e minut).

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | Integer | Primärnyckel |
| `deviceId` | String | Mätarens ID |
| `deviceName` | String | Mätarnamn |
| `zone` | String | Rumszon |
| `watts` | Float | Momentan effekt i Watt (från `measure_power`) |
| `createdAt` | DateTime | Tidsstämpel |

---

## ⏰ Schemalagda Jobb (Scheduler)

Backends schemaläggare uppdaterar data automatiskt:

| Intervall | Funktion | Detalj |
|-----------|----------|--------|
| **Varje minut** | `updateMeterReading()` | Hämtar `meter_power` från Homey, beräknar daglig ackumulering, sparar i `MeterReading`-tabell |
| **Var 5:e minut** | `logTemperatures()` | Hämtar alla temperatursensorer, sparar i `TemperatureLog` |
| **Var 5:e minut** | `logEnergy()` | Hämtar energimätare (`measure_power`), sparar i `EnergyLog` |

**Loggning:** Alla jobb loggar till `backend/loggfil.txt` med ISO-tidsstämplar och modulnamn.

**Status:** Schemaläggaren startas vid backend-initialisering och kör tills processen avslutas.

---

## 🔐 Säkerhet & Konfiguration

### Homey API-anslutning

**Protocol:** HTTP med Bearer token-autentisering  
**Adress:** `192.168.1.122:80` (lokalt nätverk)  
**Autentisering:** Authorization-header: `Bearer <token>`

**Till att hämtas från Homey Pro Web App:**
1. Gå till https://my.homey.app
2. **Settings → API Keys**
3. Klicka **New API Key**
4. Välj rätt behörigheter (åtminstone "Devices.ReadOnly")
5. Kopiera token

**.env-konfiguration:**
```env
HOMEY_ADDRESS=http://192.168.1.122
HOMEY_TOKEN=<din-token-här>
DATABASE_URL=postgresql://user:password@localhost:5432/hemdb
PORT=3001
```

### CORS (Cross-Origin Resource Sharing)

**Backend-konfiguration** (`backend/src/app.ts`):
```typescript
await app.register(cors, {
  origin: true, // Tillåter alla ursprung under utveckling
});
```

**Miljöer:**
- **Lokal utveckling:** `origin: true` – tillåter 192.168.x.x från andra maskiner
- **Produktion:** Bör begränsas till specifika domäner

**Viktigt:** Se [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md) för nätverk-setup.

### API-Autentisering
- **Homey API:** Bearer token i HTTP-header
- **Frontend ↔ Backend:** Ingen autentisering (båda lokala)
- **Database:** PostgreSQL, endast lokal anslutning, ingen externa ports öppna

---

## 🌐 Nätverksåtkomst (Lokalt nätverk)

### Åtkomstmetoder

| Scenario | URL | Fungerar | Notering |
|----------|-----|---------|----------|
| Samma dator | `http://localhost:3000` | ✅ | Snabbt, ingen nätverk |
| Annan dator på nätverk | `http://192.168.1.211:3000` | ✅ | Kräver HOST=0.0.0.0 |

### Konfiguration för nätverk

**Backend startas med:**
```powershell
cd backend
$env:HOST="0.0.0.0"  # Lyssnar på alla nätverksgränssnitt
npm run dev
```

**Frontend startas med:**
```powershell
cd frontend
$env:HOST="0.0.0.0"  # Lyssnar på alla nätverksgränssnitt
npm run dev
```

**Dynamisk API-URL** (`frontend/src/lib/api.ts`):
```typescript
const getApiBase = () => {
  if (typeof window === "undefined") {
    return "http://localhost:3001"; // SSR fallback
  }
  const hostname = window.location.hostname;  // 192.168.1.211 eller localhost
  return `http://${hostname}:3001`;
};
```

**Resultat:**
- Om du öppnar `http://192.168.1.211:3000` i webbläsaren
- Frontend ansluter automatiskt till `http://192.168.1.211:3001`

### Felsökning

Få "Kunde inte ansluta till backend. Kör den på port 3001?" från annan dator?

**Se:** [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md)

**Snabb checklista:**
1. Backend körs med `$env:HOST="0.0.0.0"`
2. Frontend körs med `$env:HOST="0.0.0.0"`
3. CORS är konfigurerad med `origin: true` i `app.ts`
4. Brandvägg blockerar inte port 3001

---

## 📝 Loggning & Diagnostik

### Backend-loggning

**Plats:** `backend/loggfil.txt`

**Format:**
```
[ModuleNamn] LEVEL: Meddelande
[MeterService] INFO: DEBUG pulseData: {"deviceId":"c2314e97...","meterPower":116.47}
[Scheduler] INFO: Uppdaterar mätardata för Pulse Krokgatan 7...
[MeterService] INFO: Mätardata uppdaterad: förbrukning=116.47 kWh, total=10003.45 kWh
```

### Logger-klassen

**Fil:** `backend/src/shared/logger.ts`

**Nivåer:**
- DEBUG – Detaljerad information för felsökning
- INFO – Normala operationer
- WARN – Varningar
- ERROR – Felmeddelanden

**Exempel:**
```typescript
logger.info("Mätardata uppdaterad", { consumption: 116.47 });
logger.error("Kunde inte hämta från Homey", error);
```

### Felsökning med loggning

**Visa senaste 20 rader:**
```powershell
Get-Content backend/loggfil.txt | Select-Object -Last 20
```

**Sök efter fel:**
```powershell
Get-Content backend/loggfil.txt | Select-String "ERROR"
```

**Sök efter specifika moduler:**
```powershell
Get-Content backend/loggfil.txt | Select-String "MeterService"
```

**Rensa loggfil:**
```powershell
"" | Set-Content backend/loggfil.txt
```

---

## 🚀 Installation & Starta

### Förutsättningar

Installera på Windows-datorn:

1. **Node.js LTS 20+** – https://nodejs.org
2. **Git** – https://git-scm.com/download/win
3. **Docker Desktop** – https://www.docker.com/products/docker-desktop
4. **Visual Studio Code** (valfritt) – https://code.visualstudio.com

### Steg 1: Klona projektet

```powershell
cd $env:USERPROFILE\Documents
git clone https://github.com/Norrfors/k7-energi.git
cd k7-energi
```

### Steg 2: Konfigurationsfilel

```powershell
copy .env.example .env
```

**Redigera `.env` med dina värden:**
```env
HOMEY_ADDRESS=http://192.168.1.122
HOMEY_TOKEN=<din-homey-api-token>
DATABASE_URL=postgresql://postgres:password@localhost:5432/hemdb
PORT=3001
```

### Steg 3: Starta infrastruktur

**Terminal 1 – Database:**
```powershell
docker compose up -d
Start-Sleep -Seconds 3
docker compose ps  # Verifiera att k7-energi-db-1 kör
```

### Steg 4: Starta Backend

**Terminal 2:**
```powershell
cd backend
npm install
npx prisma migrate dev --name init  # Första gången
$env:HOST="0.0.0.0"
npm run dev
```

Vänta tills du ser:
```
🚀 Backend kör på http://localhost:3001
```

### Steg 5: Starta Frontend

**Terminal 3:**
```powershell
cd frontend
npm install
$env:HOST="0.0.0.0"
npm run dev
```

Vänta tills du ser:
```
✓ Compiled / in 1388ms
```

### Steg 6: Öppna i webbläsare

- **Samma dator:** http://localhost:3000
- **Annat nätverk:** http://192.168.1.211:3000

---

## 📋 Vanliga Kommandon

### Database

```powershell
# Starta
docker compose up -d

# Stoppa
docker compose down

# Rensa all data
docker compose down -v

# Visa status
docker compose ps

# Se loggningar
docker compose logs -f db
```

### Prisma (Database ORM)

```powershell
cd backend

# Skapa migration efter schemaändring
npx prisma migrate dev --name beskrivning

# Öppna visuell databasverktyg
npx prisma studio

# Resetera databas (VARNING: Raderar all data)
npx prisma migrate reset
```

### Backend

```powershell
cd backend

# Starta med auto-reload
npm run dev

# Starta med produktionsinställningar
npm start

# Bygg för produktion
npm run build

# Kör ESLint
npm run lint
```

### Frontend

```powershell
cd frontend

# Starta med auto-reload
npm run dev

# Bygg för produktion
npm run build

# Kör Next.js dev server
npm run dev

# Öppna webpack analyzer
npm run analyze
```

### Git & Versioner

```powershell
# Se version
git tag --sort=-v:refname | head -1

# Skapa ny version
git add -A
git commit -m "Meddelande om vad som ändrats"
git tag -a v0.03 -m "Release v0.03"
git push origin v0.03
```

---

## 🏗️ Projektstruktur

```
k7-energi/
├── README.md                          # Detta dokument
├── NETWORK_TROUBLESHOOTING.md         # Nätverk-felsökning
├── CLAUDE.md                          # AI-assistentinstruktioner
├── docker-compose.yml                 # PostgreSQL-container
├── .env.example                       # Konfigurationsmall
│
├── backend/                           # Fastify API-server
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json                   # Auto-reload config
│   ├── src/
│   │   ├── app.ts                     # Startfil – initialisering
│   │   ├── modules/
│   │   │   ├── homey/
│   │   │   │   ├── homey.service.ts   # Homey API-klient
│   │   │   │   ├── homey.controller.ts # Routes
│   │   │   │   └── homey.discover.ts  # Enhetsdetektering
│   │   │   ├── meter/
│   │   │   │   ├── meter.service.ts   # Mätarlogik
│   │   │   │   └── meter.controller.ts # Routes
│   │   │   └── history/
│   │   │       └── history.controller.ts # Historik-routes
│   │   └── shared/
│   │       ├── db.ts                  # Prisma singleton
│   │       ├── scheduler.ts           # Cron-jobb
│   │       └── logger.ts              # Loggning
│   ├── prisma/
│   │   ├── schema.prisma              # Databasschema
│   │   └── migrations/                # Migreringshistorik
│   └── loggfil.txt                    # Körningslogg
│
├── frontend/                          # Next.js webbgränssnitt
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx             # Huvudlayout
│       │   ├── page.tsx               # Dashboard (alla tabbar)
│       │   └── globals.css            # Globala stilar
│       ├── components/
│       │   └── StatusCard.tsx         # Info-kort komponenter
│       └── lib/
│           └── api.ts                 # API-klient
│
├── shared/                            # Delade typer
│   ├── package.json
│   └── types.ts                       # TypeScript-gränssnitt
│
└── .gitignore                         # Git-ignorefiler
```

---

## 📚 Dokumentation

- **[NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md)** – Nätverk- och CORS-problem
- **[CLAUDE.md](CLAUDE.md)** – AI-assistentinstruktioner och konventioner
- **GitHub Issues** – Feature-förfrågningar och felrapporter
- **Prisma Docs** – https://www.prisma.io/docs

---

## 🐛 Vanliga Problem

### "Kunde inte ansluta till backend"
**Se:** [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md)

### "Port 3000 är redan i bruk"
```powershell
# Hitta process på port 3000
netstat -ano | findstr ":3000"

# Döda processen (ersätt PID)
taskkill /PID 12345 /F

# Eller dödaalla Node-processer
taskkill /F /IM node.exe
```

### "Database connection failed"
```powershell
# Verifiera Docker-container
docker compose ps

# Om den inte kör, starta den
docker compose up -d
```

### "env-filen hittas inte"
```powershell
# Skapa från mall
copy .env.example .env

# Redigera med dina värden
code .env
```

---

## � Backup & Dataöverlevnad

### Backup-princip

Systemet använder **automatiserad backup via Windows Task Scheduler** för att skydda kritisk data.

#### PostgreSQL-databas (Automatiserad)

**Vad backas upp?**
- All tabelldal (TemperatureLog, EnergyLog, MeterReading)
- Databasschema
- Användaruppgifter

**Backupprocedur:**
```
Windows Task Scheduler (runs powerShell)
    ↓
backup-database.ps1 (via Docker exec)
    ↓
pg_dump → PostgreSQL-dumpfil (SQL)
    ↓
C:\Users\jan\OneDrive\Dokument\Backup\mittproject_YYYY-MM-DD_HHMM.sql
```

**Schemaläggning:**
- **Kl 11:00** – Task: `K7-Energi-Backup-1100`
- **Kl 23:00** – Task: `K7-Energi-Backup-2300`

**Retention:**
- Behålls de 14 senaste backups (gamla raderas automatiskt)
- Historik tydlig genom tidstämpel i filnamn

**Installation av backup-tidsschema:**
```powershell
# Högerklicka som Admin på:
C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi\scripts\install-backup-scheduler.bat

# Verifiering av Tasks:
schtasks /query | findstr "K7-Energi-Backup"
```

**Manuell backup (testsyfte):**
```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi\scripts\backup-database.ps1"
```

#### Lokala filer (Manuell backup rekommenderas)

Dessa filer bör **INTE** commitas till GitHub och måste backas upp separat:

| Fil/Mapp | Syfte | Lagring | Notering |
|----------|-------|---------|----------|
| `.env` | Databaskredentialer, Homey API-keys | `C:\Users\jan\OneDrive\Dokument\` | **KRITISK** – innehåller secrets |
| `backend/loggfil.txt` | Systemloggar med svenska timestamps | `C:\Users\jan\OneDrive\Dokument\Backup\` | Växer över tid, görs inte automatiskt |
| `docker-compose.yml` | Docker-konfiguration | GitHub (tracked) | Redan versionshanterad |
| `backend/prisma/schema.prisma` | Databasschema | GitHub (tracked) | Redan versionshanterad |

**Rekommenderat backup-schema för lokala filer:**
```powershell
# Manuell veckovis backup av känsliga filer
$backupDir = "C:\Users\jan\OneDrive\Dokument\Backup"
$date = Get-Date -Format "yyyy-MM-dd"

# Backa upp .env
copy ".env" "$backupDir\env_$date.bak"

# Backa upp loggfil
copy "backend/loggfil.txt" "$backupDir\loggfil_$date.txt"
```

#### Återställning från backup

**Från PostgreSQL-backup:**
```powershell
# Med Docker igång:
docker exec k7-energi-db psql -U dev -d mittproject < C:\Users\jan\OneDrive\Dokument\Backup\mittproject_2026-02-22_1100.sql

# Eller återställ databasen helt:
docker compose down
docker volume rm k7-energi_pgdata
docker compose up -d db
```

**Från .env-backup:**
```powershell
copy "$backupDir\env_2026-02-22.bak" ".env"
code .env  # Verifiera innehållet
```

---

## 📈 Framtida Features

- [ ] Grafer för trendanalys (over tid)
- [ ] Automatisk aviseringar vid högt förbruk
- [ ] Exportera data till CSV
- [ ] API-autentisering med JWT
- [ ] Molndistributerad deployment
- [ ] Mobilapp
- [ ] Styra enheter från dashboard (inte bara läsa)
- [ ] Webbaserat backup-gränssnitt (UI för att trigga backups manuellt)
- [ ] Loggfil-rotation (auto-cleanup av gamla loggfiler)

---

## 📄 Licens

Privat projekt – endast för personlig användning.

---

## Versionshistorik

- **v0.02** (2026-02-21) – CORS-fix för nätverk, 24h mätarhistorik
- **v0.01** (2026-02-21) – Initial release med Homey-integration och mätardata

Se [GitHub Releases](https://github.com/Norrfors/k7-energi/releases) för fullständig historik.

---

*Senast uppdaterad: 2026-02-21*
