# SLC-811 — Settings-Layout-Refactor + /performance-Cleanup + Goals-Move + Label-Konsistenz (FEAT-801 + FEAT-803)

## Metadata
- **Slice ID:** SLC-811
- **Version:** V8
- **Features:** FEAT-801 Settings-Layout-Refactor, FEAT-803 /performance-Cleanup + Task/Aufgabe-Label-Konsistenz
- **Backlog:** BL-481 + BL-453 + BL-459
- **Status:** planned
- **Priority:** High (UI-Hygiene unblockt mehrere kleine Frustquellen, Rollen-Verwaltung sichtbar machen ist User-Wunsch)
- **Created:** 2026-05-20
- **Estimated Effort:** ~3-4h Code + ~30 Min /qa + Live-Smoke = ~4-5h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (UI-Refactor mit Datei-Move + Sidebar-Touch + ~8-10 Datei-Touches, Rollback-Bedarf moeglich)
- **Pattern-Reuse:** Settings-Section-Header-Pattern aus generischem shadcn/ui-Layout (kein bestehender Section-Header im Repo). Drilldown-Button bereits in `team-members-table.tsx` vorhanden, nur Activation. Goals-Page-Move ist plain Datei-Verschiebung mit Import-Path-Anpassung.
- **Reihenfolge-Empfehlung:** SLC-811 ZWEITER in V8 nach SLC-812 (DEC-226). Settings-Refactor sollte SLC-812-Strings bereits anwenden — wenn 812 zuerst durch, ist 811-Touch konsistent.

## Why

V8 /discovery + /requirements zeigten: `/settings`-Landing ist eine flache 10-Tile-Liste ohne Gruppierung. Mit 3-Rollen-Permission-Matrix (DEC-196) und ~14 Subpage-Verzeichnissen ist die Auffindbarkeit schlecht — speziell die Rollen-Verwaltung existiert in `team-members-table.tsx` als Inline-Select, ist aber visuell versteckt. Zusatz: /performance-Redirect-Bruecke aus V6.6 ist nach 5 Sprints obsolet. Goals-Page lebt seit V6.6 unter `/performance/goals/` und ist eigentlich Konfiguration → gehoert in Settings.

Architektur-Entscheidungen aus V8 /architecture (RPT-478):
- **DEC-219** Settings 3 Sections (Persoenlich / Vertrieb / System)
- **DEC-223** Products + NL-History sind funktional (kein Ghost) → beide als Tiles ergaenzen
- **DEC-224** `/performance/goals/` → `/settings/goals/` Move + Tile in System-Section

Code-Inspektion-Befunde aus V8 /architecture:
- `/settings/products/page.tsx` ist voll funktionale Admin-Produkt-Verwaltung — Tile in System-Section
- `/settings/workflow-automation/nl-history/page.tsx` ist V7.6-Inspection-Log — Tile in Vertrieb-Section
- `/team/[user_id]/*` ist voll funktional aus V7 (layout + 3 sub-pages + tests) — Drilldown-Button aktivierbar
- `team-members-table.tsx:198` hat `disabled` + `title="Drilldown kommt mit SLC-706"` — beides entfernen
- `sidebar-config.ts:266` referenziert `/performance/goals` mit Label "Ziele" → Pfad-Update
- `deal-action-bar.tsx:163` zeigt `label="Task"` → Aenderung zu "Aufgabe"

## Scope

**In Scope:**

### FEAT-801 Anteil (Settings-Refactor)

- **Settings-Section-Struktur** ([cockpit/src/app/(app)/settings/page.tsx](cockpit/src/app/(app)/settings/page.tsx)):
  - `SETTINGS_TILES`-Array → `SETTINGS_SECTIONS`-Struktur mit 3 Eintraegen (Persoenlich / Vertrieb / System)
  - Bestehende 10 Tiles auf die 3 Sections verteilen (Mapping siehe ARCHITECTURE.md V8-Section)
  - Rendering rendert pro Section: Section-Header (h2 + Beschreibung) + Tile-Liste
  - Section ausblenden wenn 0 sichtbare Tiles fuer aktuelle Rolle
- **4 neue Tiles** ergaenzen:
  1. `Produkte` → `/settings/products` — System-Section, `visibleFor: ADMIN_ONLY`, Icon `Package`
  2. `NL-Regel-Historie` → `/settings/workflow-automation/nl-history` — Vertrieb-Section, `visibleFor: ADMIN_ONLY`, Icon `History` oder `ScrollText`
  3. `Rollen-Verwaltung` → `/settings/team` — System-Section, `visibleFor: ADMIN_ONLY`, Icon `Users` oder `Shield`
  4. `Ziele` → `/settings/goals` (NACH Move aus MT-3) — System-Section, `visibleFor: ADMIN_TEAMLEAD`, Icon `Target`
- **Drilldown-Button aktivieren** ([cockpit/src/app/(app)/settings/team/team-members-table.tsx](cockpit/src/app/(app)/settings/team/team-members-table.tsx) Zeile 198):
  - `disabled`-Attribut entfernen
  - `title="Drilldown kommt mit SLC-706"` wegnehmen
  - `onClick`-Handler auf `router.push('/team/${user.id}')` setzen
  - Tooltip-Text auf etwas Sinnvolles ("Drilldown zu User-Cockpit") oder weglassen

### FEAT-803 Anteil (/performance-Cleanup + Goals-Move + Label-Konsistenz)

- **Performance-Page loeschen** ([cockpit/src/app/(app)/performance/page.tsx](cockpit/src/app/(app)/performance/page.tsx)):
  - Datei loeschen (35 Zeilen Redirect-Bruecke aus V6.6 DEC-169)
- **Goals-Page verschieben**:
  - `cockpit/src/app/(app)/performance/goals/page.tsx` → `cockpit/src/app/(app)/settings/goals/page.tsx`
  - Goals-Components (`@/components/goals/*`) bleiben unveraendert wo sie sind
  - Actions (`@/app/actions/goals` + `products` + `activity-kpis`) bleiben unveraendert
  - `performance/goals/` Folder loeschen nach Move
  - `performance/` Folder ganz loeschen (leer nach Move + page.tsx-Delete)
- **Sidebar-Link-Update** ([cockpit/src/lib/navigation/sidebar-config.ts:266](cockpit/src/lib/navigation/sidebar-config.ts)):
  - `href: "/performance/goals"` → `href: "/settings/goals"`
  - Label "Ziele" bleibt
  - **Decision**: Sidebar-Eintrag bleibt im VERWALTUNG_SETUP-Bereich (Ziele sind Top-Level-haeufiger als andere Settings-Items, daher Sidebar-Shortcut OK)
- **Link-Audit + Bereinigung** (`grep -rn '/performance' src/`):
  - Alle Inline-Links / `href`-Werte auf `/performance` oder `/performance/goals` finden
  - Auf `/settings/goals` umstellen oder entfernen (je nach Kontext)
- **Quick-Action-Button-Label**:
  - [cockpit/src/components/deals/deal-action-bar.tsx:163](cockpit/src/components/deals/deal-action-bar.tsx) — `label="Task"` → `label="Aufgabe"`
  - Mein-Tag + Cockpit verwenden bereits "Aufgabe" (cockpit-action-bar.tsx:100), keine Aenderung dort
  - Pruefen ob weitere User-sichtbare "Task"-Strings in Deal-Detail-Pages existieren

**Out of Scope:**

- Goals-Components-Refactor (`@/components/goals/*`) — nur Datei-Verschiebung von page.tsx, kein Component-Touch
- Sidebar-Reorganisation breit — nur Pfad-Update fuer Ziele
- Schema-Rename `activities`-Tabelle — nur UI-Label-Change
- 4. Rolle (Read-Only / Auditor) — out-of-V8
- Tile-Icons / Brand-Refresh — siehe BL-441 separater Theming-Sprint
- Toast-Pattern aendern — V6.6-Pattern bleibt fuer andere Migrations-Bruecken nutzbar

## Acceptance Criteria

- **AC1**: `/settings` rendert 3 visuell getrennte Sections mit Section-Headers (Persoenlich / Vertrieb / System)
- **AC2**: 14 Tiles gesamt sichtbar fuer Admin (10 bestehende + 4 neue), korrekt auf die 3 Sections verteilt
- **AC3**: Rollen-Verwaltung erscheint als eigenes Tile in System-Section, Klick fuehrt zu `/settings/team`
- **AC4**: Produkte-Tile fuehrt zu `/settings/products` (Admin-only)
- **AC5**: NL-Regel-Historie-Tile fuehrt zu `/settings/workflow-automation/nl-history` (Admin-only)
- **AC6**: Ziele-Tile fuehrt zu `/settings/goals` (ADMIN_TEAMLEAD), Page rendert GoalList + GoalForm + CsvImport + ActivityKpiSettings unveraendert
- **AC7**: `/performance` URL gibt 404 zurueck (oder Next-15-Default-Route-Handler) — Folder geloescht
- **AC8**: `/performance/goals` URL gibt 404 zurueck — Folder geloescht
- **AC9**: Sidebar-Eintrag "Ziele" fuehrt zu `/settings/goals` (nicht mehr `/performance/goals`)
- **AC10**: Drilldown-Button in team-members-table ist enabled, Klick fuehrt zu `/team/[user_id]`, Read-Only-Mode greift (V7.1 Pattern)
- **AC11**: Quick-Action-Button auf Deal-Detail zeigt "Aufgabe" (nicht "Task")
- **AC12**: Member-Rolle sieht nur Persoenlich-Section (keine Vertrieb/System-Tiles), Teamlead sieht Persoenlich + Vertrieb-Subset, Admin sieht alle 3 Sections
- **AC13**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` PASS
- **AC14**: Live-Smoke mit qa-admin: alle 14 Tiles sichtbar in 3 Sections. qa-teamlead: korrekte Subset-Sicht. qa-member: nur Persoenlich

## Micro-Tasks

### MT-1: Settings-Section-Struktur + 3 neue System-/Vertrieb-Tiles (ohne Goals)
- **Goal**: `SETTINGS_TILES` Flat-Array zu `SETTINGS_SECTIONS` umstrukturieren, Section-Headers im Rendering, Produkte + NL-Regel-Historie + Rollen-Verwaltung als 3 neue Tiles ergaenzen
- **Files**:
  - `cockpit/src/app/(app)/settings/page.tsx`
- **Expected behavior**: 13 Tiles auf 3 Sections verteilt (10 bestehende + Produkte + NL-Regel-Historie + Rollen-Verwaltung — Ziele kommt erst in MT-3 dazu). Section-Header rendern als h2 mit Description. Section ausblenden wenn 0 Tiles sichtbar.
- **Verification**: Visuelle Live-Smoke `/settings` als Admin/Teamlead/Member, alle 3 Sections + korrekte Tiles. `npm run build` clean.
- **Dependencies**: keine

### MT-2: Drilldown-Button in team-members-table aktivieren
- **Goal**: Disabled-Attribut + stale Title entfernen, onClick auf `/team/[user_id]` setzen
- **Files**:
  - `cockpit/src/app/(app)/settings/team/team-members-table.tsx`
- **Expected behavior**: Button ist klickbar. Klick fuehrt mit `router.push()` zu `/team/${user.id}`. Page rendert vollstaendig im Read-Only-Mode (V7.1 Pattern bereits live).
- **Verification**: Live-Smoke /settings/team → Klick auf Drilldown-Button bei einem User → /team/[user_id]-Page rendert. Bestehende Vitest-Tests fuer team-members-table.tsx gruen.
- **Dependencies**: keine

### MT-3: Goals-Page Move /performance/goals/ → /settings/goals/
- **Goal**: Datei-Verschiebung mit kompletten Folder-Delete der Source
- **Files**:
  - DELETE `cockpit/src/app/(app)/performance/page.tsx`
  - MOVE `cockpit/src/app/(app)/performance/goals/page.tsx` → `cockpit/src/app/(app)/settings/goals/page.tsx`
  - DELETE Folder `cockpit/src/app/(app)/performance/` komplett (leer nach Move)
- **Expected behavior**: `/performance` URL 404. `/performance/goals` URL 404. `/settings/goals` rendert die Goals-Page wie bisher (Imports `@/components/goals/*` und `@/app/actions/*` bleiben unveraendert da absolute Paths).
- **Verification**: `npm run dev`-Smoke: GET `/settings/goals` rendert GoalList + GoalForm + CsvImport + ActivityKpiSettings. GET `/performance/goals` ist 404.
- **Dependencies**: keine

### MT-4: Ziele-Tile in Settings-System-Section ergaenzen
- **Goal**: Vierter neuer Tile in System-Section nach erfolgreichem Move
- **Files**:
  - `cockpit/src/app/(app)/settings/page.tsx` (Tile-Eintrag Ziele in System-Section ergaenzen)
- **Expected behavior**: System-Section zeigt nun 5 Tiles fuer Admin: Branding, Zahlungsbedingungen, Einwilligungstexte, Produkte, Rollen-Verwaltung, Ziele. Teamlead sieht in System-Section nur Ziele.
- **Verification**: Live-Smoke /settings als Admin + Teamlead. Klick auf Ziele-Tile fuehrt zu /settings/goals.
- **Dependencies**: MT-1, MT-3

### MT-5: Sidebar-Link-Update + Link-Audit
- **Goal**: Sidebar-Eintrag Ziele auf `/settings/goals` umstellen + grep-Audit fuer alle anderen `/performance`- bzw `/performance/goals`-References
- **Files**:
  - `cockpit/src/lib/navigation/sidebar-config.ts` (Zeile 266: href)
  - Eventuell weitere Files aus `grep -rn '/performance' cockpit/src/ --include='*.tsx' --include='*.ts'`-Audit
- **Expected behavior**: Sidebar zeigt "Ziele" → `/settings/goals`. Keine inneren Links auf `/performance/*` mehr (ausser Audit-Doku falls vorhanden — die bleibt unveraendert).
- **Verification**: Sidebar-Klick auf Ziele fuehrt zu /settings/goals. `grep -rn 'href.*"/performance' cockpit/src/ --include='*.tsx'`: 0 Treffer (ausser Tests + Audit-Doku).
- **Dependencies**: MT-3

### MT-6: Quick-Action-Button-Label "Task" → "Aufgabe" auf Deal-Detail
- **Goal**: 1-Zeilen-Fix in deal-action-bar.tsx
- **Files**:
  - `cockpit/src/components/deals/deal-action-bar.tsx:163`
- **Expected behavior**: Quick-Action-Button auf Deal-Detail rendert "Aufgabe" statt "Task". Mein-Tag (`cockpit-action-bar.tsx`) bleibt unveraendert (zeigt bereits "Aufgabe").
- **Verification**: Live-Smoke /deals/[id] → Action-Bar zeigt "Aufgabe". `grep -rn 'label="Task"' cockpit/src/ --include='*.tsx'`: 0 Treffer.
- **Dependencies**: keine

### MT-7: Build + Lint + Test + Records-Sync
- **Goal**: Vollstaendige Validation + slices/INDEX.md-Status + Backlog-Items als done markieren
- **Files**:
  - keine Code-Aenderungen
  - `slices/INDEX.md` (SLC-811 status `done`)
  - `features/INDEX.md` (FEAT-801 + FEAT-803 status `done`)
  - `planning/backlog.json` (BL-481 + BL-453 + BL-459 status `done`)
- **Expected behavior**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` PASS. Records reflektieren V8-SLC-811-Stand.
- **Verification**: Lokaler Build + Test gruen. Cockpit-Visibility-Check.
- **Dependencies**: MT-1, MT-2, MT-3, MT-4, MT-5, MT-6

### MT-8: /qa Live-Smoke gegen Worktree-Build
- **Goal**: Cross-Role Live-Smoke aller 14 Acceptance Criteria
- **Files**: `reports/RPT-XXX.md`
- **Expected behavior**: /qa-Skill verifiziert AC1-AC14 (visual + functional). PASS-Report.
- **Verification**: /qa liefert PASS, RPT angelegt
- **Dependencies**: MT-7

## Open Points

- Endgueltige Tile-Reihenfolge innerhalb der Sections in Implementation-Phase (Reihenfolge wirkt sich auf Tab-Order aus, aber keine Architektur-Frage)
- Section-Header-Style: `<h2>` mit `text-xs uppercase tracking-wider text-slate-500` (subtle) oder `<h2>` mit `text-base font-semibold` (prominent) — Style-Frage in Implementation
- Member-Default-View: wenn Member-Rolle nur 3 Persoenlich-Tiles sieht, ist die Section-Struktur visuell ueberdimensioniert. Mitigation: bei nur 1 sichtbarer Section ggf. Section-Header ausblenden? Defer Implementation-Phase
- /performance Folder enthaelt eventuell mehr als nur page.tsx + goals/ — Slice-Phase 1 muss das verifizieren

## Related

- BL-481 (Backlog-Item, 2026-05-19)
- BL-453 (/performance weg, low prio, 2026-05-09)
- BL-459 (Task/Aufgabe-Label-Konsistenz, low prio, 2026-05-11)
- DEC-196 (Permission-Matrix Admin/Teamlead/Member)
- DEC-169 (V6.6 /performance-Redirect-Bruecke, jetzt obsolet)
- DEC-219 (V8 Settings 3 Sections)
- DEC-223 (V8 PRD-Konflikt: products + nl-history als Tiles)
- DEC-224 (V8 Goals-Move nach /settings/goals/)
- FEAT-801 ([features/FEAT-801-settings-rollen-refactor.md](features/FEAT-801-settings-rollen-refactor.md))
- FEAT-803 ([features/FEAT-803-performance-cleanup-label-konsistenz.md](features/FEAT-803-performance-cleanup-label-konsistenz.md))
