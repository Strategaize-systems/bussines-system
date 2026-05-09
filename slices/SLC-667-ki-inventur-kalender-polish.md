# SLC-667 — KI-Inventur + Kalender-Polish + Sidebar-Reorder (BL-450 + BL-446, FEAT-666 + FEAT-662)

## Metadata
- **Slice ID:** SLC-667
- **Version:** V6.6
- **Feature:** FEAT-666 (Hygiene-Items) + FEAT-662 (Kalender-Polish + Working-Hours-Setting)
- **Status:** planned
- **Priority:** Medium (Hygiene + Polish, kein Foundation-Block)
- **Created:** 2026-05-09
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-172 (Working-Hours TIME-Cols + localStorage-Toggle) + DEC-173 (Sidebar-Reorder ohne VERWALTUNG-Touch + subtle Sektion-Header) + DEC-175 (AI-Bereitschaft-Rename als zentrale UI-Label-Map)
- **Reihenfolge-Pflicht:** **letzter Slice** — danach Gesamt-/qa V6.6 → /final-check → /go-live → /deploy als REL-028. MIG-032 ist bereits in SLC-665 applied — SLC-667 nutzt nur die `working_hours_*`-Cols.

## Goal

Hygiene-Sammel-Slice mit 5 Aufraeum-Items (alle ohne Schema-Aenderung — MIG-032 ist bereits in SLC-665 applied):

1. **Sparkles-Cards entfernen** auf Firmen + Kontakte (Placeholder seit V3.1)
2. **"KI-Reife" → "AI-Bereitschaft"** Rename via zentrale UI-Label-Map
3. **Pipeline-NL-Suche → Type-Ahead** (gleiche Logik wie SLC-663)
4. **Sidebar-Reorder** auf 4 Sektionen (ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG)
5. **Kalender-Range 06:00-21:00 + Working-Hours-Setting + Toggle** (FEAT-662)

## Scope

**In Scope:**
- **Sparkles-Cards-Removal:**
  - `cockpit/src/app/(app)/firmen/[id]/page.tsx` (oder Sub-Components) MODIFY — `<SparklesCard>` entfernt
  - `cockpit/src/app/(app)/kontakte/[id]/page.tsx` (oder Sub-Components) MODIFY — `<SparklesCard>` entfernt
  - Code-Cleanup: ungenutzte SparklesCard-Imports + ggf. Server-Actions identifizieren + entfernen
- **AI-Bereitschaft-Rename:**
  - `cockpit/src/lib/labels/ki-readiness.ts` (NEU) — zentrale Label-Map
  - Firmen-Detail-Page (Bewertungs-Dropdown) Label-Aufruf MODIFY
  - E-Mail-Template-Variablen-Renderer: pruefen ob "ki-reife" als Tag genutzt → Alias-Lookup zu `ai_readiness` (Reverse-Lookup), KEINE Schema-Aenderung
- **Pipeline-NL-Suche → Type-Ahead:**
  - `cockpit/src/components/pipeline-suche/*` Removal (Component-File + Imports) — `useVoiceCapture`-Hook bleibt (extrahiert in SLC-661)
  - `/pipeline` oder Pipeline-Suche-Block auf Type-Ahead-Pattern aus FEAT-663 (Reuse `<TypeAheadSearch>` aus SLC-663)
  - Pipeline-Kanban-Visualisierung bleibt unangetastet
- **Sidebar-Reorder:**
  - `cockpit/src/components/sidebar.tsx` MODIFY — 4-Sektionen-Layout: ANALYSE [Dashboard] / OPERATIV [Mein Tag, Focus, Kalender] / ARBEITSBEREICHE [Deals, Pipeline, Firmen, Kontakte, Multiplikatoren] / VERWALTUNG [bestehend]
  - Sektion-Header als non-clickable `<div>` mit `text-xs font-medium text-muted-foreground uppercase tracking-wide`
  - VERWALTUNG **unangetastet** (V7-Item)
  - "Meine Performance" bereits in SLC-662 entfernt — verifizieren
- **Kalender-Polish:**
  - `cockpit/src/components/kalender-client.tsx` MODIFY — Hartkodierung `07:00-20:00` zu Konstante `DEFAULT_HOUR_RANGE = { start: 6, end: 21 }`. Working-Hours-Lookup. Toggle-Logik.
  - `cockpit/src/app/(app)/settings/working-hours/page.tsx` (NEU) — Settings-Page mit 2 TimePicker-Inputs
  - `cockpit/src/lib/settings/working-hours-actions.ts` (NEU) — Server-Actions `getWorkingHoursSettings` + `updateWorkingHoursSettings`
  - localStorage-Toggle-Logic: `cockpit:kalender:working-hours-toggle:<userId>`
- Vitest-Tests fuer Kalender-Range + Toggle-Logic + Working-Hours-Save
- Live-Smoke Asserts pro Item

**Out of Scope:**
- Feiertag-Logik (BL-444)
- Multiplikatoren-KI-Workspace (Out of Scope FEAT-666)
- VERWALTUNG-Restruktur (V7)
- Mitarbeiter-Sidebar-Variante (V7)
- Sidebar-Color-Coding (V7+)
- Time-Zone-Handling (V7+)
- Drag-und-Drop-Termin-Verschieben (kein V6.6)
- Kalender-Color-Coding pro Termin-Typ (separates UI-Sprint-Item)

## Acceptance Criteria

**Sparkles-Cards-Removal:**

**AC1:** Firmen-Detail-Page enthaelt kein `<SparklesCard>` mehr im DOM (alle Pfade — Hauptansicht + ggf. modal).

**AC2:** Kontakte-Detail-Page enthaelt kein `<SparklesCard>` mehr im DOM.

**AC3:** Multiplikatoren-Detail-Page bleibt unveraendert (kein `<SparklesCard>` dort, KEIN KI-Workspace-Einbau).

**AI-Bereitschaft-Rename:**

**AC4:** Firmen-Detail-Page Field-Label "KI-Reife" rendert jetzt als "AI-Bereitschaft". DB-Spaltenname (`ai_readiness` oder vorhandener Name) bleibt unveraendert (kein Schema-Bruch).

**AC5:** E-Mail-Template-Variable-Lookup unveraendert: wenn "ki-reife" als Variable-Tag in bestehenden Templates vorkommt, wird sie als Alias zu `ai_readiness` aufgeloest (Reverse-Lookup im Template-Renderer).

**Pipeline-Type-Ahead:**

**AC6:** Pipeline-Suche-Block (oder /pipeline-suche-Page) zeigt Type-Ahead-Pattern (Search-Input + Dropdown mit max 10 Vorschlaegen aus deals.title + companies.name + contacts.full_name). KEINE NL-Frage-Logik mehr auf Pipeline.

**AC7:** Pipeline-Suche-Component (alte NL-Variante) ist nicht mehr im DOM. `useVoiceCapture`-Hook bleibt importierbar (in SLC-661 extrahiert, von KI-Workspace genutzt).

**AC8:** Pipeline-Kanban-Visualisierung bleibt unveraendert.

**Sidebar-Reorder:**

**AC9:** Sidebar zeigt 4 Sektion-Header als Visual-Trenner: ANALYSE / OPERATIV / ARBEITSBEREICHE / VERWALTUNG. Header sind nicht clickable, Style: `text-xs font-medium text-muted-foreground uppercase tracking-wide`.

**AC10:** Sidebar-Reihenfolge unter den Sektionen:
- ANALYSE: Dashboard
- OPERATIV: Mein Tag, Focus, Kalender
- ARBEITSBEREICHE: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
- VERWALTUNG: alle bestehenden Eintraege unveraendert (1:1, kein V7-Vorgriff)

**AC11:** "Meine Performance" ist nicht mehr im DOM (bereits in SLC-662 entfernt — SLC-667 verifiziert).

**AC12:** KEINE Eintrag-Umbenennungen, KEINE Icon-Wechsel.

**AC13:** Mobile (≤768px): Sidebar wird zu Hamburger-Menue, Sektion-Header bleiben sichtbar.

**Kalender-Polish:**

**AC14:** `kalender-client.tsx` rendert default 06:00-21:00 statt 07:00-20:00. Hartkodierung entfernt, Konstante `DEFAULT_HOUR_RANGE = { start: 6, end: 21 }`.

**AC15:** Mein-Tag-Kalender und Cockpit-Kalender beide zeigen 06:00-21:00 (gleiche Component, kein Drift).

**AC16:** Settings-Page `/settings/working-hours` rendert mit 2 TimePicker-Inputs (Start + Ende). Save-Action persistiert in `user_settings.working_hours_start/end` (MIG-032 in SLC-665 applied). CHECK-Constraint blockt invalid Values (start>=end).

**AC17:** Wenn Working-Hours gesetzt, zeigt Kalender defaultmaessig nur den Arbeitstag-Bereich. Termine ausserhalb erscheinen als gestauchter Pre/Post-Bereich (1px-Linien-Trenner + reduzierte Hoehe).

**AC18:** Toggle "Voller Tag / Nur Arbeitstag" sichtbar in Kalender-Header. Persistiert in localStorage `cockpit:kalender:working-hours-toggle:<userId>` mit "full"|"work". Default "full" wenn keine Working-Hours gesetzt.

**AC19:** Wenn User keine Working-Hours gesetzt, ist Toggle disabled mit Hint "Working-Hours in Settings setzen".

**Slice-Level:**

**AC20:** TSC + `npm run test` (Vitest +N Tests fuer Working-Hours-Save + Kalender-Range + Toggle-Logic) + `npm run build` + `npm run lint` alle clean.

**AC21:** Live-Smoke nach Coolify-Redeploy:
- Firmen/Kontakte-Detail: keine SparklesCards
- Firmen-Field zeigt "AI-Bereitschaft"
- Pipeline-Suche zeigt Type-Ahead-Dropdown
- Sidebar zeigt 4 Sektion-Header + neue Reihenfolge
- Settings-Working-Hours-Save speichert in DB
- Kalender zeigt 06:00-21:00 / Working-Hours-Range / Toggle funktional

## Reuse

- `<TypeAheadSearch>`-Component aus SLC-663
- shadcn-Form/Input/TimePicker (oder Custom-TimePicker)
- Bestehende Settings-Page-Pattern (V6.5 SLC-653 Settings-Pages-Auslagern)
- Bestehende Sidebar-Component-Struktur (V3 + V6.4-Items)
- `useVoiceCapture`-Hook aus SLC-661 (bleibt nach Pipeline-Suche-Removal)
- MIG-032 Schema (in SLC-665 bereits applied)
- Style Guide V2 Brand-Tokens (BL-441)

## Risks

- **R6.1 Sidebar-Reorder bricht User-Mental-Model (R5 Architecture):** **Mitigation:** nur Reorder + 1 Eintrag-Removal. KEINE Umbenennungen, KEINE Icon-Wechsel, KEINE neuen Eintraege. VERWALTUNG bleibt 1:1.
- **R6.2 AI-Bereitschaft-Template-Variable-Drift:** wenn "ki-reife" in bestehenden E-Mail-Templates als Variable steht, koennte Rename-Logik diese brechen. **Mitigation:** zentrale Label-Map mit Reverse-Lookup. Pre-Step: grep nach `{{ki-reife}}` oder `{{kiReife}}` in Template-Tabelle.
- **R6.3 Kalender-Working-Hours-Edge-Cases:** ueberhaengende Termine (z.B. 17:30-18:30 bei 09:00-18:00 Working-Hours). **Mitigation:** gestaucht zeigen statt ausblenden (DEC-172).
- **R6.4 Pipeline-Suche-Removal-Drift:** wenn Pipeline-Suche-Component noch von anderen Pages importiert wird. **Mitigation:** Pre-Step `grep "pipeline-suche"` in cockpit/src.
- **R6.5 Sparkles-Cards-Server-Actions:** ungenutzte Server-Actions koennten andere Pages brechen wenn entfernt. **Mitigation:** Pre-Step `grep` der Action-Imports vor Removal.

## Verification Strategy

- **Pre:**
  - `grep "SparklesCard"` in cockpit/src → identify all locations
  - `grep "ki-reife\|KiReife\|kiReife"` → check Template-Variables
  - `grep "pipeline-suche"` → check imports
  - `grep "Meine Performance"` in sidebar.tsx → verify SLC-662 removal
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** Build + Test + Lint + Live-Smoke 5 Items (alle ACs pruefen).

---

## Micro-Tasks

### MT-1: Pre-Step Audits (4 Greps)
- Goal: Audit-Liste erstellen vor Code-Aenderungen.
- Files: keine — Output als MT-Notiz
- Expected behavior: 4 Greps durchfuehren + Pfade dokumentieren. Bei `pipeline-suche`-Imports: Liste fuer MT-4. Bei `SparklesCard`-Imports: Liste fuer MT-2. Bei `ki-reife`-Variablen: Liste fuer MT-3. Sidebar-State-Pruefung.
- Verification: User-Sichtkontrolle der Audit-Liste vor MT-2.
- Dependencies: none (Pre-Step)

### MT-2: Sparkles-Cards-Removal (Firmen + Kontakte)
- Goal: SparklesCard-Komponente und Imports entfernen auf 2 Detail-Pages.
- Files: `cockpit/src/app/(app)/firmen/[id]/*` MODIFY, `cockpit/src/app/(app)/kontakte/[id]/*` MODIFY
- Expected behavior: SparklesCard-JSX-Block entfernt. Imports entfernt. Falls SparklesCard-Component-File ungenutzt nach Removal: Component-File loeschen + ggf. zugehoerige Server-Actions.
- Verification: Build clean (kein dead code). Live-Smoke: Firmen-Detail + Kontakte-Detail zeigen keine SparklesCards.
- Dependencies: MT-1

### MT-3: AI-Bereitschaft-Rename via UI-Label-Map
- Goal: Zentrale Label-Map + Firmen-Detail-Aufruf umbiegen.
- Files: `cockpit/src/lib/labels/ki-readiness.ts` (NEU), Firmen-Detail-Page MODIFY (Label-Aufruf), Template-Renderer MODIFY (Reverse-Lookup wenn `ki-reife` Variable existiert)
- Expected behavior:
  - `ki-readiness.ts` exportiert `KI_READINESS_LABEL = "AI-Bereitschaft"` + `KI_READINESS_OPTIONS = { high: "Hoch", medium: "Mittel", low: "Niedrig" }`.
  - Firmen-Detail-Bewertungs-Dropdown nutzt `KI_READINESS_LABEL` statt Hardcoded-String.
  - Template-Renderer (wenn `ki-reife` als Variable in bestehenden Templates vorkommt): Reverse-Lookup-Map `{ "ki-reife": "ai_readiness" }` ergaenzen, damit alte Templates nicht brechen.
  - DB-Spaltenname unveraendert.
- Verification: TSC + Build clean. Live-Smoke: Firmen-Detail-Field zeigt "AI-Bereitschaft". Template-Test (wenn Template mit `{{ki-reife}}` existiert): Render funktional.
- Dependencies: MT-1

### MT-4: Pipeline-NL-Suche → Type-Ahead
- Goal: Pipeline-NL-Suche entfernen, Type-Ahead-Component aus FEAT-663 reuse.
- Files: Pipeline-Page (`cockpit/src/app/(app)/pipeline/*`) MODIFY, `cockpit/src/components/pipeline-suche/*` REMOVE (mit Vorsicht — `useVoiceCapture`-Hook ist in `cockpit/src/components/ki-workspace/hooks/`, NICHT in pipeline-suche-Folder)
- Expected behavior: Pipeline-Suche-Block ersetzt durch `<TypeAheadSearch>` (aus SLC-663). NL-Frage-Logik weg. Pipeline-Suche-Component-Files geloescht. Pipeline-Kanban bleibt unangetastet.
- Verification: Build clean. Live-Smoke: Pipeline-Page zeigt Type-Ahead, KEINE NL-Frage-Logik.
- Dependencies: MT-1

### MT-5: Sidebar-Reorder + Sektion-Header
- Goal: 4 Sektionen + Reihenfolge.
- Files: `cockpit/src/components/sidebar.tsx` MODIFY
- Expected behavior: 4 non-clickable Sektion-Header (`<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">`) + Eintraege wie spezifiziert. VERWALTUNG-Block 1:1 unveraendert (Pfade nicht touchen). Mobile: Hamburger-Menue mit Sektion-Headers.
- Verification: Build clean. Live-Smoke: Sidebar zeigt 4 Sektion-Header + korrekte Reihenfolge. Mobile-Smoke. VERWALTUNG-Eintraege identisch zu vorher.
- Dependencies: MT-1

### MT-6: Kalender-Range + Default-Hour-Range-Konstante
- Goal: Hartkodierung 07:00-20:00 zu Konstante 06:00-21:00.
- Files: `cockpit/src/components/kalender-client.tsx` MODIFY
- Expected behavior: `const DEFAULT_HOUR_RANGE = { start: 6, end: 21 }`. Verwendung in Render-Logik. Mein-Tag-Kalender + Cockpit-Kalender beide nutzen.
- Verification: Build clean. Vitest fuer Range-Logik (1 Test). Live-Smoke: Kalender zeigt 06:00-21:00 statt 07:00-20:00.
- Dependencies: none

### MT-7: Working-Hours-Settings-Page + Server-Actions
- Goal: Settings-Page + 2 Server-Actions fuer Working-Hours.
- Files: `cockpit/src/app/(app)/settings/working-hours/page.tsx` (NEU), `cockpit/src/lib/settings/working-hours-actions.ts` (NEU), Test
- Expected behavior:
  - `getWorkingHoursSettings({userId})` Server-Action: SELECT working_hours_start, working_hours_end FROM user_settings WHERE user_id=$1.
  - `updateWorkingHoursSettings({userId, start, end})` Server-Action: UPSERT user_settings mit Validation (start<end, beide gesetzt oder beide null). DB-CHECK-Constraint faengt Edge-Cases.
  - Settings-Page mit 2 TimePicker-Inputs + Save-Button + Reset-Button.
- Verification: Vitest mit Mock-DB — 3 Tests: get-empty, update-valid, update-invalid-rejected. Live-Smoke: User setzt 09:00-18:00 → DB-Werte verifiziert.
- Dependencies: MT-6 (Kalender muss bereit sein, da Working-Hours-Logik Kalender steuert)

### MT-8: Working-Hours-Lookup + Toggle-Logic im Kalender
- Goal: Kalender liest Working-Hours, Toggle wechselt Range + persistiert in localStorage.
- Files: `cockpit/src/components/kalender-client.tsx` MODIFY
- Expected behavior:
  - Bei Mount: `getWorkingHoursSettings({userId})` aufrufen → wenn gesetzt: Working-Hours-Range, sonst Default 06:00-21:00.
  - Toggle-Button im Kalender-Header: "Voller Tag / Nur Arbeitstag". Persistiert in `localStorage.setItem('cockpit:kalender:working-hours-toggle:'+userId, 'full'|'work')`. Bei keine Working-Hours: Toggle disabled mit Hint.
  - Termine ausserhalb Working-Hours: gestaucht (1px-Linie + reduzierte Hoehe).
- Verification: Vitest mit Mock-Kalender + Mock-localStorage (4 Tests: no-working-hours-default, with-working-hours-toggle-work, toggle-full, ueberhaengender-Termin-gestaucht). Live-Smoke: User setzt 09:00-18:00, oeffnet Mein Tag, sieht 09:00-18:00 als Hauptbereich, Toggle "Voller Tag" zeigt 06:00-21:00.
- Dependencies: MT-7

### MT-9: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke + Records-Sync. Letzte Slice — Gesamt-/qa V6.6 als naechster Schritt.
- Files: `slices/INDEX.md` (SLC-667 done), `planning/backlog.json` (BL-446 + BL-450 → done; FEAT-662 + FEAT-666 → done), `features/INDEX.md` (FEAT-662 + FEAT-666 → done; FEAT-661 + FEAT-664 erst nach Gesamt-/qa), `docs/STATE.md` (Current Focus: V6.6 alle 7 Slices done, naechster Schritt Gesamt-/qa)
- Expected behavior: User deployt via Coolify. Live-Smoke 5 Items (siehe AC21). RPT-XXX Completion-Report.
- Verification: alle ACs PASS in Live-Browser.
- Dependencies: MT-1..MT-8

---

## Definition of Done

- 9 MTs verifiziert (AC-1..AC-21 erfuellt)
- Vitest +N Tests gruen (Working-Hours-Save + Kalender-Range + Toggle-Logic)
- Build + Lint clean
- Live-Smoke 5 Hygiene-Items + Kalender-Polish PASS
- Code committed + gepusht auf main + Coolify-Redeploy
- **Naechster Schritt: Gesamt-/qa V6.6** (alle 7 Slices) → /final-check → /go-live → /deploy als REL-028
