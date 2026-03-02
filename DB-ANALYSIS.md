# Databasanalys – k7-energi
Genomförd: 2026-03-02

---

## Tabellöversikt (live-data)

| Tabell | Rader | Storlek | Status |
|--------|-------|---------|--------|
| TemperatureLog | 494 | 200 kB | Aktiv – data från idag |
| MeterReading | 100 | 80 kB | Aktiv – men fel totalMeterValue |
| EnergyLog | 95 | 80 kB | Aktiv |
| SensorVisibility | 30 | 64 kB | Aktiv – men tom konfiguration |
| MeterCalibration | 1 | 64 kB | 1 kalibrering sparad (64 858 kWh) |
| BackupSettings | 1 | 32 kB | Standard, auto-backup av |
| ExternalData | 0 | 24 kB | Tom – används aldrig |
| _prisma_migrations | 1 | 32 kB | 1 migration totalt |

**Total DB-storlek:** 8,4 MB

---

## Buggar

### BUG 1 – Zone sparas som UUID, inte läsbart namn
**Tabeller:** TemperatureLog, EnergyLog
**Exempel:**
```
zone = "58033f96-890d-4d71-82bb-8b03ac5d9049"  ← UUID
zone = "Vardagsrum"                             ← läsbart (bara för sensorer utan Homey-zon)
```
**Orsak:** `homey.service.ts` gör `d.zone ? d.zone : getZoneForDevice(d.name)`.
`d.zone` från Homey är ett zon-ID (UUID), inte ett namn. Sensorer med Homey-zon tilldelad
sparar UUID:n rakt av. Bara sensorer *utan* Homey-zon får läsbart namn.

**Lösning:** Hämta zonnamn via Homey API `/api/manager/zones` och mappa UUID → namn
före lagring. Alternativt: ignorera `d.zone` och alltid använda `getZoneForDevice(d.name)`.

---

### BUG 2 – totalMeterValue = consumptionSinceMidnight (aldrig rätt)
**Tabell:** MeterReading
**Exempel:**
```
consumptionSinceMidnight = 52.97  →  totalMeterValue = 52.97   ← SAMMA!
consumptionSinceMidnight = 58.56  →  totalMeterValue = 58.56   ← SAMMA!
```
**Förväntat:** totalMeterValue ska vara ~64 916 kWh (kalibrering 64 858 + 58 kWh sedan midnatt).

**Orsak:** `recalculateMeterValuesFromLatestCalibration()` uppdaterar bara `EnergyLog.meterValue`,
INTE `MeterReading.totalMeterValue`. De två tabellerna är inte synkroniserade kring kalibreringen.

**Lösning:** Antingen:
1. Applicera kalibreringen i `MeterService.updateMeterReading()` direkt
2. Eller ta bort MeterReading och använd EnergyLog.meterValue som enda källa

---

### BUG 3 – capabilitiesToLog och zone är tomma för alla sensorer
**Tabell:** SensorVisibility
**Data:**
```
capabilitiesToLog = []   (alla 30 sensorer)
zone = ""                (alla 30 sensorer)
```
Ingen sensor har konfigurerat vad som loggas eller INNE/UTE-klassificering.
UI:t har stöd för det men det är aldrig ifyllt.

**Lösning:** Sätt standardvärden vid skapande:
- temperature-sensorer: `capabilitiesToLog = ["measure_temperature"]`
- energy-sensorer: `capabilitiesToLog = ["measure_power", "meter_power", "accumulatedCost"]`

---

## Strukturella brister

### Dubblering: EnergyLog och MeterReading

| Fält | EnergyLog | MeterReading |
|------|-----------|--------------|
| Förbrukning sedan midnatt | `meterPower` | `consumptionSinceMidnight` |
| Total mätarställning | `meterValue` | `totalMeterValue` |
| Kostnad sedan midnatt | `accumulatedCost` | `costSinceMidnight` |
| Intervall | var 5:e minut | varje minut |

Pulse-data lagras på två ställen. Kalibrering appliceras på EnergyLog men inte MeterReading.

**Lösning (långsiktig):** Konsolidera – ta bort MeterReading och kör allt via EnergyLog.
MeterReading var ursprungligen tänkt för "mjuk" totalräkning men kalibreringssystemet
löser det bättre via EnergyLog.meterValue.

---

### ExternalData är oanvänd
0 rader. Troligen planerad för elpriser (Nordpool/Tibber) men aldrig implementerad.
Antingen implementera eller ta bort tabellen för att hålla schemat rent.

---

## Datatillväxt – saknar rensning

| Tabell | Rader/dag | Rader/år |
|--------|-----------|----------|
| TemperatureLog | ~7 500 (26 sensorer × 12/h × 24h) | ~2 700 000 |
| EnergyLog | ~1 440 (5 sensorer × 12/h × 24h) | ~525 000 |
| MeterReading | ~1 440 (varje minut) | ~525 000 |

**Lösning:** Schemalagt rensningsjobb – behåll t.ex. 12 månaders energidata, 6 månaders temperatur.

---

## Index-status

Befintliga index är korrekta:
- `(deviceId, createdAt)` på TemperatureLog, EnergyLog, MeterReading ✓
- `(sensorType, isVisible)` på SensorVisibility ✓
- `(deviceId, calibrationDateTime)` på MeterCalibration ✓

Saknas: Index på `zone` om man filtrerar INNE/UTE – men låg prioritet tills data finns.

---

## Åtgärdsprioritet

| # | Problem | Prioritet |
|---|---------|-----------|
| 1 | Zone sparas som UUID (TemperatureLog, EnergyLog) | 🔴 Kritiskt |
| 2 | totalMeterValue = consumptionSinceMidnight (fel) | 🔴 Kritiskt |
| 3 | capabilitiesToLog tom för alla sensorer | 🟡 Medel |
| 4 | EnergyLog och MeterReading duplicerar data | 🟡 Medel |
| 5 | ExternalData oanvänd | 🟢 Lågt |
| 6 | Ingen databas-rensning | 🟢 Lågt |
