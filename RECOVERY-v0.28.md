# RECOVERY GUIDE - v0.28 Status

## Sparad Status (Feb 25, 2026)

### ✅ Vad som är gjort:
1. **Frontend v0.28** - versionsuppgradering komplett
2. **ZON inline display** - temperatur och energi visar zone på samma rad
3. **Production mode** - Dockerfiles konfigurerade för snabb prestanda
4. **Backend på port 3001** - Fastify API server
5. **Frontend på port 3000** - Next.js production build
6. **Database** - PostgreSQL migrations klara

### 📝 Nuvarande Konfiguration:
- Backend: `npm run build && npm start` (production)
- Frontend: `npm run build && npm start` (production)
- Dockerfiles: Multi-stage builds, optimerad för snabbhet

### 🚀 För att starta igen:

**Option 1 - Snabbstarten (rekommenderad):**
```
Dubbelklicka: FRESH-START.bat
```

**Option 2 - Manuell start:**
```cmd
cd C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
docker-compose up -d --build
timeout /t 30
docker ps
```

**Option 3 - Starta bara utan rebuild:**
```cmd
cd C:\Users\jan\OneDrive\Dokument\GitHub\k7-energi
docker-compose up -d
```

### 🌐 URLs när systemet startar:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/health
- Database: localhost:5432

### 📂 Viktiga Filer:
- `frontend/src/app/page.tsx` - Huvuddashboard (v0.28)
- `backend/Dockerfile` - Production Node.js build
- `frontend/Dockerfile` - Production Next.js build
- `docker-compose.yml` - Container orchestration
- `FRESH-START.bat` - Clean rebuild script

### ⚙️ Nästa steg när systemet är igång:
1. Öppna http://localhost:3000
2. Kontrollera v0.28 i header
3. Verifiera att ZON visas inline med sensornamn
4. Testa backend anslutning: http://localhost:3001/api/health

### 💾 Git Status:
Alla ändringar är sparade lokalt i projektet. Kör `git log --oneline -5` för att se commits.

---
**Sparat:** 2026-02-25 15:30 CET
Klart att stänga av!
