# 🚀 NY SETUP - LOCAL DEVELOPMENT

Denna setup är **mycket snabbare** för utveckling!

## Varför denna ändring?
- ✅ Ingen Docker-caching-problem
- ✅ Snabbare hot-reload
- ✅ Bättre error messages
- ✅ Enklare att debugga
- ✅ Båda apparna startar på <1 sekund

---

## 📋 STEG 1: Kör dessa 3 scripts i SEPARATA command-prompt fönster

### Terminal 1: DATABASE
```
1-START-DB.bat
```
Väntar tills du ser: `✓ Database is ready on: localhost:5432`

### Terminal 2: BACKEND  
```
2-START-BACKEND.bat
```
Väntar tills du ser: `✓ Ready to accept connections on port 3001`

### Terminal 3: FRONTEND
```
3-START-FRONTEND.bat
```
Väntar tills du ser något som: `✓ Ready in 1234ms`

---

## 🌐 SEDAN
Öppna: **http://localhost:3000**

---

## 🔧 Backend API
- http://localhost:3001
- `/api/health` - check status
- `/api/homey/temperatures` - get temps
- `/api/homey/energy` - get energy

---

## 💾 Gamla Docker-setup
Om du vill gå tillbaka till att köra allt i Docker:
```
cp docker-compose.backup.yml docker-compose.yml
docker-compose up -d
```

---

## 🛑 Stoppa allt
- Stäng de 3 terminal-fönstren (Ctrl+C för varje)
- Eller: `docker-compose down` för databasen

---

**Versions protocol fortfarande i kraft:**
- Varje ändring = ny version (v0.29, v0.30, etc)
- Commit + tag efter varje test
