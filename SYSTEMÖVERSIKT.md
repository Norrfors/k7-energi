# K7 ENERGI DASHBOARD - SYSTEMÖVERSIKT

En guide för nybörjare: Vad gör de olika delarna, var finns dom, när startas dom, osv.

═══════════════════════════════════════════════════════════════════════════════

## SYSTEMETS TRE HUVUDDELAR

### 1. FRONTEND (Det du ser i webbläsaren) 🎨
├─ Vad gör det:      Visar dashboarden med temperaturer, energiförbrukning, kostnad
├─ Var finns det:    frontend/ mapp
├─ Webbadress:       http://localhost:3000
├─ Startas:          Automatisk när du kör `docker-compose up -d`
├─ Språk:            TypeScript + React
├─ Framework:        Next.js 14
└─ Visar:
   • Real-time temperaturer från alla rum
   • Energiförbrukning (Watt) från alla sensorer
   • Kostnad (kr) sedan midnatt
   • Historik när du klickar på en sensor
   • Capabilities-modal för att välja vad som ska loggas

---

### 2. BACKEND (Servern som hämtar data) 🔧
├─ Vad gör det:      Hämtar data från Homey Pro, sparar i databas, exponerar API
├─ Var finns det:    backend/ mapp
├─ API-adress:       http://localhost:3001
├─ Startas:          Automatisk när du kör `docker-compose up -d`
├─ Språk:            TypeScript
├─ Framework:        Fastify + Node.js
└─ Gör specifikt:
   • Kopplar mot Homey Pro på 192.168.1.122
   • Hämtar temperaturer från alla temperaturgivare
   • Hämtar energidata från Pulse-mätaren
   • Sparar ALT data i PostgreSQL-databasen
   • Kör schemalagda jobb var 5:e minut (cron)
   • Exponerar REST API för frontend att använda

---

### 3. DATABAS (Lagrar allt data) 🗄️
├─ Vad gör det:      Lagrar all historikdata så den inte försvinner
├─ Var finns det:    Docker-container: homey_db
├─ Databastyp:       PostgreSQL 16
├─ Port (internt):   5432
├─ Startas:          Automatisk när du kör `docker-compose up -d`
└─ Lagrar tabeller:
   • TemperatureLog    - Alla temperaturmätningar (tid, rum, värde)
   • EnergyLog         - Alla energimätningar + kostnad
   • SensorVisibility  - Vilka sensorer som ska visas, vilka fält som loggas
   • MeterCalibration  - Manuella kalibreringar av elmätaren
   • BackupSettings    - Användarens backupkonfiguration

═══════════════════════════════════════════════════════════════════════════════

## STARTPROCESS - VAD SOM HÄNDER NÄR DU KÖR docker-compose up -d

STEG 1: Du skriver kommandot i terminal
   └─> docker-compose up -d
   
STEG 2: Docker startar 3 containers (servrar)
   ├─ PostgreSQL databas          (tar 10-15 sekunder att vara klar)
   ├─ Backend Node.js-server      (väntar på att DB är redo)
   └─ Frontend Next.js-app        (väntar på att Backend svarar)

STEG 3: Backend hämtar initialt data från Homey Pro
   └─> Fyller databasen med första uppsättningen av sensor-data

STEG 4: Frontend bygger Next.js-appen
   └─> Kompilerar TypeScript, optimerar CSS/JS för produktion

STEG 5: Systemet är klart när alla 3 containers är "Up"
   └─> Verifiera med: docker ps

STEG 6: Du öppnar webbläsaren
   └─> http://localhost:3000
   └─> Dashboard visas omedelbar med aktuell data

STEG 7: Schemaläggaren startar
   └─> Var 5:e minut: Hämtar ny data från Homey, sparar i databasen
   └─> Kör automatisk i bakgrunden medan du använder dashboarden

═══════════════════════════════════════════════════════════════════════════════

## FILSTRUKTUR - VIKTIGA PLATSER

k7-energi/
│
├── frontend/                           ← Webbsidans kod (React)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               ← HUVUDSIDAN! Här är dashboarden
│   │   │   ├── layout.tsx             ← Rubrik, sidhuvud, layout
│   │   │   └── globals.css            ← Styling för hela sidan
│   │   ├── components/                ← UI-komponenter (knappar, tabeller, osv)
│   │   │   ├── StatusCard.tsx         ← Visar sensorkort
│   │   │   └── CapabilitiesModal.tsx  ← Modal för att välja vilka fält som sparas
│   │   └── lib/
│   │       └── api.ts                 ← Funktioner som anropar backend-API
│   ├── Dockerfile                     ← Instruktioner för att bygga in frontend i Docker
│   └── package.json                   ← Dependencies (react, next, typescript, osv)
│
├── backend/                            ← Servern som hämtar data
│   ├── src/
│   │   ├── app.ts                     ← Startar servern, definierar routes
│   │   ├── modules/
│   │   │   ├── homey/
│   │   │   │   ├── homey.service.ts   ← Hämtar data från Homey Pro API
│   │   │   │   └── homey.controller.ts ← REST-endpoints för hemmet
│   │   │   └── history/
│   │   │       └── history.controller.ts ← Endpoints för historikdata från DB
│   │   └── shared/
│   │       ├── db.ts                  ← Prisma-klient (anslutning till DB)
│   │       ├── logger.ts              ← Loggning
│   │       └── scheduler.ts           ← Cron-jobb (var 5:e minut)
│   ├── prisma/
│   │   ├── schema.prisma              ← DATABASKONFIGURATION (tabeller, fält)
│   │   └── migrations/                ← Historik över all ändringar i DB
│   ├── Dockerfile                     ← Instruktioner för att bygga in backend i Docker
│   └── package.json                   ← Dependencies (fastify, typescript, prisma, osv)
│
├── shared/
│   └── types.ts                       ← Delade TypeScript-typer mellan frontend & backend
│
├── docker-compose.yml                 ← VIKTIG! Startar alla 3 containers tillsammans
├── .env                               ← VERSION=v0.58 (versionsnummer)
│
└── SYSTEMÖVERSIKT.md                  ← DU ÄR HÄR! Server-konfiguration


═══════════════════════════════════════════════════════════════════════════════

## API-ENDPOINTS - VAD BACKEND EXPONERAR

Frontend anropar dessa endpoints för att hämta data:

GET /api/health
├─ Vad:     Kontrollerar om systemet är igång
├─ Svar:    { status: "ok", database: "connected", homey: "online" }
└─ Används av: Health-checker på dashboarden

GET /api/homey/temperatures
├─ Vad:     Hämtar REAL-TIME temperaturer från Homey Pro just nu
├─ Svar:    Array av { deviceId, deviceName, zone, temperature, lastUpdated }
└─ Används av: StatusCard-komponenten för att visa aktuella värden

GET /api/homey/energy
├─ Vad:     Hämtar REAL-TIME energidata från Pulse-mätaren just nu
├─ Svar:    Array av { deviceId, deviceName, watts, meterPower, costSinceMidnight }
└─ Används av: Energi-statuskortet

GET /api/history/temperatures?hours=24
├─ Vad:     Hämtar lagrad temperaturhistorik från databasen
├─ Svar:    Array av historiska temperaturavläsningar
└─ Används av: Historik-tabellen när du klickar på en temperaturgivare

GET /api/history/energy?hours=24
├─ Vad:     Hämtar lagrad energihistorik från databasen (MED KOSTNAD!)
├─ Svar:    Array av { deviceId, watts, meterPower, accumulatedCost, createdAt }
└─ Används av: Historik-tabellen när du klickar på en energisensor

GET /api/sensor/:deviceId/capabilities
├─ Vad:     Hämtar vilka mätfält som sparas för en sensor (temp, kostnad, osv)
├─ Svar:    { deviceId, capabilitiesToLog: ["temperature", "accumulatedCost"] }
└─ Används av: Capabilities-modalen

POST /api/sensor/:deviceId/capabilities
├─ Vad:     Sparar vilka mätfält som ska loggas för en sensor
├─ Body:    { capabilitiesToLog: ["measure_power", "meter_power", "accumulatedCost"] }
└─ Används av: Capabilities-modalen när du klickar "Spara"

═══════════════════════════════════════════════════════════════════════════════

## VERSION & RELEASE - HUR VERSIONERNA HANTERAS

NUVARANDE VERSION:  v0.58 (visas i dashboard-titeln: "Krokgatan 7 - v0.58")

VAR VERSIONEN SPARAS:
├─ .env              ← VERSION=v0.58 (Environmetn variable)
├─ Git tags          ← git tag v0.58 (release milestone)
├─ Frontend header   ← "Krokgatan 7 - v0.58" (visat på dashboarden)
└─ Docker images     ← Byggen skapa automatisk med versionen

HUR MAN BUMPAR VERSION:
1. Gör dina ändringar i koden
2. Kör: git add -A
3. Kör: git commit -m "Beskrivning av ändringar"
4. Uppdatera .env:  VERSION=vX.XX (inkrementera med 0.01)
5. Kör: docker-compose down && docker-compose up -d (tvinga rebuild)
6. Kör: git tag -a vX.XX -m "Release vX.XX"
7. Kör: git push origin vX.XX

VERSIONSHISTORIK:
• v0.58 - Korrekt VERSION-injicering, Kostnad (kr) kolumn för energi
• v0.57 - accumulatedCost-kolumn för energisensorhistorik
• v0.56 - Version-display i dashboard-rubriken
• v0.30 - Zone-funktionalitet för sensorer

═══════════════════════════════════════════════════════════════════════════════

## HOMEY PRO INTEGRATION - OST HEMMA ENHETEN

VAD ÄR HOMEY PRO:
   En eller-box (smart home-hubb) som kopplas till alla sensorer i huset

ANSLUTNING:
├─ IP-adress:       192.168.1.122
├─ Port:            80 (HTTP)
└─ Autentisering:   Bearer-token (API-nyckel)

DATA SOM HÄMTAS:
├─ Temperaturer från:
│  ├─ Stue
│  ├─ Sovrum
│  ├─ Badrum
│  └─ Övriga rum
└─ Energidata från:
   ├─ Pulse Krokgatan 7 (elmätaren)
   └─ Andra plugg-sensorer

MÄTINTERVALL:
   Backend hämtar data var 5:e minut automatisk (cron-jobb)
   └─> Sparas direkt i databasen
   └─> Visas på dashboarden nästa gång du uppdaterar

CAPABILITIES (mätfält):
   Olika sensorer kan mäta olika saker:
   ├─ measure_temperature        ← Temperatur
   ├─ measure_power              ← Aktuell effekt (Watt)
   ├─ meter_power                ← Förbrukning sedan midnatt (kWh)
   ├─ meter_power.imported       ← El från nätet
   ├─ meter_power.exported       ← El tillbaka till nätet
   └─ accumulatedCost            ← Kostnad på elförbrukningen

═══════════════════════════════════════════════════════════════════════════════

## SNABBREFERENS - DE VIKTIGASTE KOMMANDONA

STARTA ALLT:
   docker-compose up -d

STÄNGA AV ALLT:
   docker-compose down

SE STATUS PÅ CONTAINERS:
   docker ps

SE BACKENDLOGGARNA (vad som händer i servern):
   docker logs homey_backend -f

SE ENBART DE SENASTE 20 LOGGRADERNA:
   docker logs homey_backend | tail -20

ÖPPna dashboarden:
   http://localhost:3000

ANROPA API DIREKT (t.ex. hälsokontroll):
   Invoke-RestMethod -Uri "http://localhost:3001/api/health"

COMMITA OCH BUMPA VERSION:
   git add -A
   git commit -m "Din kommentar"
   # Uppdatera VERSION i .env
   docker-compose down && docker-compose up -d
   git tag -a vX.XX -m "Release vX.XX"
   git push origin vX.XX

═══════════════════════════════════════════════════════════════════════════════

## FELDIAGNOS - VANLIGA PROBLEM

PROBLEM: Dashboard visar "Backend är offline"
LÖSNING: 
   1. docker ps              (är homey_backend igång?)
   2. docker logs homey_backend (vad säger den?)
   3. docker-compose down && docker-compose up -d (omstart)

PROBLEM: Nya data syns inte på dashboarden
LÖSNING:
   1. Vänta 5 minuter (schemaläggaren kör var 5:e minut)
   2. Uppdatera webbläsaren (F5)
   3. Kolla att Homey Pro är igång på 192.168.1.122

PROBLEM: "VERSION visar gamla nummer"
LÖSNING:
   1. Uppdatera .env: VERSION=vX.XX
   2. docker-compose down
   3. docker rmi k7-energi-frontend:latest
   4. docker-compose up -d

PROBLEM: Databaskällar efter omstart
LÖSNING:
   1. docker ps -a (hitta container-ID för DB)
   2. docker logs <container-id> (vad är felet?)
   3. docker-compose down -v (radera allting + volymer)
   4. docker-compose up -d (frisk start)

═══════════════════════════════════════════════════════════════════════════════

## SÄKERHET & API-NYCKLAR

API-NYCKELN FÖR HOMEY PRO:
   Sparad i:    backend/.env → HOMEY_TOKEN
   Typ:         Bearer-token
   Exposure:    INTE i git (filen är .gitignored)
   Längd:       Lång sträng med hex-tecken

DATABASE-LÖSENORD:
   Sparad i:    docker-compose.yml
   User:        postgres
   Password:    postgres
   Exposure:    INTE i produktion (endast för lokal dev)

═══════════════════════════════════════════════════════════════════════════════

SLUTORD FÖR NYBÖRJARE:

System är uppdelat i 3 delar som tillsammans fungerar som en pipeline:

   Homey Pro (hemmet)
        ↓
   Backend (hämtar, sparar)
        ↓
   Databas (lagrar historik)
        ↓
   Frontend (visar på skärmen)

Varje del är oberoende men behöver varandra. Docker ser till att dom kör
samtidigt och kan prata med varandra. Allt startar med ett kommando:

   docker-compose up -d

Lycka till! 🚀

═══════════════════════════════════════════════════════════════════════════════
