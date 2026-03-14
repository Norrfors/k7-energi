# Vira – Framtida utveckling

*Uppdaterad 2026-03-13.*

---

## Webblösning – Övergripande plan

**Domän:** `vira.gaxor.se` (subdomän under befintlig Loopia-domän)
**Tech:** PHP + MySQL på Loopia, vira.html anpassas med fetch()-anrop
**Lokal utveckling:** Laragon (PHP + MySQL på Windows, samma stack som Loopia)

### Inloggning / Klubbhantering
- Varje klubb får en unik klubbkod vid start (t.ex. `VIRA-SE-042`)
- Ingen självregistrering i första versionen – Jan skapar klubbar manuellt
- Inloggning med klubbkod → rätt data öppnas
- Klubbnamnet visas i rubriken (t.ex. "Vira – Västerås Spelklubb")

---

## Databasstruktur (beslutad 2026-03-13)

Gemensam databas med `klubb_id` – enklare att administrera.

### Tabeller

```sql
-- En rad per klubb
klubbar (
  id         INT PK AUTO_INCREMENT,
  namn       VARCHAR(100),
  kod        VARCHAR(20) UNIQUE,   -- t.ex. VIRA-SE-042
  skapad     DATE
)

-- Grundmedlemslista per klubb (oförändrad mellan speldagar)
medlemmar (
  id         INT PK AUTO_INCREMENT,
  klubb_id   INT FK → klubbar.id,
  fornamn    VARCHAR(50),
  efternamn  VARCHAR(50),
  aktiv      BOOLEAN DEFAULT TRUE  -- inaktivera istället för att radera
)

-- En rad per speldag
speldagar (
  id         INT PK AUTO_INCREMENT,
  klubb_id   INT FK → klubbar.id,
  datum      DATE,
  namn       VARCHAR(100),         -- t.ex. "Speldag mars 2026"
  antal_bord INT,                  -- fastställs när närvaro är registrerad
  status     ENUM('öppen','stängd') DEFAULT 'öppen'
)

-- Närvaro + slumpat spelarnr per speldag
-- En rad per medlem per speldag
narvaro (
  id         INT PK AUTO_INCREMENT,
  speldag_id INT FK → speldagar.id,
  medlem_id  INT FK → medlemmar.id,
  narvaro    ENUM('+','-','X'),    -- X = övertalig (slumpad bort)
  spelarnr   INT                   -- slumpat nr för denna speldag (NULL om frånvarande/X)
)

-- Genererat bordschema – en rad per spelare per omgång
-- Sparas så att gamla speldagar kan visas exakt som de var
schema (
  id         INT PK AUTO_INCREMENT,
  speldag_id INT FK → speldagar.id,
  narvaro_id INT FK → narvaro.id,
  omgang     INT,                  -- 1–6
  bord       INT,                  -- 1–8
  placering  ENUM('NORD','OST','SYD','VAST')
)

-- Ordinarie resultat (en rad per spelare per speldag)
resultat (
  id         INT PK AUTO_INCREMENT,
  speldag_id INT FK → speldagar.id,
  narvaro_id INT FK → narvaro.id,
  omg1       DECIMAL(5,2),
  omg2       DECIMAL(5,2),
  omg3       DECIMAL(5,2),
  omg4       DECIMAL(5,2),
  omg5       DECIMAL(5,2),
  omg6       DECIMAL(5,2),
  summa      DECIMAL(6,2)          -- beräknad: omg1+...+omg6
)

-- Finalresultat – de 4 bästa per speldag
-- Separat tabell eftersom det är en egen händelse
final_resultat (
  id         INT PK AUTO_INCREMENT,
  speldag_id INT FK → speldagar.id,
  narvaro_id INT FK → narvaro.id,
  omg1       DECIMAL(5,2),
  omg2       DECIMAL(5,2),
  omg3       DECIMAL(5,2),
  omg4       DECIMAL(5,2),
  omg5       DECIMAL(5,2),
  omg6       DECIMAL(5,2),
  summa      DECIMAL(6,2)
)
```

### Relationsöversikt

```
klubbar
  └── medlemmar          (grundlista, ändras sällan)
  └── speldagar
        └── narvaro      (närvaro + spelarnr för denna dag)
              └── schema         (bordslottning per omgång)
              └── resultat       (ordinarie resultat)
              └── final_resultat (final, bara för topp-4)
```

### Designbeslut och motiveringar

- **`narvaro` som nav** – spelarnummer är per speldag, inte per medlem. Samma person kan ha nr 7 en dag och nr 23 en annan dag. Kopplingen `resultat → narvaro` gör att vi alltid vet vilket nr personen hade den dagen.
- **`schema` sparas i DB** – bordsschema genereras av JS (hill climbing), men sparas så att gamla speldagar kan visas exakt. Utan detta försvinner schemat om man öppnar en gammal dag.
- **Två resultattabeller** – `resultat` och `final_resultat` är separata eftersom det är två oberoende händelser med olika deltagare (alla aktiva vs topp-4). Enklare att fråga och låsa dem separat.
- **`status` på speldag** – när speldag stängs låses all redigering. PHP-backend kontrollerar status innan varje skrivoperation.
- **`aktiv` på medlem** – ta aldrig bort en medlem, bara inaktivera. Historiska speldagar ska alltid kunna visas med rätt namn.

---

## Speldag – flöde

```
1. Skapa speldag (namn + datum)
2. Registrera närvaro (+/-) för varje medlem
3. Systemet:
   - Slumpar spelarnummer bland närvarande
   - Markerar övertaliga som X (max 32 = 8 bord)
   - Fastställer antal bord (floor(närvarande/4), max 8)
   - Sparar i narvaro-tabellen
4. Generera bordschema (JS-algoritm, sparas i schema-tabellen)
5. Registrera ordinarie resultat under speldagen
6. Generera final (topp-4 ur resultat-tabellen)
7. Registrera finalresultat
8. Stäng speldag → låses för alltid
```

---

## Vad i vira.html som behöver bytas ut

| Idag (lokalt) | Framtid (webb) |
|---|---|
| Läsa txt-fil | `fetch('/api/speldag/{id}')` |
| Spara txt-fil / localStorage | `fetch('/api/spara', POST)` |
| Slumpning av spelarnr i JS | Kvar i JS, men sparas till DB |
| `generate()` bordslottning | Kvar i JS, men sparas till DB |
| `finalPlayers` / `finalResults` | Hämtas/sparas mot DB |

Merparten av JS-logiken (algoritmen, rendering) behöver **inte** ändras – bara save/load-lagret byts ut.

---

## PHP-backend (api.php) – endpoints att bygga

```
GET  /api/klubb/{kod}              → klubbinfo + inloggning
GET  /api/speldagar/{klubb_id}     → lista alla speldagar
POST /api/speldag/ny               → skapa speldag
GET  /api/speldag/{id}             → hämta allt (närvaro, schema, resultat)
POST /api/narvaro/{speldag_id}     → spara närvaro + spelarnr
POST /api/schema/{speldag_id}      → spara genererat bordschema
POST /api/resultat/{speldag_id}    → spara/uppdatera ordinarie resultat
POST /api/final/{speldag_id}       → spara/uppdatera finalresultat
POST /api/speldag/{id}/stang       → lås speldag (status → stängd)
```

---

## Nästa steg (när vi är redo att starta)

1. Installera Laragon lokalt (PHP + MySQL)
2. Skapa databasen med tabellerna ovan
3. Bygga `api.php` (en fil räcker i första versionen)
4. Anpassa `vira.html` – byt ut fil/localStorage mot fetch()
5. Testa lokalt mot Laragon
6. Sätta upp `vira.gaxor.se` på Loopia
7. Ladda upp PHP + HTML, skapa databas på Loopia
8. Test + driftsättning

---

## Frågor att besluta innan start

- [ ] Ska gamla speldagar kunna exporteras (PDF/Excel)?
- [ ] Vem administrerar systemet – bara Jan, eller delegerat till klubbar?
- [ ] Ska spelschema kunna regenereras för en öppen speldag, eller låses det vid generering?
