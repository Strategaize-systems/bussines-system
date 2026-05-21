# SLC-822 — Sidebar-Konsolidierung Option A: VERWALTUNG_SETUP → WERKZEUGE (FEAT-811 / BL-483)

## Metadata
- **Slice ID:** SLC-822
- **Version:** V8.1
- **Feature:** FEAT-811 Sub-Slice 2
- **Backlog:** BL-483
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-20
- **Estimated Effort:** ~1-1.5h Code + ~15-20 Min /qa + Live-Smoke = ~1.5-2h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (mittlere Aenderung, 1-2 Datei-Touches, Type-Refactor mit Pruefung der Sidebar-Component)
- **Pattern-Reuse:** Sidebar-Section-Pattern aus V7 DEC-190 etabliert ([sidebar-config.ts](cockpit/src/lib/navigation/sidebar-config.ts)). `SectionParent`-Pattern aus SLC-707 MT-6 (V7).
- **Reihenfolge-Empfehlung:** SLC-822 ZWEITER in V8.1 nach SLC-821. Sidebar wird "schlanker" — gute V8.1-Sichtbarkeit.

## Why

Aktuell zeigt Sidebar 14 `VERWALTUNG_SETUP`-Eintraege (Pipelines, Kampagnen, Templates, Workflow-Automation, NL-Sculptor-Audit, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Ziele, Cadences/Automatisierung, Audit-Log/Handoffs/Referrals). Doppelung zur V8-`/settings`-Tile-Page (FEAT-801). User-Direktive 2026-05-20: "Sidebar Option A komplett zusammenklappen".

DEC-228: `VERWALTUNG_SETUP` umbenennen zu `WERKZEUGE`, 11 Config-Items entfernen, 3 Tools (`/handoffs`, `/referrals`, `/audit-log`) bleiben in `WERKZEUGE`. Bestehender `/settings`-Eintrag in `VERWALTUNG_MEIN` bleibt unveraendert.

## Scope

**In Scope:**

### Type-Refactor sidebar-config.ts
- `SidebarSection`-Type Z.44-50: `VERWALTUNG_SETUP` → `WERKZEUGE`
- `SECTION_LABEL`-Konstante Z.52-62: `VERWALTUNG_SETUP: "Setup"` → `WERKZEUGE: "WERKZEUGE"` (oder finalisierter Label, siehe Open Point)
- `SECTION_PARENT`-Konstante Z.69-72: `VERWALTUNG_SETUP: "VERWALTUNG"` Eintrag entfernen — `WERKZEUGE` wird eigene Top-Section (kein Parent)
- `SECTION_ORDER`-Konstante Z.74-81: `"VERWALTUNG_SETUP"` → `"WERKZEUGE"`

### Item-Reduktion in SIDEBAR_CONFIG-Array
**ENTFERNEN (11 Items):**
- `/handoffs` ← VERSCHIEBEN nach WERKZEUGE (siehe unten)
- `/referrals` ← VERSCHIEBEN nach WERKZEUGE (siehe unten)
- `/settings/goals` (Ziele)
- `/cadences` (Automatisierung)
- `/settings/branding`
- `/settings/payment-terms`
- `/settings/pipelines`
- `/settings/products`
- `/settings/compliance`
- `/settings/automation`
- `/settings/workflow-automation/nl-history`
- `/settings/templates`
- `/settings/campaigns`
- `/audit-log` ← VERSCHIEBEN nach WERKZEUGE (siehe unten)

**SECTION-WECHSEL (3 Items, behalten):**
- `/handoffs` → section `WERKZEUGE`
- `/referrals` → section `WERKZEUGE`
- `/audit-log` → section `WERKZEUGE`

### Sidebar-Component-Verifikation
- Pruefen ob [Sidebar-Component](cockpit/src/components/layout/sidebar.tsx) oder aequivalent die `SECTION_PARENT`-Logik korrekt rendert wenn `WERKZEUGE` keinen Parent hat (wird als eigene Top-Section ohne "VERWALTUNG"-Header gerendert)
- Bei Bedarf Anpassung der Render-Logik (sollte aber bereits korrekt sein, da `SECTION_PARENT` als `Partial<Record>` typisiert ist)

**Out of Scope:**
- Neuer "Einstellungen"-Eintrag — bestehender in VERWALTUNG_MEIN bleibt
- URL-Aenderungen — Direkt-Links auf `/settings/templates` etc. bleiben
- Tile-Page-Refactor — bleibt unveraendert (V8 FEAT-801)
- Mobile-Hamburger-Anpassung — bleibt
- Theming/Icon-Refactor

## Acceptance Criteria

- **AC1** — `SidebarSection`-Type enthaelt `WERKZEUGE` statt `VERWALTUNG_SETUP`
- **AC2** — `SECTION_PARENT.WERKZEUGE` ist undefined (eigene Top-Section, kein Parent)
- **AC3** — `SECTION_ORDER` ist neu: `ANALYSE → TEAM → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE`
- **AC4** — Sidebar-Array enthaelt KEINEN der 11 entfernten Eintraege (Pipelines, Kampagnen, Templates, Workflow-Automation, NL-Sculptor-Audit, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Ziele, Cadences)
- **AC5** — Sidebar-Array enthaelt `/handoffs`, `/referrals`, `/audit-log` mit `section: "WERKZEUGE"`
- **AC6** — Bestehender `/settings`-Eintrag in `VERWALTUNG_MEIN` (Z.219-225) unveraendert
- **AC7** — Live-Smoke: User sieht WERKZEUGE-Section als eigene Top-Section unter VERWALTUNG_MEIN
- **AC8** — Direkt-URL-Test: `/settings/templates`, `/settings/pipelines`, `/settings/campaigns` etc. sind weiterhin erreichbar und rendern korrekt (URL-Stabilitaet)
- **AC9** — Mobile (<768px): Sidebar funktioniert weiterhin
- **AC10** — `npm run build`, `npm run lint`, `npm run test` clean
- **AC11** — Vitest-Updates fuer evtl. existierende sidebar-config-Tests (Section-Konstante)

## Micro-Tasks

### MT-1: Type-Refactor + Section-Konstanten
- **Goal:** SidebarSection-Type + SECTION_LABEL + SECTION_PARENT + SECTION_ORDER umbenennen
- **Files:** `cockpit/src/lib/navigation/sidebar-config.ts` (modify)
- **Expected behavior:**
  - `SidebarSection`-Union: `"VERWALTUNG_SETUP"` → `"WERKZEUGE"`
  - `SECTION_LABEL`: `VERWALTUNG_SETUP: "Setup"` ENTFERNEN, `WERKZEUGE: "WERKZEUGE"` HINZUFUEGEN (oder finaler Label nach Open Point)
  - `SECTION_PARENT`: `VERWALTUNG_SETUP` Key ENTFERNEN (WERKZEUGE bekommt KEINEN Parent)
  - `SECTION_ORDER`: `"VERWALTUNG_SETUP"` → `"WERKZEUGE"`
- **Verification:** TypeScript-Compile (alle Type-Referenzen muessen weiter passen)
- **Dependencies:** keine

### MT-2: SIDEBAR_CONFIG-Array reduzieren + Section-Wechsel
- **Goal:** 11 Config-Items entfernen, 3 Tools-Items von `VERWALTUNG_SETUP` auf `WERKZEUGE` umstellen
- **Files:** `cockpit/src/lib/navigation/sidebar-config.ts` (modify)
- **Expected behavior:**
  - 11 Eintraege loeschen (siehe Item-Liste oben)
  - 3 verbleibende Eintraege (`/handoffs`, `/referrals`, `/audit-log`) `section: "VERWALTUNG_SETUP"` → `section: "WERKZEUGE"`
  - Reihenfolge der 3 WERKZEUGE-Items: alphabetisch (Audit-Log, Handoffs, Referrals) ODER beibehalten — entscheiden bei MT-Start
- **Verification:** TypeScript-Compile clean + visueller Browser-Check
- **Dependencies:** MT-1

### MT-3: Sidebar-Component-Render verifizieren
- **Goal:** Pruefen ob Sidebar-Component die neue `WERKZEUGE`-Section korrekt rendert (eigene Top-Section ohne Parent)
- **Files:** `cockpit/src/components/layout/sidebar.tsx` (read, ggf. modify)
- **Expected behavior:**
  - Sidebar-Component liest `SECTION_ORDER`, iteriert in dieser Reihenfolge, gruppiert Sections mit gleichem `SECTION_PARENT` zusammen unter einem Top-Header
  - WERKZEUGE hat keinen Parent → rendert als eigener Top-Header "WERKZEUGE"
  - VERWALTUNG_MEIN hat Parent "VERWALTUNG" → rendert weiterhin als Sub-Section unter "VERWALTUNG"-Header
  - Falls Render-Logik nicht-trivial: minimaler Patch, sonst keine Aenderung
- **Verification:** Live-Smoke (visuelle Sidebar-Pruefung im Browser)
- **Dependencies:** MT-2

### MT-4: Existierende sidebar-config-Tests aktualisieren
- **Goal:** Falls Vitest-Tests fuer `sidebar-config.ts` existieren, Updates fuer Section-Name + Item-Count
- **Files:** `cockpit/src/lib/navigation/sidebar-config.test.ts` (modify, falls existiert)
- **Expected behavior:**
  - Tests die `VERWALTUNG_SETUP`-Section ueberpruefen: rename zu `WERKZEUGE`
  - Tests die Sidebar-Item-Count ueberpruefen: count anpassen
- **Verification:** `npm run test -- sidebar-config.test.ts` PASS
- **Dependencies:** MT-2

### MT-5: Build/Lint/Test
- **Goal:** Gesamt-Validierung
- **Expected behavior:** `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` alle PASS
- **Verification:** 3 Commands clean
- **Dependencies:** MT-4

## Open Points

- **Section-Label-Schreibweise:** "WERKZEUGE" (deutsch, Caps, konsistent mit anderen Sections) vs "TOOLS" (englisch, kuerzer) vs "HILFSMITTEL" (deutsch ausformuliert). **Entscheidung in MT-1**, Default: "WERKZEUGE".
- **Reihenfolge der 3 WERKZEUGE-Items**: alphabetisch (Audit-Log → Handoffs → Referrals) oder semantisch (Handoffs → Referrals → Audit-Log = operative Flow-Reihenfolge). **Entscheidung in MT-2**, Default: semantisch.
- **Sidebar-Component-Test-Coverage**: aktuell unklar, ob Tests existieren. Wenn nein, in MT-4 entscheiden ob neue Tests sinnvoll sind.

## Risks

- **Risk:** Wenn ein anderer Code-Bereich `VERWALTUNG_SETUP`-Section-String hartkodiert referenziert (z.B. UI-Tests, Storybook), bricht das. Mitigation: vor MT-1 Grep nach `VERWALTUNG_SETUP` im gesamten Repo.
- **Risk:** Sidebar-Component-Render-Logik unterstuetzt `WERKZEUGE` ohne Parent nicht korrekt. Mitigation: MT-3 verifiziert das aktiv, ggf. minimaler Patch.
- **Risk:** Vergessene Item-Loeschung → Doppelung Sidebar+Tile bleibt. Mitigation: AC4-Pruefung in Live-Smoke (browser-side Visual-Diff).

## Dependencies

- Keine Vorbedingung aus SLC-821 (kann parallel sein, aber sequentiell empfohlen)
- Nutzt V7-Sidebar-Filter-Pattern (DEC-190)
- Vorausgesetzt: V8 `/settings`-Tile-Page (FEAT-801) ist deployed und enthaelt alle 12 entfernten Items als Tiles

## Reihenfolge-Empfehlung in V8.1

SLC-822 als ZWEITER Slice nach SLC-821. Wenn SLC-821 zuerst durch → Sidebar ist bereits cleaner (TEAM-Items optional), SLC-822 baut darauf auf.

## Reports

- Quelle: V8.1 Architecture RPT-491
- Reports erwartet: 1x /frontend RPT-49X + 1x /qa RPT-49X
