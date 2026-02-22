# 🚀 restart-dev.ps1 - Dev Environment Restart Script

Automatiserar hela processen för att få ändringar att slå igenom efter kodmodifieringar.

## 📋 Vad gör scriptet?

1. **Git Commit** - Säker commit av lokala ändringar (optional prompt)
2. **Docker Cleanup** - Stoppar & tar bort containers
3. **Build** - Bygger images (med eller utan cache)
4. **Start** - Startar containers och väntar tills allt är klart
5. **Verify** - Kontrollerar att allt fungerar
6. **Done** - Visar status och tips för webbläsare

## 🎯 Användning

### Normal restart (snabbaste)
```powershell
.\restart-dev.ps1
```

### Rebuild utan cache (rekommenderas efter större ändringar)
```powershell
.\restart-dev.ps1 -NoCache
```

### Full rebuild - ta bort images helt
```powershell
.\restart-dev.ps1 -FullRebuild
```

## ⏱️ Ungefärlig tid

- Normal restart: ~20-30 sekunder
- Med -NoCache: ~2-3 minuter
- -FullRebuild: ~3-5 minuter

## 🔄 Arbetsflöde efter kodändringar

1. Gör dina ändringar i koden
2. Spara filerna
3. Kör: `.\restart-dev.ps1`
4. Vänta på "SYSTEMET ÄR KLART!"
5. Öppna http://localhost:3000 i webbläsaren
6. Tryck **Ctrl+Shift+R** för hårdladdning

## 🏗️ Stöd för olika ändringstyper

### Frontend ändringar (`src/app/` eller `src/components/`)
```powershell
.\restart-dev.ps1 -NoCache
```
→ Bygger frontend om utan cache

### Backend ändringar (`backend/src/`)
```powershell
.\restart-dev.ps1 -NoCache
```
→ Bygger backend om utan cache

### Database/Prisma ändringar
```powershell
.\restart-dev.ps1 -FullRebuild
```
→ Fullständig ombyggnad + migrations

## ❓ Troubleshooting

Om systemet fortfarande inte startar:

```powershell
# Visa alla logs
docker compose logs

# Visa bara backend logs
docker logs homey_backend -f

# Visa bara frontend logs  
docker logs homey_frontend -f
```

## 📌 Viktiga notiser

- Script behöver köras från **repository root** (`c:\Users\jan\OneDrive\Dokument\GitHub\k7-energi\`)
- Du behöver **Docker Desktop** installerat och körande
- Första gången tar det längre tid (bygger images)
- Webbläsare måste **hårdladda** (Ctrl+Shift+R) för att se ändringar
