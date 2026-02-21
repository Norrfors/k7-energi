# Nätverksfelsökning – Homey Dashboard

## Problem: "Kunde inte ansluta till backend. Kör den på port 3001?"

### Symptom
Frontend körs på `http://192.168.1.211:3000` men kan inte kommunicera med backend på port 3001. Felmeddelandet visas:
```
Kunde inte ansluta till backend. Kör den på port 3001?
```

### Rotorsak
CORS (Cross-Origin Resource Sharing) är konfigurerad i backend för att endast tillåta förfrågningar från `http://localhost:3000`. När frontend körs från en annan maskin på samma nätverk (t.ex. `192.168.1.211:3000`), blockeras API-anropen av CORS-policyn.

### Lösning
Uppdatera CORS-konfigurationen i **backend/src/app.ts**:

**Före:**
```typescript
await app.register(cors, {
  origin: "http://localhost:3000",
});
```

**Efter:**
```typescript
await app.register(cors, {
  origin: true, // Tillåter alla origins under utveckling
});
```

### Steg för att fixa
1. Redigera `backend/src/app.ts`
2. Ändra `origin: "http://localhost:3000"` till `origin: true`
3. Starta backend om: `npm run dev` i `backend/` mappen
4. Uppdatera frontend i webbläsaren (F5 eller Ctrl+Shift+R)

###注意
- `origin: true` tillåter CORS från alla domäner – detta är okej för **lokal utveckling**
- För **produktion** bör denna begränsas till specifika domäner, t.ex. `origin: "https://example.com"`

### Relaterade inställningar
- Frontend: `frontend/src/lib/api.ts` innehåller dynamisk API_BASE som automatiskt använder `window.location.hostname`
- Backend: Backend startas med `HOST=0.0.0.0` för att lyssna på alla nätverksgränssnitt
- Båda processer måste köra med nätverksbindning för att externa maskiner ska kunna nå dem

### Checklista för nätverk
- ✅ Backend körs på `0.0.0.0:3001` (alla gränssnitt)
- ✅ Frontend körs på `0.0.0.0:3000` (alla gränssnitt)
- ✅ CORS är konfigurerad för att tillåta external origins
- ✅ Båda maskiner är på samma nätverk (t.ex. 192.168.x.x)
- ✅ Brandvägg blockerar inte port 3000/3001
