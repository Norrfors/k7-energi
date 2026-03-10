# VIRA - Versionshistorik

## **v0.89** ✅ (2026-03-10 Rev 4 - Sortering & namn-format)
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
