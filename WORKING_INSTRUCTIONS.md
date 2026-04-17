# YayYouMay — Arbejdsinstruktioner

---

## Opstartssekvent

To terminaler ved start af arbejdssession:

**Terminal 1 (dev server):**
```
cd /Users/jakobedelfeldt/yayyoumay && git checkout main && git pull origin main && npm run dev
```

**Terminal 2 (Claude Code):**
```
cd /Users/jakobedelfeldt/yayyoumay && claude
```

---

## Kommunikationskonventioner

- `/btw` — sidenotat, ingen opfolgning nodvendig
- `/ontopic` — tilbage til hoved-trad
- Brug aldrig em dash (—), brug altid almindelig bindestreg (-)
- Bed altid Code om at udvide output: brug head/tail for at undga afkortning
- Kor altid `npx tsc --noEmit` efter andringer

---

## Design sprint status

### Curator UI
- Status: **Komplet**
- Layout, sidebar, topbar og bottom nav er alle implementeret

### Junior UI
- Status: **Ikke kodet endnu**
- Mockups godkendt (lys og glad retning)
- Naeste skridt: tablet landscape mockup, derefter kode junior-siden med alle breakpoints

---

## Kodestokt

- Kor `npx tsc --noEmit` efter alle andringer for at fange type-fejl
- Alle /curator routes deler layout via `src/app/curator/layout.tsx`
- /library er flyttet til /curator/library — opdater interne links derefter
