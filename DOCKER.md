# 🐳 Docker Setup Guide - K7 Energi

## Översikt

Detta projekt har två körningslägen:

1. **DRIFT-MODE** 🚀 - I Docker (produktion-lik)
   - Frontend, Backend och PostgreSQL körs alla i Docker
   - Idealt för 24/7 drift lokalt på nätverket
   - Script: `.\scripts\deploy.ps1`

2. **DEV-MODE** 💻 - Lokal utveckling (snabbt)
   - PostgreSQL i Docker (stabil)
   - Backend & Frontend körs lokalt från VS Code (hot-reload)
   - Script: `.\scripts\dev.ps1`

---

## 🚀 DRIFT: Docker-deployment

### Förutsättningar
- Docker Desktop installerad
- PowerShell
- `.env`-fil med variablar (eller använd defaults)

### Starta drift

```powershell
# Från projektroten:
.\scripts\deploy.ps1 start
```

**Vad händer:**
1. Bygger Docker-images för backend och frontend
2. Startar PostgreSQL, Backend och Frontend
3. Visar URL:er för åtkomst

**Resultat:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api/health`
- Database: `postgresql://postgres:postgres@localhost:5432/homey_db`

### Kommando-referens

```powershell
# Starta drift
.\scripts\deploy.ps1 start

# Stoppa tjänster
.\scripts\deploy.ps1 stop

# Omstarta
.\scripts\deploy.ps1 restart

# Se live-loggar
.\scripts\deploy.ps1 logs

# Status
.\scripts\deploy.ps1 status
```

### Environment-variabler för drift

Sätt innan start:

```powershell
$env:HOMEY_ADDRESS = "http://192.168.1.122"
$env:HOMEY_TOKEN = "din-token-här"
```

Eller skapa `.env`-fil i projektrot:

```env
HOMEY_ADDRESS=http://192.168.1.122
HOMEY_TOKEN=xxxxx
```

---

## 💻 DEV: Lokal utveckling

### Förutsättningar
- Node.js 18+ installerad
- Docker Desktop (för PostgreSQL)
- VS Code (valfritt)

### Starta utveckling

```powershell
# Från projektroten:
.\scripts\dev.ps1 start
```

**Vad händer:**
1. Startar PostgreSQL i Docker
2. Öppnar ny terminal för Backend (npm run dev)
3. Öppnar ny terminal för Frontend (npm run dev)
4. Öppnar webbläsaren på `http://localhost:3000`

**Resultat:**
- Frontend: `http://localhost:3000` (hot-reload aktiv)
- Backend API: `http://localhost:3001` (hot-reload aktiv)
- PostgreSQL kör i Docker

### Kommando-referens

```powershell
# Starta dev-miljö
.\scripts\dev.ps1 start

# Stoppa dev-miljö
.\scripts\dev.ps1 stop

# Stoppa + rengör (tar bort volumes)
.\scripts\dev.ps1 clean
```

### Hot-reload under utveckling

- **Backend**: Ändringar i `backend/src/**/*.ts` uppdaterar automatiskt
- **Frontend**: Ändringar i `frontend/src/**` uppdaterar automatiskt

---

## 📦 Docker-struktur

### Filer

```
project/
├── backend/
│   ├── Dockerfile           ← Backend container
│   ├── .dockerignore        ← Exkluderar filer från Docker
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile           ← Frontend container
│   ├── .dockerignore
│   ├── package.json
│   └── src/
├── docker-compose.yml       ← Orchestrering av alla containers
└── scripts/
    ├── deploy.ps1           ← Driftsättning
    └── dev.ps1              ← Lokal utveckling
```

### docker-compose.yml

Definerar tre tjänster:

1. **db** (PostgreSQL 16-alpine)
   - Port: 5432
   - Network: `homey_network`

2. **backend** (Node 18-alpine)
   - Port: 3001
   - Bygger från `backend/Dockerfile`
   - Körs i production-mode

3. **frontend** (Node 18-alpine)
   - Port: 3000
   - Bygger från `frontend/Dockerfile`
   - Körs i production-mode

---

## 🔧 Anpassning

### Ändra portar

Redigera `docker-compose.yml`:

```yaml
backend:
  ports:
    - "3001:3001"    ←Ändra första siffran för extern port

frontend:
  ports:
    - "3000:3000"    ← Ändr första siffran för extern port
```

### Ändra databas

```yaml
db:
  environment:
    POSTGRES_DB: min_databas  ← Databasens namn
    POSTGRES_USER: min_user   ← Användarnamn
```

### Add volumes för loggfiler

Backend-loggen sparas redan lokalt:

```yaml
backend:
  volumes:
    - ./backend/loggfil.txt:/app/loggfil.txt  ← Från container till lokal
```

---

## 🐛 Felsökning

### Docker build-fel

```powershell
# Rensa Docker cache
docker system prune -a

# Bygg på nytt
.\scripts\deploy.ps1 start
```

### Port redan i bruk

```powershell
# Se vad som använder port 3000
Get-NetTCPConnection -LocalPort 3000

# Eller: rensa Node-processer
taskkill /F /IM node.exe
```

### Databaskopplingen misslyckas

```powershell
# Kontrollera PostgreSQL
docker compose logs db

# Kontrollera DATABASE_URL i .env
# Ska vara: postgresql://postgres:postgres@db:5432/homey_db
```

### Frontend ser inte backend

Kontrollera `NEXT_PUBLIC_API_URL` i `docker-compose.yml`:

```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: http://backend:3001  ← Måste peka på backend-service
```

---

## 🔄 Workflow exempel

### Nya features

```powershell
# 1. Starta dev-miljö
.\scripts\dev.ps1 start

# 2. Utveckla i VS Code med hot-reload

# 3. Testa i webbläsare

# 4. När klar:
.\scripts\dev.ps1 stop
```

### Testa drift innan deploy

```powershell
# 1. Testa i Docker lokalt
.\scripts\deploy.ps1 start

# 2. Verifiera att allt fungerar

# 3. Se loggar om problem
.\scripts\deploy.ps1 logs

# 4. Stoppa när du är nöjd
.\scripts\deploy.ps1 stop
```

---

## 📝 Noteringar

- **Datapersistens**: PostgreSQL data sparas i Docker volume `pgdata`
- **Log-filer**: Backend loggfiler sparas lokalt i `backend/loggfil.txt`
- **Environment**: Använd `.env` för secrets (inte i `docker-compose.yml`)
- **Network**: Allegemeiner körs på `homey_network` för intern kommunikation

---

## 🆘 Behöver hjälp?

```powershell
# Se container-status
docker compose ps

# Se loggar
docker compose logs

# Gå in i container
docker compose exec backend sh
docker compose exec frontend sh

# Kontrollera volumes
docker volume ls
```

---

**Version:** 1.0  
**Senast uppdaterad:** 2026-02-22
