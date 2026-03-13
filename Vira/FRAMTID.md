# Vira – Framtida utveckling

*Sparad 2026-03-13. Återkom hit när testfasen av v1.57 är klar.*

---

## Webblösning – Övergripande plan

**Domän:** `vira.gaxor.se` (subdomän under befintlig Loopia-domän)
**Tech:** PHP + MySQL på Loopia, vira.html anpassas med fetch()-anrop

### Inloggning / Klubbhantering
- Varje klubb får en unik klubbkod vid start (t.ex. `VIRA-SE-042`)
- Ingen självregistrering i första versionen – Jan skapar klubbar manuellt
- Inloggning med klubbkod → rätt databas/data öppnas
- Klubbnamnet visas i rubriken (t.ex. "Vira – Västerås Spelklubb")
- Klubbnamnet läggs in redan från start, oavsett om det blir fler klubbar

### Databas – en per klubb eller gemensam med klubb_id (bestäms senare)

```sql
klubbar   (id, namn, kod)
spelare   (id, klubb_id, nr, fornamn, efternamn, narvaro)
speldagar (id, klubb_id, datum, namn, status)   ← NY
resultat  (id, speldag_id, spelare_id, omg1..omg6)
```

---

## Speldag-funktionalitet (prioriterat nästa steg)

Användaren nämnde dessa funktioner – troligen enklare med DB än textfiler:

### Ny speldag
- Skapa en namngiven speldag med datum
- Koppla till aktiva spelare (de med "+" just den dagen)
- Generera schema för den speldagen

### Öppna gammal speldag
- Lista tidigare speldagar (datum + namn)
- Öppna = visa schema + resultat
- **Skall ej gå att redigera** när den är stängd (read-only)

### Stänga speldag
- Markera speldag som "stängd" → låses för redigering
- Resultat fryses och kan visas men ej ändras

---

## Nuvarande lösning (v1.57 – lokal HTML)

Allt som idag hanteras lokalt (txt-fil + localStorage) behöver ersättas:

| Idag (lokalt) | Framtid (webb) |
|---|---|
| Läsa/spara txt-fil | PHP läser/skriver MySQL |
| localStorage | PHP-sessioner + MySQL |
| Öppna fil / Spara som | Automatisk synk mot server |
| Manuell X-markering i fil | Hanteras i speldag-gränssnittet |

---

## Frågor att besluta innan start

- [ ] En databas per klubb **eller** en gemensam med klubb_id?
- [ ] Hur många klubbar förväntas initialt?
- [ ] Ska spelschema sparas på servern, eller bara deltagarlista + resultat?
- [ ] Ska gamla speldagar kunna exporteras (PDF/Excel)?
- [ ] Vem administrerar systemet – bara Jan, eller delegerat till klubbar?

---

## Nästa steg (när testfas v1.57 är klar)

1. Besluta databasstruktur (frågorna ovan)
2. Sätta upp `vira.gaxor.se` på Loopia
3. Bygga PHP-backend (api.php, db.php)
4. Anpassa vira.html → fetch()-anrop
5. Implementera speldag-funktionalitet
6. Test + driftsättning
