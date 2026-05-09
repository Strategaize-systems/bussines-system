# SLC-663 — Deals-Listen-Seite (BL-447, FEAT-663)

## Metadata
- **Slice ID:** SLC-663
- **Version:** V6.6
- **Feature:** FEAT-663
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-09
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-178 (Top-10 fest, Won-90-Tage-Default, ILIKE-Type-Ahead)
- **Reihenfolge-Pflicht:** **parallel zu SLC-664/665/666 OK** (kein KI-Workspace-Touch). Empfohlen nach SLC-662 fuer User-Cockpit-Sichtbarkeit, vor SLC-664 weil Deals-Karte → Deal-Detail navigiert.

## Goal

Deals-Listen-Seite (`/deals`) wird neu strukturiert: Type-Ahead-Suche oben + Pipeline-Switcher + Top-10-Block (server-side gewichtet) + Karten-Grid (kompakt, ohne Avatar) + 2 einklappbare Sektionen "Gewonnen" (90 Tage Default) / "Verloren". Pipeline-Switcher filtert ALLE Bloecke. Klick auf Karte → Deal-Detail.

## Scope

**In Scope:**
- `cockpit/src/app/(app)/deals/page.tsx` MODIFY (oder NEU strukturiert) — Server-Component mit Daten-Lade-Layer
- `cockpit/src/app/(app)/deals/deals-client.tsx` MODIFY — Client-Component mit Pipeline-Switcher-State + Karten-Grid + Won/Lost-Sektionen
- `cockpit/src/app/(app)/deals/deal-card.tsx` (NEU) — Wiederverwendbare Karten-Component
- `cockpit/src/app/(app)/deals/type-ahead-search.tsx` (NEU) — Type-Ahead-Suche oben
- `cockpit/src/lib/deals/queries.ts` MODIFY (oder NEU) — Server-side Top-10-Query mit `value × probability` Sortierung
- `cockpit/src/app/api/deals/typeahead/route.ts` (NEU) — Type-Ahead-API mit ILIKE auf 3 Quellen
- Vitest-Tests fuer Top-10-Query + Type-Ahead-Logic

**Out of Scope:**
- NL-Suche/Pipeline-NL-Suche-Removal (SLC-667)
- Volltext-Suche ueber Transcripts/Notizen (kein V6.6)
- Filter-Bar (Stage, Owner, Date-Range) — bleibt wie heute, kein neuer Filter
- Bulk-Actions / Drag-und-Drop (kein V6.6)
- Karten-Inhalt-Anpassung pro User (V7)
- Trigram-Index pg_trgm (BL-452, falls Latenz bei >1000 Deals)
- Custom Berichts-Konfiguration auf Karten (V7+)

## Acceptance Criteria

**AC1:** /deals rendert in dieser Reihenfolge: Type-Ahead-Suche, Pipeline-Switcher, Top-10-Block (mit "Top 10"-Badge), Karten-Grid (aktive Deals), 2 einklappbare Sektionen "Gewonnen" + "Verloren".

**AC2:** Top-10-Block zeigt `ORDER BY (value * probability) DESC LIMIT 10` server-side. Stages `won`/`lost`/`parked` (oder aequivalente Stage-IDs) ausgeschlossen via WHERE-Klausel.

**AC3:** Pipeline-Switcher (Tabs Desktop / Dropdown Mobile) filtert Top-10 UND Karten-Grid UND beide Won/Lost-Sektionen — alle vier Bloecke aktualisieren synchron beim Wechsel.

**AC4:** Karten-Inhalt: Title + Wert (mit Waehrung) + Firma (Account-Name) + Stage-Badge (mit Brand-Token-Color) + Naechste Aktion (Title + relatives Datum z.B. "morgen"/"in 3 Tagen"/"ueberfaellig") + Wahrscheinlichkeit-Pill (Probability als Prozent). KEIN Foto/Avatar/Hauptkontakt.

**AC5:** Klick auf Karte navigiert zu `/deals/[id]` (Deal-Detail).

**AC6:** "Gewonnen"-Sektion ist `<details>` collapsed by default, Klick auf Header expandiert. Default-Filter: `WHERE stage IN (won) AND updated_at > NOW() - INTERVAL '90 days'`. "Mehr anzeigen"-Button laedt aeltere. Gleiche Logik fuer "Verloren".

**AC7:** Type-Ahead-Suche: Search-Input oben, debounced 200ms, Server-API `/api/deals/typeahead?q=...` mit ILIKE auf `deals.title`, `companies.name`, `contacts.full_name` (via deal_contacts-Junction wenn vorhanden) LIMIT 10. Dropdown unter Input.

**AC8:** Klick auf Type-Ahead-Result navigiert zum Deal-Detail (`/deals/[id]`).

**AC9:** Pipeline-Switcher-Default: erste Pipeline aus `pipelines`-Tabelle ODER zuletzt gewaehlte (localStorage `cockpit:deals:last-pipeline`).

**AC10:** Mobile (≤768px): 1 Spalte Karten-Grid, Pipeline-Switcher als Dropdown, Sektionen funktional. Type-Ahead-Dropdown nimmt volle Breite.

**AC11:** TSC + `npm run test` (Vitest +N Tests) + `npm run build` + `npm run lint` alle clean. Bestehende Tests ohne Regression.

**AC12:** Live-Smoke: User oeffnet /deals — sieht Top-10 (echte Daten), wechselt Pipeline (Top-10+Grid+Won+Lost aendern sich), klickt auf Karte → Deal-Detail laedt. Type-Ahead findet Deal nach Firmenname (mind. 1 Result rendert). Won-Sektion expandiert auf Klick.

## Reuse

- Style Guide V2 Brand-Tokens fuer Stage-Badges + Wahrscheinlichkeit-Pills (BL-441)
- Bestehende `<PageHeader>`-Component (V6.5)
- Bestehende ViewToggle-Pattern wenn vorhanden (V6.5 SLC-654)
- shadcn `<Card>`, `<Tabs>`, `<Select>`, `<Collapsible>` falls vorhanden
- Bestehende `formatCurrency` + `formatRelativeDate`-Utilities (Date-Fns oder Custom)

## Risks

- **R3.1 Performance bei vielen Deals:** ILIKE ohne Index kann bei >1000 Deals langsam werden. **Mitigation:** User hat aktuell <500 Deals, BL-452 fuer Trigram-Index falls Latenz steigt.
- **R3.2 Pipeline-Switcher-State-Drift:** mehrere Bloecke synchronisieren ist tricky. **Mitigation:** Pipeline-State im Server-Component-URL-Parameter (`?pipeline=...`) oder `useState` in Client-Wrapper.
- **R3.3 Naechste-Aktion-Loading:** pro Karte muss naechste offene Task geladen werden — N+1-Query-Risiko. **Mitigation:** JOIN/Lateral-JOIN in Top-10-Query mit Subquery `(SELECT ... ORDER BY due_at LIMIT 1)`.
- **R3.4 Won/Lost-Mehr-anzeigen-Pagination:** Default 90 Tage ist erste Batch, Mehr-Button laedt unbeschraenkt — Memory-Risiko. **Mitigation:** "Mehr anzeigen" laedt naechste 90-Tage-Batch (also weitere LIMIT 100), nicht alle.

## Verification Strategy

- **Pre:** `cockpit/src/app/(app)/deals/*` lesen — bestehende Page-Struktur identifizieren. `pipelines`-Tabelle pruefen.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** Build + Test + Lint + Live-Smoke nach Coolify-Redeploy.

---

## Micro-Tasks

### MT-1: Server-side Top-10-Query
- Goal: SQL-Query/Server-Action fuer Top-10-Block.
- Files: `cockpit/src/lib/deals/queries.ts` (NEU oder MODIFY)
- Expected behavior: `getTopDeals({pipelineId, limit=10})` returnt `Deal[]` mit JOIN auf companies + Subquery fuer naechste-Task. ORDER BY `(value * probability) DESC`. WHERE Stage NOT IN won/lost/parked.
- Verification: Vitest-Test mit Mock-DB-Daten — assert Sortierung, assert WHERE-Filter, assert LIMIT 10.
- Dependencies: none

### MT-2: Type-Ahead-API
- Goal: API-Route fuer Type-Ahead-Suche.
- Files: `cockpit/src/app/api/deals/typeahead/route.ts` (NEU)
- Expected behavior: GET `?q=...` returnt `{results: [{id, title, company_name, contact_name?}]}` (max 10). ILIKE auf `deals.title`, `companies.name`, `contacts.first_name||' '||last_name`. Bei `q.length<2`: leere Liste. Auth via Supabase-Cookie.
- Verification: Vitest mit Mock-DB. 3 Tests: empty-q, found-by-title, found-by-company.
- Dependencies: none

### MT-3: Karten-Component `<DealCard>`
- Goal: Wiederverwendbare Karte mit kompaktem Inhalt.
- Files: `cockpit/src/app/(app)/deals/deal-card.tsx` (NEU)
- Expected behavior: Props `{deal: Deal, onClick: () => void}`. Render: Title (h4), Wert (formatCurrency), Firma, Stage-Badge (Brand-Token-Color je nach Stage), Naechste-Aktion (Title + relatives Datum), Wahrscheinlichkeit-Pill. Mobile-friendly. KEIN Avatar.
- Verification: Vitest RTL — assert alle 6 Felder rendern, assert Klick triggert onClick.
- Dependencies: none

### MT-4: Type-Ahead-Search-Component
- Goal: Search-Input mit Dropdown.
- Files: `cockpit/src/app/(app)/deals/type-ahead-search.tsx` (NEU)
- Expected behavior: `<Input>` debounced 200ms, fetch `/api/deals/typeahead?q=...`, Dropdown unter Input mit Results. Click auf Result navigiert zu `/deals/[id]`. Escape-Key schliesst Dropdown.
- Verification: Vitest RTL mit fetch-Mock — assert debounce, assert Dropdown rendert Results, assert Click-Navigation.
- Dependencies: MT-2

### MT-5: Page-Restruktur (deals-client.tsx)
- Goal: Page mit allen 5 Bloecken (Type-Ahead + Pipeline-Switcher + Top-10 + Karten-Grid + Won/Lost-Sektionen).
- Files: `cockpit/src/app/(app)/deals/page.tsx` MODIFY, `deals-client.tsx` MODIFY
- Expected behavior: Server-Component laedt initial Pipeline + Top-10 + Active-Deals + Won-90d + Lost-90d. Client-Component haelt Pipeline-State (URL oder `useState`), beim Wechsel re-fetcht alle 4 Bloecke. `<details>` fuer Won/Lost. "Mehr anzeigen"-Button mit Pagination (next 90d Batch).
- Verification: TSC + Build clean. Manuelle Browser-Sichtkontrolle nach Deploy.
- Dependencies: MT-1, MT-3, MT-4

### MT-6: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke + Records-Sync.
- Files: `slices/INDEX.md` (SLC-663 done), `planning/backlog.json` (BL-447 → done, FEAT-663 done weil 1 Slice = 1 Feature), `features/INDEX.md` (FEAT-663 done), `docs/STATE.md`
- Expected behavior: User deployt via Coolify. Live-Smoke: Top-10 sichtbar mit echten Daten, Pipeline-Switcher wirkt, Karten-Klick navigiert, Type-Ahead findet, Won/Lost expandiert. Mobile-Smoke. RPT-XXX Completion-Report.
- Verification: alle ACs PASS in Live-Browser.
- Dependencies: MT-1..MT-5

---

## Definition of Done

- 6 MTs verifiziert (AC-1..AC-12 erfuellt)
- Vitest +N Tests gruen
- Build + Lint clean
- Live-Smoke 5 Bloecke + Pipeline-Switcher + Type-Ahead PASS
- Code committed + gepusht auf main + Coolify-Redeploy
- /qa als naechster Schritt
