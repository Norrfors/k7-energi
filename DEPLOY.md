# 📋 Deployment Guide – K7 Energi

Denna guide förklarar hur man startar systemet i två olika miljöer: **Utveckling** och **Drift**.

---

## 📊 Miljööversikt

| Aspekt | Utveckling | Drift |
|--------|-----------|-------|
| **Körning** | Lokalt | Docker |
| **Database** | Docker | Docker |
| **Backend** | `npm run dev` lokalt | Docker container |
| **Frontend** | `npm run dev` lokalt | Docker container |
| **Hot-reload** | ✅ Ja | ❌ Nej |
| **Port-bindning** | `localhost:3000/3001` | `0.0.0.0:3000/3001` |
| **Restart-policy** | Manuell | Automatisk |
| **Ideal för** | Kodning & felsökning | 24/7 drift |

---

# 💻 UTVECKLINGSMILJÖ (Rekommenderad för kodning)

## Arkitektur

```
┌─────────────────────────────────────────────┐
│         Din Dator (Windows)                 │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │   VS Code / Terminal                  │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ Terminal 1: Backend             │  │  │
│  │  │ cd backend && npm run dev       │  │  │
│  │  │ Port: localhost:3001            │  │  │
│  │  │ Språk: TypeScript/Fastify       │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ Terminal 2: Frontend            │  │  │
│  │  │ cd frontend && npm run dev      │  │  │
│  │  │ Port: localhost:3000            │  │  │
│  │  │ Språk: JavaScript/React/Next.js │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Docker (endast PostgreSQL)            │  │
│  │ ┌─────────────────────────────────┐   │  │
│  │ │ PostgreSQL 16                   │   │  │
│  │ │ Port: 5432                      │   │  │
│  │ │ Network: homey_network          │   │  │
│  │ └─────────────────────────────────┘   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Starta utvecklingsmiljö

**Automatisk (rekommenderat):**
```powershell
cd c:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
.\scripts\dev.ps1 start
```

**Manuell start:**

1. **Terminal 1 – PostgreSQL:**
   ```powershell
   docker compose up -d db
   ```

2. **Terminal 2 – Backend:**
   ```powershell
   cd backend
   npm run dev
   ```
   Vänta tills du ser: `🚀 Backend kör på http://localhost:3001`

3. **Terminal 3 – Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```
   Vänta tills du ser: `✓ Ready in XXXms`

## Åtkomst

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/health
- **Database:** postgresql://dev:dev123@localhost:5432/mittproject

## Utveckling

**Hot-reload fungerar automatiskt:**
- Ändra fil i `backend/src/` → backend startar om
- Ändra fil i `frontend/src/` → frontend startar om

**Logga från backend:**
```bash
tail -f backend/loggfil.txt
```

## Stoppa utvecklingsmiljö

```powershell
taskkill /F /IM node.exe          # Stänger backend + frontend
docker compose down               # Stänger PostgreSQL
```

---

# 🚀 DRIFTMILJÖ (Produktion i Docker)

## Arkitektur

```
┌─────────────────────────────────────────────┐
│        Docker Stack (Produktion)            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Container: app-db                   │   │
│  │ ├─ PostgreSQL 16-alpine             │   │
│  │ ├─ Port: 5432                       │   │
│  │ ├─ Volume: pgdata (/var/lib/pgsql)  │   │
│  │ └─ Health: ✓ (SQL ping)             │   │
│  └─────────────────────────────────────┘   │
│                          ↓                  │
│  ┌─────────────────────────────────────┐   │
│  │ Container: app-backend              │   │
│  │ ├─ Node.js 18-alpine                │   │
│  │ ├─ PORT: 3001                       │   │
│  │ ├─ Expose: 0.0.0.0:3001             │   │
│  │ ├─ Restart: always                  │   │
│  │ └─ Health: ✓ (GET /api/health)      │   │
│  └─────────────────────────────────────┘   │
│                          ↓                  │
│  ┌─────────────────────────────────────┐   │
│  │ Container: app-frontend             │   │
│  │ ├─ Node.js 18-alpine                │   │
│  │ ├─ PORT: 3000                       │   │
│  │ ├─ Expose: 0.0.0.0:3000             │   │
│  │ ├─ Restart: always                  │   │
│  │ └─ Health: ✓ (GET /)                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Network: homey_network (bridge)            │
│  DNS resolution: Namn → container IP       │
│                                             │
└─────────────────────────────────────────────┘
```

## Förutsättningar för Docker

⚠️ **Kritiska krav innan Docker-start:**

1. **`frontend/public/` mapp måste existera** (även om tom)
   ```powershell
   New-Item -ItemType Directory -Force -Path frontend/public
   ```

2. **Backend Dockerfile måste installera devDependencies**
   ```dockerfile
   # ✅ KORREKT:
   RUN npm ci  # Installerar både dependencies och devDependencies
   
   # ❌ FELAKTIG:
   RUN npm ci --only=production  # Saknar @types/* för TypeScript-build
   ```

3. **`tsconfig.json` måste finnas i Docker build-kontexten**
   - Säkerställ att `.dockerignore` **INTE** exkluderar `src/` eller `tsconfig.json`

## Starta driftmiljö

**Automatisk (rekommenderat):**
```powershell
cd c:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
.\scripts\deploy.ps1 start
```

**Manuell start:**

```powershell
cd c:\Users\jan\OneDrive\Dokument\GitHub\k7-energi

# 1. Bygg Docker-images
docker compose build --no-cache

# 2. Starta alla tjänster
docker compose up -d

# 3. Verifiera status
docker compose ps

# 4. Vänta på health checks
Start-Sleep -Seconds 10
docker compose ps  # Alla skall visa "Healthy" eller "Up"
```

## Åtkomst

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/health
- **Database:** postgresql://dev:dev123@localhost:5432/mittproject

*Från nätverket (från annan dator på samma Wi-Fi):*
- **Frontend:** http://192.168.1.211:3000
- **Backend API:** http://192.168.1.211:3001/api/health

## Drift-kommandon

```powershell
# Starta
.\scripts\deploy.ps1 start

# Stoppa
.\scripts\deploy.ps1 stop

# Omstart
.\scripts\deploy.ps1 restart

# Se loggar (live)
.\scripts\deploy.ps1 logs

# Status
.\scripts\deploy.ps1 status

# Rengöring (ta bort containers + images)
.\scripts\deploy.ps1 clean
```

## Övervaka drift

**Se container-loggar:**
```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

**Se status:**
```powershell
docker compose ps
```

**Se resursanvändning:**
```powershell
docker stats
```

## Stoppa driftmiljö

```powershell
docker compose down
```

---

# 🔄 Jämförelse: Dev vs Drift

## Kompilering & Byggning

| Process | Dev | Drift |
|---------|-----|-------|
| **Backend TypeScript** | Kompileras on-the-fly av `ts-node` | Pre-compilerat av `npm run build` i Docker |
| **Frontend Next.js** | Dev-servern håller cache i minne | Byggt `next build`, startat med `next start` |
| **Rebuild på ändring** | Automatisk (hot-reload) | Måste bygga om image + starta om container |
| **Byggmiljö** | Din maskin | Docker (isolated) |

## Nätverksbindning

| Typ | Dev | Drift |
|-----|-----|-------|
| **Backend** | `localhost:3001` | `0.0.0.0:3001` (alla interfaces) |
| **Frontend** | `localhost:3000` | `0.0.0.0:3000` (alla interfaces) |
| **Från nätverket** | ❌ Inte åtkomlig | ✅ Åtkomlig på `192.168.1.211` |

## Omstart & Failover

| Scenario | Dev | Drift |
|----------|-----|-------|
| **Backend kraschar** | Du startar `npm run dev` igen | Automatisk omstart (restart: always) |
| **Frontend kraschar** | Du startar `npm run dev` igen | Automatisk omstart (restart: always) |
| **Database kraschar** | Manuell: `docker compose up db` | Automatisk omstart |
| **Dator startar om** | Ingenting startar automatiskt | Containers startar om automatiskt |

## Miljövariabler

Båda lägen läser från `.env`:

```env
# Databas
DATABASE_URL=postgresql://dev:dev123@localhost:5432/mittproject

# Homey Pro
HOMEY_ADDRESS=http://192.168.1.122
HOMEY_TOKEN=b4809290-ee33-47ec-a01e-709a79fef249:...

# Server
PORT=3001
```

**I driftmiljö:** Variabler skickas även via `docker compose`:
```yaml
environment:
  - DATABASE_URL
  - HOMEY_ADDRESS
  - HOMEY_TOKEN
  - PORT=3001
```

---

# 🐳 Docker-filer

## Dockerfiles

### `backend/Dockerfile`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "build/app.js"]
HEALTHCHECK --interval=30s --timeout=10s CMD npm run health
```

**Vad det gör:**
1. Startar från Alpine Linux + Node 18 (små images)
2. Installerar produktions-dependencies
3. Kompilerar TypeScript → `build/app.js`
4. Health-check var 30:e sekund

### `frontend/Dockerfile`
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

**Vad det gör:**
1. **Builder-stage:** Kompilerar Next.js → `.next/`
2. **Production-stage:** Kopierar bara resultat (mindre final image)
3. Startar Next.js production-server

## `docker-compose.yml`

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev123
      POSTGRES_DB: mittproject
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d mittproject"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://dev:dev123@db:5432/mittproject
      HOMEY_ADDRESS: ${HOMEY_ADDRESS}
      HOMEY_TOKEN: ${HOMEY_TOKEN}
      PORT: 3001
    ports:
      - "3001:3001"
    restart: always

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"
    restart: always

networks:
  homey_network:
    driver: bridge

volumes:
  pgdata:
```

**Vad det gör:**
- Definierar 3 services (db, backend, frontend)
- `depends_on`: Väntar på databas innan backend startar
- `restart: always`: Startar om om container kraschar
- `volumes`: Bevarar data mellan omstarter
- `environment`: Macar in miljövariabler från `.env`

---

# 📝 Filerna som skiljer miljöerna

```
backend/
├── package.json
│   ├── "dev": "nodemon src/app.ts"        ← Dev: hot-reload
│   └── "build": "tsc"                     ← Drift: kompilera
├── Dockerfile                              ← Drift: Bygga image
└── .dockerignore                           ← Drift: Ignorera filer

frontend/
├── package.json
│   ├── "dev": "next dev"                  ← Dev: hot-reload
│   └── "build": "next build"              ← Drift: kompilera
├── Dockerfile                              ← Drift: Bygga image
└── .dockerignore                           ← Drift: Ignorera filer

scripts/
├── dev.ps1                                 ← Dev: npm run dev lokalt
└── deploy.ps1                              ← Drift: Docker build + up
```

---

---

# 🆘 Felsökning

## Dev-miljö: Backend startar inte

```powershell
# Problem: "Port 3001 är redan i bruk"
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

## Dev-miljö: Frontend kan inte hitta Backend

```
Error: 192.168.1.211:3001 connection refused
```

**Orsak:** Backend-terminal inte startad eller inte svarar.

```powershell
# Test:
Invoke-WebRequest http://localhost:3001/api/health
```

## Drift-miljö: Docker build misslyckas

### Fel: "Cannot find name 'setTimeout'" / TypeScript-errors

**Orsak:** `@types/node` och `@types/node-cron` inte installerade i Docker.

**Lösning:** Backend Dockerfile måste installera devDependencies:

```dockerfile
# ✅ KORREKT:
RUN npm ci  # Inkluderar devDependencies

# ❌ FELAKTIG:
RUN npm ci --only=production  # Exkluderar @types/*
```

### Fel: "Cannot find path '/app/public': not found"

**Orsak:** Frontend kräver en `public/` mapp som kan vara tom.

**Lösning:**
```powershell
New-Item -ItemType Directory -Force -Path frontend/public
```

### Fel: "Prisma Client did not initialize yet"

**Orsak:** `prisma generate` kördes aldrig i Docker, Prisma client finns inte.

**Lösning:** Backend Dockerfile måste köra prisma generate efter npm ci:

```dockerfile
# ✅ KORREKT:
COPY package*.json ./
RUN npm ci

# Generera Prisma client INNAN TypeScript-kompilering
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./
```

**Förklaring:** Prisma behöver generera sin client från schema före TypeScript-build, annars misslyckas app-starten.

## Drift-miljö: Container kraschar efter start

```powershell
# Se loggar:
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

**Vanliga fel:**
- `Error: connect ECONNREFUSED 127.0.0.1:5432` → Database startar inte
- `error TS7006: Parameter 'r' implicitly has an 'any' type` → TypeScript-fel i kod

**Rebuild och starta på nytt:**
```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Drift-miljö: Database kan inte nå data från förra gången

```powershell
# Rengör volumes (TAR BORT ALL DATA!):
docker compose down -v
docker compose up -d
```

⚠️ **Varning:** Denna kommando tar bort all lagringad data i databasen!

---

# ✅ Checklista

## Före dev-start
- [ ] `npm install` kört i `backend/`
- [ ] `npm install` kört i `frontend/`
- [ ] `.env` finns med rätt variabler
- [ ] Docker Desktop körs

## Före drift-start (Docker)

**Förberedelser:**
- [ ] `frontend/public/` mapp existerar (kan vara tom)
- [ ] `backend/.dockerignore` exkluderar **INTE** `src/` eller `tsconfig.json`
- [ ] `frontend/.dockerignore` exkluderar **INTE** `src/` eller `tsconfig.json`
- [ ] Backend Dockerfile använder `npm ci` (inte `--only=production`)

**Docker build & start:**
- [ ] `docker compose build --no-cache` slutfördes utan fel
- [ ] `docker compose up -d` startade utan fel
- [ ] `docker compose ps` visar 3 containers:
  - `homey_db` – `Up (healthy)`
  - `homey_backend` – `Up (healthy)` eller `Up (health: starting)`
  - `homey_frontend` – `Up (healthy)` eller `Up (health: starting)`

## Testing

- [ ] http://localhost:3000 laddar (eller 192.168.1.211:3000 från nät)
- [ ] http://localhost:3001/api/health returnerar 200 OK
- [ ] Mätardata visas i dashboard
- [ ] Loggar skrivs till `backend/loggfil.txt`
- [ ] Ingen TypeScript-felmeddelanden i `docker compose logs backend`

---

# 📞 Snabb-referens

**Starta lokal utveckling:**
```powershell
.\scripts\dev.ps1 start
```

**Starta driftmiljö:**
```powershell
.\scripts\deploy.ps1 start
```

**Stopa allt:**
```powershell
taskkill /F /IM node.exe        # Dev
docker compose down              # Drift
```

**Se loggfil:**
```powershell
Get-Content backend/loggfil.txt -Wait
```

---

**Sista uppdatering:** 2026-02-22 (08:42)  
**Version:** v0.03  
**Ändringar:** Prisma generate i Dockerfile, Docker deployment kärnpunkter dokumenterade
