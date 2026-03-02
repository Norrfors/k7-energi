# TODO – Arkitekturförbättringar

Identifierade vid kodgranskning 2026-03-02. Åtgärdas i kommande versioner.

---

## 🔴 KRITISKT

### 1. Energiberäkning är inexakt
**Fil:** `backend/src/modules/history/history.controller.ts` rad 93
**Problem:** Beräknar förbrukning som `avgWatts × hoursSpan`. Fungerar bara om loggpunkterna är jämnt fördelade. Om Homey är nere en period blir beräkningen fel.
**Lösning:** Använd `meterPower` (kWh ackumulerat) som redan finns i datan – ger exakt svar utan approximation.

---

### 2. isVisible och capabilitiesToLog ignoreras vid loggning
**Fil:** `backend/src/modules/homey/homey.service.ts`
**Problem:** `logTemperatures()` och `logEnergy()` loggar alla sensorer oavsett vad användaren ställt in. Inställningarna i `SensorVisibility` (isVisible, capabilitiesToLog) har ingen effekt på faktisk loggning.
**Lösning:** Läs `SensorVisibility` från DB innan loggning och filtrera bort sensorer med `isVisible = false`. Logga bara capabilities som finns i `capabilitiesToLog`.

---

## 🟡 MEDEL

### 3. Zone-begreppet är otydligt (två koncept, ett namn)
**Fil:** `backend/prisma/schema.prisma`, `backend/src/modules/homey/homey.service.ts`
**Problem:** `SensorVisibility.zone` = INNE/UTE (användarklassificering). `TemperatureLog.zone` / `EnergyLog.zone` = fysisk plats (från Homey/namnmappning). Båda kallas `zone` vilket är förvirrande.
**Lösning:** Byt namn – t.ex. `classification` för INNE/UTE i SensorVisibility, behåll `zone` för fysisk plats i logg-tabellerna.

---

### 4. MeterReading och EnergyLog duplicerar Pulse-data
**Fil:** `backend/prisma/schema.prisma`
**Problem:** `EnergyLog.meterPower` = samma data som `MeterReading.consumptionSinceMidnight`. Data från Pulse sparas på två ställen med delvis överlappande fält (`meterPower`, `meterValue`, `accumulatedCost`).
**Lösning:** Utvärdera om MeterReading kan tas bort och all förbrukningsdata konsolideras till EnergyLog + kalibreringstabell. Alternativt dokumentera tydligt vad som skiljer tabellerna åt.

---

### 5. Tre simultana Homey-anrop per minut
**Fil:** `backend/src/shared/scheduler.ts`
**Problem:** Vid minut 0, 5, 10... körs `logTemperatures()`, `logEnergy()` och `updateMeterReading()` simultant – alla gör varsitt `fetchDevices()`-anrop mot Homey.
**Lösning:** Cacha `fetchDevices()`-resultatet i ~30 sekunder i HomeyService, eller förskjut cron-jobben (t.ex. temp vid `:00`, energi vid `:02`, meter varje minut).

---

## 🟢 LÅGT PRIORITET

### 6. shared/types.ts används inte av frontend
**Fil:** `frontend/src/lib/api.ts`, `shared/types.ts`
**Problem:** `shared/types.ts` definierar `TemperatureReading`, `EnergyReading` osv, men `api.ts` definierar egna inline-typer för varje API-svar. Kontraktet upprätthålls inte i praktiken.
**Lösning:** Importera och använd typer från `shared/types.ts` i `api.ts` istället för inline-definitioner.

---

### 7. Hårdkodad PULSE_ID
**Fil:** `backend/src/modules/meter/meter.service.ts` rad 8
**Problem:** `const PULSE_ID = "c2314e97-..."` – om enheten byts i Homey slutar allt att fungera utan varning.
**Lösning:** Läs PULSE_ID från `.env` eller hitta Pulse dynamiskt via enhetens namn vid uppstart.

---

### 8. Settings-routes i fel fil
**Fil:** `backend/src/modules/history/history.controller.ts` rad 139
**Problem:** `/api/sensor/:deviceId/capabilities` (PUT/GET) ligger i history-controllern men har inget med historik att göra.
**Lösning:** Flytta till `backend/src/modules/settings/settings.controller.ts`.

---

### 9. Settings-routes som inline-kod i app.ts
**Fil:** `backend/src/app.ts` rad 57
**Problem:** Kommentaren säger `// plugin-pattern didn't work` – tre settings-routes definieras direkt i app.ts som en workaround.
**Lösning:** Felsök varför Fastify-plugin-mönstret inte fungerade och flytta till en riktig controller.

---

### 10. execSync blockerar event loop vid start
**Fil:** `backend/src/app.ts` rad 33
**Problem:** `execSync("npx prisma migrate deploy")` blockerar hela Node.js event loop under migration.
**Lösning:** Använd `exec` (callback) eller `execAsync` (promisifierad) istället.

---

### 11. Ingen databas-rensning (data växer obegränsat)
**Fil:** `backend/prisma/schema.prisma`, `backend/src/shared/scheduler.ts`
**Problem:**
- `MeterReading`: ~525 000 rader/år (varje minut)
- `EnergyLog`: ~105 000 rader/år (var 5:e minut)
- `TemperatureLog`: ~105 000 rader/år (var 5:e minut)

Ingen pruning-strategi finns.
**Lösning:** Lägg till ett schemalagt jobb som rensar data äldre än X månader (t.ex. behåll 12 månader för energi, 6 månader för temperatur).

---

## Status

| # | Prioritet | Åtgärdad i version |
|---|-----------|-------------------|
| 1 | 🔴 Kritiskt | – |
| 2 | 🔴 Kritiskt | – |
| 3 | 🟡 Medel | – |
| 4 | 🟡 Medel | – |
| 5 | 🟡 Medel | – |
| 6 | 🟢 Lågt | – |
| 7 | 🟢 Lågt | – |
| 8 | 🟢 Lågt | – |
| 9 | 🟢 Lågt | – |
| 10 | 🟢 Lågt | – |
| 11 | 🟢 Lågt | – |
