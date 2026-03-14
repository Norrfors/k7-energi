# VIRA - Versionshistorik

## **v1.62** ✅ (2026-03-13 - STABIL GRUND - Full dokumentation)
**Denna version är stabilt testad. Alla features dokumenterade och uppdaterade.**
- ✅ Finalsystem för topp 4 spelare
- ✅ Dynamiska tabeller/rundor
- ✅ Dual layout (per bord / per spelare)
- ✅ Full resultatregistrering (6 omgångar)
- ✅ Edit-modal med piltangenter
- ✅ LocalStorage persistering
- ✅ File System API auto-sparning
- ✅ Alla dokumentation uppdaterad

---

## **v1.61** ✅ (2026-03-13 - Finalkonfiguration)
- ✨ **Dynamiska konstanter** – ROUNDS, TABLES, PPT kan ändras baserat på antal spelare
- 🐛 **Auto-beräkning av bord** – baserat på aktiva spelare (N/4)
- ✨ **Finalsystem** – sparar finalresultat separat

## **v1.60** ✅ (2026-03-13 - Spela per spelare-vy)
- ✨ **Dual layout-mode** – toggle mellan "Visa per bord" och "Visa per spelare"
- ✨ **Nya ikoner** – göra den visuella switchen tydligare

## **v1.59** ✅ (2026-03-13 - Förbättrad resultatregistrering)
- ✨ **Resultat-modal uppdaterad** – visa alla 6 omgångar i separata kolumner
- ✨ **Live summa** – beräknas när värden ändras
- ✨ **Formatering** – svenska decimaler (komma)

## **v1.58** ✅ (2026-03-13 - Edit-funktion)
- ✨ **Redigera deltagarlista i UI** – ✏️ Redigera-knapp
- ✨ **Edit-modal** – piltangenter för navigation
- ✨ **Närvaro-kolumn** – ändra mellan "+", "-", "X" direkt i modal
- ✨ **Auto-sparning** – sparas till LocalStorage

## **v1.57** ✅ (2026-03-13 - LocalStorage persistering)
- ✨ **Spelarlistan sparas mellan sessioner** – localStorage integration
- ✨ **Auto-load vid start** – läser tidigare importerad lista
- 🐛 **Ingen data försvinner** – mellan webbläsare-omstarter

## **v1.56** ✅ (2026-03-13 - Final-system introduktion)
- ✨ **🏆 Final-knapp** – generar finalschema från topp 4 spelare
- ✨ **Finalresultat-modal** – separat inmatning för final
- ✨ **Final-sektion i export** – sparar finalresultat i CSV

## **v1.55** ✅ (2026-03-13 - UI-förbättringar)
- ✨ **Sorterings-knappar** – Nummer, Förnamn, Efternamn (visuell grupp)
- ✨ **Konflikt-markering** – röda chips för upprepade par
- ✨ **Blink-animation** – när spelare väljs
- ✨ **Responsiv layout** – flex-wrap för små skärmar

## **v1.54** ✅ (2026-03-13 - Resultatregistrering core)
- ✨ **Registrera resultat** – 6 omgångs-kolumner i modal
- ✨ **Sortering i resultat** – 4 alternativ (Resultat, Nr, Förnamn, Efternamn)
- ✨ **Summa-beräkning** – live uppdatering med formatering

## **v1.53** ✅ (2026-03-13 - File System Access API uppgradering)
- ✨ **showSaveFilePicker()** – Spara som dialog
- ✨ **Auto-MIME type** – `.txt` och `.csv` format
- 🐛 **Fallback för äldre webbläsare** – klassisk HTML file input

## **v1.52** ✅ (2026-03-13 - CSV-export expansion)
- ✨ **Exportera all data** – Nr, Förnamn, Efternamn, Närvaro, OMG1-6
- ✨ **Muli-format import** – stöder `;`, `\t`, `,` som separator
- 🐛 **Kompatibilitet** – kan fortfarande läsa namn-bara-listor

## **v1.51** ✅ (2026-03-13 - Piltangenter i modaler)
- ✨ **Keyboard navigation** – Upp/Ner/Vänster/Höger för cellnavigering
- ✨ **Tab-navigation** – fungerar tillsammans med piltangenter
- ✨ **Bättre UX** – Excel-liknande upplevelse

## **v1.48–v1.50** ✅ (2026-03-13 - Intern stabilisering)
- 🐛 Diverse bug-fixes efter v1.47
- ✨ Performance-optimeringar
- ✨ Code refactoring för framtida skalning

---

## **v1.47** ✅ (2026-03-12 - Överblivna spelare vid eget bord)
- ✨ **Överblivna spelare** (active % 4) placeras automatiskt vid Bord TABLES+1 för alla 6 omgångar
- 🔴 Överblivna visas med röd chip och röd bordsrubrik "Bord X ⚠️"
- 📊 Rubriken visar "6 bord + 3 överblivna" när det finns överblivna
- 👤 Visa per spelare: överblivnas bordsnummer visas i rött

## **v1.46** ✅ (2026-03-12 - Resultatsortering & +-räkning)
- 🐛 **Namn visas korrekt i resultatmodal vid sortering på Efternamn** (format: "Efternamn, Förnamn")
- ✨ **Sorteringsknapparna i Registrera resultat** fick label "Sortering:" och fyra val: Resultat / Nr / Förnamn / Efternamn
- 📊 **Statusrad vid inläsning** visar nu: antal aktiva (+), antal bord (floor, inte ceil), överblivna spelare (active % 4), inaktiva (-)
- 📂 **Namnfil utan nr** – alla spelare får nu "+" (tidigare fick spelare efter nr 32 "-")

## **v1.45** ✅ (2026-03-12 - Sortering i resultatmodal)
- ✨ **Sorteringsknappar i Registrera resultat**: Resultat, Nr, Förnamn, Efternamn med label "Sortering:"

## **v1.44** ✅ (2026-03-12 - Final-layout)
- ✨ **Final-knappen** genererar nu samma bordslayout som vanligt schema (NORD/OST/SYD/VÄST), bord 1 i guld

## **v1.43** ✅ (2026-03-12 - Sortering resultat)
- ✨ **Registrera resultat** fick knapp för sortering på Resultat/Nr

## **v1.42** ✅ (2026-03-12 - Spara som)
- ✨ **Spara som...** knapp med Windows fildialogruta (showSaveFilePicker + fallback)
- 🗑️ **Stående/liggande print-knappar borttagna** – Windows/Edge hanterar orientering

## **v1.41** ✅ (2026-03-12 - Rubrikfix & File System API Fallback)
**Fixad rubrik och fallback för äldre/saknade File System Access API**

### Bugfixer
- 🐛 **Rubrik visar nu korrekt antal** (inte hardkodat 32)
  - Visar "Ingen fil vald" vid start
  - Uppdateras dynamiskt när fil laddas
  - Visar faktiskt antal deltagare och antal aktiva
  - Format: "X deltagare · Y bord · 6 omgångar"

- 🔄 **File System Access API Fallback**
  - Om `showOpenFilePicker()` inte fungerar → faller tillbaka på klassisk HTML file input
  - Fungerar nu på ALLA webbläsare (inte bara moderna)
  - Intern: `openFile()` försöker API först, sedan fallback

- ✨ **Bättre UI-meddelanden**
  - Visar status: "Importerad: 150 spelare | 32 aktiva | 118 inaktiva"
  - Tydligare felmeddelanden

### Tekniska ändringar
- ID på rubrik: `<h1 id="mainTitle">` (möjligare att uppdatera från JavaScript)
- `updateMainTitle()` - Ny funktion för rubrik-uppdatering
- `openFile()` - Försöker File System API, faller tillbaka på klassisk input
- `loadFileFallback()` - Handler för klassisk file input (fallback)
- HTML: `<input type="file" id="fileInputFallback">` för fallback

### Kompatibilitet
- ✅ Chrome, Edge, Safari (moderna versioner) - Använder File System API
- ✅ Äldre webbläsare, Firefox - Använder klassisk HTML file input
- ✅ Fungerar på alla plattformar och enheter

---

## **v1.40** ✅ (2026-03-12 - Smart Fildetektering & Auto-Numrering)
**Automatisk detektering av filformat, auto-numrering 1-999, och förbätrad export**

### Nya funktioner
- 🧠 **Smart fildetektering**
  - Detekterar om filen bara innehål namn (NO numbers)
  - Detekterar standard format (Nr;Förnamn;Efternamn;...)
  - Automatisk val av parser baserat på filformat

- 🔢 **Auto-numrering (1-999)**
  - Om du laddar bara namn: Auto-numrera spelare 1-N
  - Exempel: `Anders Berkmo` → Nr 1
  - Stöder upp till 999 spelare (inte bara 32)
  - Namn kan delas på space: `Anders Berkmo` → Förnamn: Anders, Efternamn: Berkmo

- ⚡ **Auto-närvaro tilldelning**
  - Första 32 automatiskt: `+` (aktiva)
  - Spelare 33+: `-` (inaktiva, står över)
  - Användare kan manuellt ändra i redigeringsmodal

- 📊 **Schemagenerering med detaljerad statistik**
  - Visar: "Fördelat utan konflikter!"
  - Visar antal i bord och antal som står över
  - Listar namn på spelare som STÅR ÖVER (röd text)
  - Auto-reducering av antal bord om för få aktiva spelare

- 📥 **Förbättrad export**
  - Export nu hanterar 1-999 spelare (inte bara 1-32)
  - Exporterar ALL data: Nr, Namn, Närvaro, OMG1-6
  - Format: CSV semikolonseparerat (UTF-8)

### Användarflöde - Ny fil (bara namn)
1. Ladda fil: `Medlemmar.txt` (bara namn, ingen nummer)
   ```
   Anders Berkmo
   Anna Svanquist
   Anita Bergstedt
   ... (många fler)
   ```
2. System auto-numrerar: #1 Anders, #2 Anna, #3 Anita...
3. Första 32 får `+` (aktiva), resten får `-` (inaktiva)
4. Status visar: "✅ Importerad: 150 spelare | 🟢 Aktiva: 32 | 🔴 Inaktiva: 118"
5. Generera schema → Visar: "32 spelare i 8 bord | 118 står ÖVER"

### Tekniska ändringar
- `detectAndParseFile()` - Ny huvudfunktion för fildetektering
- `parseNameOnlyFile()` - Parser för bara namn (auto-numrer)
- `parseStandardFile()` - Parser för standard Nr;Förnamn;Efternamn format
- `generate()` - Uppdaterad för att visa statistik om vilka som står över
- `generateCSV()` - Uppdaterad för att exportera alla spelare (1-999)

### Stöd för stora grupper
- ✅ 1-32 spelare: Vanligt Vira-format (alla aktiva, alla i ett schema)
- ✅ 33-999 spelare: Auto-numrera, split in aktiva/inaktiva, visa vilka står över
- ✅ USB-distribution: Export alla data + närvaro + resultat

### Exempel - 100 spelare input
```
Input: 100 namn (bara text, ingen nummer)
↓
Auto: Nr 1-100 satt
Auto: Närvaro: +1-32, -33-100
Status: "✅ Importerad: 100 spelare | 🟢 Aktiva: 32 | 🔴 Inaktiva: 68"
Generate schema: "32 spelare i 8 bord | 68 står ÖVER: name1, name2, ..."
Export: Sparar alla 100 med nummer, närvaro, resultat (om registrerat)
```

---

## **v1.39** ✅ (2026-03-12 - File System Access API - Direkt filsparning)
**Spara ändringar direkt till originalfilen eller ny fil via File System Access API**

### Nya funktioner
- 🔓 **Öppna medlemslista med filhandle**
  - Knapp: "📂 Öppna medlemslista (spara automat)"
  - Webbläsaren frågar: "Tillåt Vira åt komma åt denna fil?"
  - Du klickar OK → Vira får tillgång att läsa OCH skriva till filen
  - Fungerar på lokal disk, USB-sticka, nätverksenheter osv.

- 💾 **Auto-sparning till samma fil**
  - När du redigerar namn/närvaro → sparas direkt till originalfilen
  - När du registrerar resultat → sparas direkt till originalfilen
  - INGEN extra "Spara knapp" behövs - det sker automatiskt
  - Filnamn visas i gränssnitt: "📌 Medlemmar.txt (Auto-sparas vid ändringar)"

- 📥 **Exportera till ny fil (för distribution)**
  - Knapp: "💾 Exportera till ny fil"
  - Sparar en kopia med datum: `Medlemmar-export-2026-03-12.txt`
  - Du kan välja destination (USB-sticka, OneDrive osv.)
  - Samma format som originalfilen

- 📄 **CSV-format med alla värden**
  - Kolumner: `Nr;Förnamn;Efternamn;Närvaro;OMG1;OMG2;OMG3;OMG4;OMG5;OMG6`
  - Header sparas automatiskt
  - Semikolonseparerat (UTF-8, LF-radslut)

### Användarflöde
1. Klicka "Öppna medlemslista"
2. Välj en fil (t.ex. Medlemmar.txt)
3. Webbläsare: "Vira vill få tillgång" → OK
4. Redigera namn, närvaro, registrera resultat
5. **Ändringarna sparas DIREKT till filen** ✅
6. För distribution: Klicka "Exportera till ny fil" → välj USB-sticka

### Tekniska detaljer
- API: **File System Access API** (W3C standard)
- `showOpenFilePicker()` - för att välja fil
- `showSaveFilePicker()` - för export
- `fileHandle.createWritable()` - sparar direkt
- Kräver: Chrome 86+, Edge 86+, Safari 15.1+, Firefox 111+ (experimental)

### Kompatibilitet
- ✅ Chrome, Edge, Safari, Firefox (modern version)
- ⚠️ Äldre webbläsare stöds INTE (ingen fallback ännu)
- ✅ Fungerar på: lokala filer, USB-sticka, nätverksenheter, OneDrive, Google Drive

### Skillnad från v1.38
- v1.38: Sparade ENDAST i webbläsarens localStorage (ej på disk)
- v1.39: Sparar DIREKT till originalfilen på disk + möjlighet att exportera

---

## **v1.38** ✅ (2026-03-12 - Excel-liknande Resultatinmatning med Svenska Decimaler)
**Excel-inspirerad UX för omkgångsresultat: piltangenter, överwrite, svenska format (komma)**

### Nya funktioner
- ⌨️ **Piltangenter för cellnavigering** (Excel-liknande)
  - **Vänster/Höger** piltar: Röra sig mellan OMG1-6 kolumner
  - **Upp/Ner** piltar: Röra sig mellan spelares rader
  - **Tab**: Fungerar också (standard HTML)
  
- 🔢 **Svenska decimaler (KOMMA)**
  - Accepteras: `1,25` eller `1.25` (båda fungerar i inmatningen)
  - Lagras internt: `1.25` (punkt för JavaScript)
  - Visas i UI: `1,25` (komma för användare)
  - Summa formateras också med komma: `25,50` inte `25.50`
  
- 💾 **Select-all on focus + Complete overwrite**
  - Fokus på input → värde markeras automatiskt
  - Ny inmatning skriver över gammalt värde (inte append)
  - Precis som Excel-celler
  
- 🎯 **Better input type**
  - Ändrat från `type="number"` → `type="text"`
  - Tillåter smidigare svenska decimalhantering
  - Validering fortfarande strikt (no text, 0-99.99 range)

### Tekniska ändringar
- `openResultsModal()`: 
  - Nya keydown-lyssnare för arrow keys
  - Ny fokus-lyssnare för select-all
  - Formatering: `formatSvenska()` för display, punkt internt
  - `data-col="1-6"` (numerisk) istället för `data-col="omg1-6"`
  
- `saveResults()`:
  - Ny `convertValue()` för att konvertera komma→punkt vid sparning
  - Håller punkt-format internt, omvandlar vid lagring
  
- **Blur-event**: Validerar och formaterar värdet (tar bort bokstäver, begränsar decimaler)

### Användarflöde
1. Öppna "Registrera resultat"
2. Klicka på en cell (eller använd piltangenter att navigera)
3. Skriv värdet: `1,25` eller `1.25` (båda OK)
4. Tryck pil upp/ner/vänster/höger för att hoppa mellan celler
5. Värdet sparas automatiskt som `1.25` internt
6. Summan uppdateras i realtid (visar `25,50`)

### Exempel
```
Användare skriver:  "1,25" (svenska)
    ↓ Lagras internt: "1.25"
    ↓ Visas i UI: "1,25"
    ↓ Summa beräknas och visar: "25,50"
```

### UI-förbättringar
- Inputs centrerade och tydligare (text-align: center)
- Placeholders visar: `0,00` (svenska format)
- Summatotal visar också med komma

---

## **v1.37** ✅ (2026-03-11 - Modal Cleanup & Smart Validering)
**Förenklad redigera-modal och strikt validering av final-resultat**

### Ändringar
- ✖️ **Redigera modal - Förenklad**
  - Borttagen OMG1-6 och summa-kolumner
  - Visar ENDAST: Nr, Förnamn, Efternamn, Närvaro
  - Närvaro sparas korrekt (+/- eller tom)
  
- 🔢 **Auto antal bord**
  - Beräknas vid filuppladdning: `ceil(antal_spelare / 4)`
  - Exempel: 32 spelare → 8 bord, 20 spelare → 5 bord
  
- ✅ **Generera final - Strikt validering**
  - **KRÄVER**: Alla aktiva spelare (+) måste ha ALLA 6 resultat ifyllda
  - Visar meddelande om vilka som saknar resultat
  - Knapp disabled tills allting är komplett
  - Sorteras på HÖGSTA summa först
  
- 🛡️ **Resultat bevaras**
  - OMG-data försvinner INTE när du uppdaterar namn/närvaro
  - Separata modaler för namn-redigering vs resultat-inmatning

### Tekniska ändringar
- `openEditModal()`: Grid-template 4 kolumner istället för 11
- `saveEditedData()`: Bevarar befintlig OMG-data från `players` objektet
- `loadFile()`: Auto-beräkning av `numTables`
- `generateFinal()`: Ny validering - all 6-värden måste vara ifyllda
- `saveResults()`: Smart enable/disable av final-knapp

### Flöde
1. 📂 Ladda deltagarlista
2. ✏️ Redigera (namn + närvaro)
3. 🎲 Generera schema
4. 📊 Registrera resultat (ALLA 6 omkgångar)
5. 🏆 Generera final (AUTOMATISK VALIDERING!)

---
## **v1.36** ✅ (2026-03-11 - Resultat-registrering & Final-schema)
**Ny modal för att registrera omkgångsresultat med automatisk final-placering**

### Nya funktioner
- 📊 **Registrera resultat** - Modal med:
  - Alla aktiva spelare (narvaro="+")
  - OMG1-6 inmatningsfält (numerisk, max 2 decimaler)
  - Automatisk summaberäkning
  - Sparad till localStorage
- 🏆 **Generera final** - Automatisk final-schemalägning:
  - **Bord 1:** De 4 spelare med högst totalsumma
  - Vid lika summa: Ta den med lägst nr
  - **Övriga bord:** Resterande spelare slumpade
  - Visar "🏆 FINAL" i rubrik

### Knappar
- **📊 Registrera resultat** - Aktiveras efter "Generera schema"
- **🏆 Generera final** - Aktiveras efter sparning av resultat

### Validering
- Endast numeriska värden i OMG-kolumner
- Max 2 decimaler (auto-formatering vid blur)
- Summa beräknas automatiskt

### Tekniska ändringar
- `openResultsModal()` - Öppnar resultat-modal
- `saveResults()` - Sparar OMG-data till localStorage
- `generateFinal()` - Bygger final-schema baserat på summor
- CSS för `.results-row`, `.results-summa` etc.

---
## **v1.35** ✅ (2026-03-11 - Display Enhancement: Spelarnamn & Närvaro-visning)
**Visar spelarnamen i bordskema + närvaro-status för alla spelare**

### Nya funktioner
- 👤 **Visa per bord**: Namn visas som "NORD 5 Anders Berkmo" (Placering + Nr + Namn)
- 📋 **Visa per spelare**: 
  - Visar ALLA spelare (även de med `-` eller okänd närvaro)
  - Placeringar ENDAST för spelare med `+` i Närvaro
  - De med `-` märks "(Ej deltagande)" med grå färg
  - De med tom närvaro märks "(Okänd)"
- 🎨 **Visuell feedback**: Inaktiva spelare (ej +) får ljus grå bakgrund

### Användarnytta
- Tydliga namn istället för bara nummer
- Alla deltagare syns även om de inte är med i schemat
- Lätt att se status direkt: aktiv/frånvarande/okänd

### Tekniska ändringar
- `renderBordView()`: Lägger till `getPlayerName(p)` för varje plats
- `renderSpelarView()`: Filtrering ändrad från att exkludera "-" till att:
  - Visa ALLA spelare
  - Conditionally rendra placeringar enbart för `narvaro === '+'`
  - Visa status-märkning (Ej deltagande / Okänd)

---
## **v1.34** ✅ (2026-03-11 - KRITISK BUGFIX: Globala Konstanter)
**Fixade dynamisk antal bord-problem genom att ändra const → let**

### KRITISK BUGFIX
- 🔧 **Konstanter-problem:** TABLES, PPT, ROUNDS var `const`, kunde inte uppdateras
- 🐛 **Symptom:** "Cannot read properties of undefined (reading '0')" när antal bord ändrades
- ✅ **Lösning:** Ändrad till `let` så få uppdateras i buildSchedule()
  ```javascript
  // FÖRE: const ROUNDS = 6, TABLES = 8, PPT = 4, N = 32;
  // EFTER: let ROUNDS = 6, TABLES = 8, PPT = 4, N = 32;
  ```
- 🔄 **Effekt:** Dynamisk antal bord fungerar nu!!

### Resultat
- Kan nu öka/minska antal bord utan felmeddelanden
- Togglen mellan "Vis per bord" / "Visa per spelare" fungerar
- Renderingen uppdateras korrekt när TABLES ändras

---
## **v1.33** ✅ (2026-03-11 - Dynamisk Antal Bord & Närvaro-filter)
**Antal bord inmatningsbar, endast (+) spelare i schemat**

### Nya funktioner
- 🎲 **Antal bord**: Inmatningsbar 1-32 (default 8)
- 👥 **Närvaro-filter**: ENDAST spelare med `+` ingår i schemat (- och tom = borta)
- 📊 **Dynamisk header**: Visar faktiskt antal deltagare + valda bord
- ⚠️ **Validering**: Varnar om för få spelare för valt antal bord

### Tekniska ändringar
- `buildSchedule(numTables)` tar nu antal bord som parameter
- Konstanter beräknas dynamiskt från numTables
- Endast `+` markerade spelare filtreras ut
- Rubrik uppdateras med faktiska värden efter schema-genering

### Användning
1. Ladda deltagarlista (alla får `+` per default)
2. Redigera och sätt `-` på frånvarande
3. Ändra "Antal bord" om du vill annat än 8
4. Klicka "Generera schema"

---
## **v1.32** ✅ (2026-03-11 - Syntax Error FIXAD!)
**Reparerad syntax error - try-catch block var felöppet**

### KRITISK BUGFIX
- 🔧 **Syntax error:** `Missing catch or finally after try` - FIXAD
- 🔓 Felaktigt try-block i buildSchedule() borttagen
- ✅ `loadFile()` är nu tillgänglig igen
- 🚀 Filuppladdning borde fungera nu!

---
## **v1.31** ✅ (2026-03-11 - Filuppladdning Debugging)
**Detaljerad loggning för att diagnos-filuppladdning**

### Förbättringar  
- 🔍 **Filuppladdning-logging** - Console visar exakt vilka rader som parsas
- 📊 **Rapportering** - Visar antal parsade spelare vs errors
- 🗂️ **Rad-debugging** - Visar skippad rader om parsing misslyckas
- 📝 **Full trace** - Allt logged från val av fil till UI-uppdatering

### För debugging:
1. Öppna Dev Console: `F12`  
2. Gå till `Console`-fliken
3. Klicka "Ladda deltagarlista" och välj fil
4. Kolla output

---
## **v1.29** ✅ (2026-03-11 - Förbättrad Errorhantering)
**Bättre feldiagnostik för att hitta root cause av "reading" errors**

### Förbättringar  
- 🔍 **Detaljerad error-logging** - Skriver player-count och full error trace till browser console
- 🛡️ **Null-safety** - Filtrerar bort NaN och undefined från player-lista
- 📱 **Visar error i UI** - Status visar nu "Se browser console för detaljer"
- 🔧 **Validering** - Kastar omedelbar error om 0 spelare är tillgängliga

### För debugging:
1. Öppna Dev Console: `F12`  
2. Ladda fil och generera
3. Kolla `Console`-fliken för detaljerade felmeddelanden

---

## **v1.28** ✅ (2026-03-11 - Tangentbordsnavigering & Bugfix)
**Navigering med piltangenter i redigerings-modal + fixad event-listener-bugg**

### Nya funktioner
- ⌨️ **Piltangenter-navigering** - Flytta mellan celler med:
  - `↑` / `↓` för att gå upp/ner mellan deltagare
  - `←` / `→` för att gå vänster/höger mellan kolumner
  - Automatisk fokus och markering av innehål vid navigation
- 🔧 **Bugfix** - Fixad "Cannot read properties of undefined" error vid modal-öppning

### Tekniska ändringar
- Alla inputs får nu `data-nr` och `data-col` attribut för grid-referens
- Event listeners är nu protected med proper null-checks
- 2D inputMap-struktur för sömlös tangentbordsnavigering
- Keydown-handler på alla inputs för ArrowUp/Down/Left/Right

---

## **v1.27** ✅ (2026-03-11 - Närvaro-inmatning Optimerad)
**Snabbare registrering av närvaro – textfält istället för select-box**

### Förbättringar
- 📝 **Närvaro-kolumn** - Byt från select-box till textfält (title ändrat från "N" till "Närvaro")
- ⚡ **Snabbar inmatning** - Accepterar bara `+`, `-`, eller tom (direkt tangentbordsöversättning)
- 🔍 **Validering i realtid** - Felaktiga tecken filtreras bort automatiskt
- 📏 **Enteknads-gräns** - Maxlength=1 för snabb inmatning

### Tekniska ändringar
- `.edit-narvaro` är nu ett `<input type="text">` istället för `<select>`
- Event listener validerar input in realtime (accepterar endast +, -, eller tom)
- CSS uppdaterat för textfält-styling

---

## **v1.26** ✅ (2026-03-11 - Bugfixer för Närvaro)
**Null-safety fixes och förbättrad felhantering vid filuppladdning**

### Bugfixer
- 🔧 **buildSchedule()** - Lagt till null-check innan läsning av `players[nr].narvaro`
- 🔧 **generate()** - Förbättrad filtrering av spelare med närvaro-värde
- 🔧 **renderSpelarView()** - Använder nu faktiska spelare från `Object.keys(players)` istället för att anta 1-32
- 🔧 **Felhantering** - Bättre behandling av gamla filer utan närvaro-kolumn

### Kompatibilitet
- Stöder både v1.25 format (med närvaro) och bakåtkompatibelt med v1.24 (utan närvaro)
- Automatisk initialisering av närvaro-fält för gamla filer

---

## **v1.25** ✅ (2026-03-11 - Närvaro + Omkgångar)
**Närvaro-kolumn och omkgång-tracker för varje deltagare**

### Nya funktioner
- 👤 **Närvaro-kolumn** - Markera närvaro med `+`, `-`, eller tom
  - Endast spelare med `+` inkluderas i schemat
  - Spelare med `-` filtreras bort i visningen
- 🎯 **6 Omkgång-kolumner** (OMG1-OMG6) - Träckring av poäng/resultat per omkgång
- 📊 **Summa-kolumn** - Beräknas automatiskt från OMG1-OMG6
- 🔢 **Dynamisk rubrik** - Visar faktiskt antal närvarande deltagare
- 📝 **Redigera modal** - Full support för alla kolumner
- 💾 **Sparning** - Lagras tillsammans med deltagarlista

### Tekniska ändringar
- `buildSchedule()` filtrerar endast spelare med narvaro="+"
- `renderBordView()` och `renderSpelarView()` visar bara närvarande
- Filformat utökat: `Nr;Förnamn;Efternamn;Närvaro;OMG1;OMG2;OMG3;OMG4;OMG5;OMG6`
- Bakåtkompatibilitet - gamla filer utan omkgångar fungerar

---

## **v1.24** ✅ (2026-03-11 - Print-orientering)
**Smarta namn-displayformat baserat på sorteringsval**

### Nya funktioner (Rev 4)
- ✨ **Dynamisk namn-format**:
  - Standard: "Förnamn Efternamn"
  - Vid sortering på Efternamn: "Efternamn Förnamn"
- 📁 **Renare fil-visning** - Visar bara filnamn (utan prefix)
- 🔘 **Sorteringsknapparna närmare** - Direkt under filnamnet på samma rad

### Sortermöjligheter
- 🔢 **Nummer** (1-32) - visar "Förnamn Efternamn"
- 🔤 **Förnamn** (alfabetiskt A-Ö) - visar "Förnamn Efternamn"
- 🔤 **Efternamn** (alfabetiskt A-Ö) - visar "**Efternamn Förnamn**"

### Layoutförbättringar (Rev 3-4)
- 📏 **Kompakt layout** - alla knappar på EN rad
- 📶 **Version i rubrik** - "Vira v0.89 · 32 deltagare · 8 bord · 6 omgångar"
- 📝 **Smart hint** - "Klicka på siffra..." visas BARA i "vis per bord" vyn
- 👥 **Maximerat utrymme** - mindre fontstorlek på UI

### Format för deltagarlista
```
Nr;Förnamn;Efternamn
1;Anders;Berkmo
2;Anna;Svanquist
3;Anita;Bergstedt
```

Separatorer som stöds: `;` | `\t` | `,`

---

## **v0.88** (2026-03-10 Rev 1)
- Tidigare version med bassortering
- Sparad som `vira088.html`
