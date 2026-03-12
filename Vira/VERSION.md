# Bordsplacering - Versionshistorik

## v1.24 - 2026-03-11
✅ Två print-knappar för orientering-val (stående/liggande)

## v1.00 - 2026-03-10
- ✅ Grundversion av bordsplacering-systemet
- ✅ Användare laddar upp textfil (Nr;Förnamn;Efternamn)
- ✅ Automatisk filparsning
- ✅ Sortering på Förnamn, Efternamn eller Nummer
- ✅ Visuell grid-layout för bordsplatser
- ✅ Drag-and-drop filöverföring
- ✅ Versionsäger i UI
- ✅ Responsiv design

### Användarflöde:
1. Öppna `bordsplacering.html`
2. Ladda upp din `.txt`-fil (eller dra den in)
3. Välj sortering: Förnamn / Efternamn / Nummer
4. Bordsplatser genereras automatiskt

### Tekniska detaljer:
- HTML5/CSS3/JavaScript
- Ingen extern beroenden
- Läser .txt-filer med semikolon- eller tab-separatorer
- Auto-detektion av rubrikrader
- Svensk alfabetssortering (localeCompare)

---
