# FEAT-811 — Solopreneur-Mode + Sidebar-Konsolidierung + Rollen-Permission-Konsistenz (V8.1)

## Status

planned (V8.1)

## Created

2026-05-20

## Why

Drei zusammenhaengende UI-/Sidebar-/Settings-Schulden, die nach V8-Release als Hygiene-Items uebrig blieben und vom User in der V8.1-Discovery 2026-05-20 priorisiert wurden:

1. **Solopreneur-Mode (BL-482)** — In V7 wurde "Team-Cockpit" und "Team-Verwaltung" als Admin/Teamlead-Funktion eingefuehrt. Solange der eingeloggte Admin der einzige User im Tenant ist (`team_size = 1`), zeigen diese Sidebar-Eintraege Aggregate ueber genau einen User — visuell wertlos und User-Story-fremd fuer Solopreneure. Erstes Onboarding-Erlebnis fuer einen neuen Solo-User: zwei Sidebar-Items, die nichts Sinnvolles zeigen.

2. **Sidebar/Settings-Doppelung (BL-483)** — V8 (FEAT-801) hat `/settings` zu einer gegliederten 3-Section-Tile-Page (Persoenlich / Vertrieb / System) gemacht. **Aber die Sidebar zeigt parallel weiterhin 12 Einzel-Eintraege** unter `VERWALTUNG_SETUP` — Pipelines, Kampagnen, Templates, Workflow-Automation, NL-Sculptor-Audit, Branding, Zahlungsbedingungen, Produkte, Einwilligungstexte, Ziele, Cadences/Automatisierung, Audit-Log. Beide Surfaces (Sidebar + Tile-Page) zeigen dasselbe — keine Single-Source-of-Truth, kognitive Last hoch, Sidebar lang.

3. **Teamlead-Tile-Inkonsistenz (BL-484)** — `/settings/team` ist als Sidebar-Eintrag fuer **Admin + Teamlead** sichtbar (sidebar-config.ts:121-125). Aber das `/settings`-Tile "Rollen-Verwaltung" ist `ADMIN_ONLY` (settings/page.tsx ~Z.187). Same URL, verschiedene Sichtbarkeit. Teamlead navigiert ueber die Sidebar dort hin und sieht die Seite read-only — ueber die Tile-Page faende er sie aber gar nicht.

User-Direktive Discovery 2026-05-20 (alle 4 Recommendations bestaetigt):
- **Solo-Mode:** reine Auto-Detection ohne Override-Toggle
- **Sidebar:** komplett zusammenklappen → nur `Einstellungen` in Sidebar
- **Team-Tile:** sichtbar fuer Admin+Teamlead, klickbar fuer Admin (read-only fuer Teamlead)
- **Scope-Buendelung:** ein FEAT-811 mit 3 Sub-Slices SLC-821/822/823

## Scope

### In Scope

#### Sub-Slice 1 — SLC-821: Solopreneur-Mode (BL-482)

- Server-side Helper `getTeamSize(team_id)` (oder Reuse einer existierenden Aggregat-Funktion) — Count aller aktiven Profiles in derselben `team_id` wie der eingeloggte User
- In `sidebar-config.ts` oder einer Filter-Schicht: Wenn `team_size === 1` → Sidebar-Eintraege `/team` (Team-Cockpit) und `/settings/team` (Team-Verwaltung) ausblenden
- Beim ersten Invite (`profiles`-Insert mit gleicher `team_id`) → Items werden bei naechstem Sidebar-Render automatisch sichtbar (kein Restart, kein Cache-Bust noetig)
- **Kein Override-Setting** — User-Direktive: reine Auto-Detection ohne Toggle
- **Bezugspunkt fuer team_size**: Annahme aus aktuellem Code-Stand `profiles.team_id`. Falls die Foundation in V7 anders gewachsen ist (z.B. `profiles.tenant_id`), klaert /architecture die exakte Abfrage

#### Sub-Slice 2 — SLC-822: Sidebar-Konsolidierung Option A (BL-483)

- Alle 12 `VERWALTUNG_SETUP`-Sidebar-Eintraege aus der `SIDEBAR_CONFIG`-Array entfernen
- Einen einzigen neuen Eintrag `/settings` → "Einstellungen" hinzufuegen, sichtbar fuer ALL_ROLES (Permission innerhalb der Settings-Page wirkt weiter, jeder sieht seine erlaubten Tiles)
- **Sonderfall Tools-vs-Settings**: `/handoffs`, `/referrals`, `/audit-log` sind aktuell in `VERWALTUNG_SETUP`, sind aber funktional eher "operative Tools" als "Config". /architecture klaert, ob sie in eine neue `WERKZEUGE`-Section gehen, in `VERWALTUNG_MEIN` einziehen, oder als eigene Mini-Section bleiben. **Default-Annahme fuer V8.1:** sie wandern in eine kleine `WERKZEUGE`-Section, damit der Sidebar-Footer nicht leer ist
- `VERWALTUNG_SETUP` als Sidebar-Section-Konstante kann komplett geloescht werden, falls keine Eintraege uebrig bleiben (die 12 Items entfallen alle aus Sidebar)
- Settings-Tile-Page bleibt unveraendert (in V8 fertig refactored) — Settings-Tile ist die einzige Surface fuer Config
- Vorhandene Direkt-Links auf z.B. `/settings/pipelines` aus anderen Komponenten bleiben funktional (URLs aendern sich nicht)

#### Sub-Slice 3 — SLC-823: Teamlead-Tile-Konsistenz (BL-484)

- Im Settings-Tile-Array (`/settings/page.tsx`) das Tile "Rollen-Verwaltung" mit zwei Sichtbarkeits-Varianten ergaenzen:
  - **Admin:** Titel "Rollen-Verwaltung", Description wie aktuell, voller Klick fuehrt zu `/settings/team` mit Edit-Mode
  - **Teamlead:** Titel "Team-Mitglieder" (oder "Rollen-Verwaltung — Read-Only"), Description "Team-Mitglieder einsehen", Klick fuehrt zu `/settings/team` ohne Edit-Buttons
- **Seiten-Logik in `/settings/team`** muss bereits per V7.1 Permission-Layer (DEC-196) zwischen Admin (Edit) und Teamlead (Read-Only) unterscheiden. Falls nicht: SLC-823 ergaenzt die Read-Only-Sichtbarkeit (keine Invite/Delete-Buttons, Role-Select disabled fuer Teamlead)
- Ergebnis: Sidebar-Eintrag (Admin+Teamlead) und Tile (Admin+Teamlead) sind konsistent. Edit-Aktionen bleiben Admin-only

### Out of Scope

- 4. Rolle / Auditor / Read-Only-Steuerberater — wie schon in V8 bestaetigt
- Sidebar-Brand-Refresh, Icon-Refactor, Theming — separater Theming-Tracker (BL-441)
- Mobile-Hamburger-Restructure — V7-Foundation bleibt
- Neue Settings-Tiles, neue Sections — V8.1 ist Konsolidierung, kein Feature-Add
- Override-Setting fuer Solopreneur-Mode (z.B. "Team-Vorbereitungs-Modus") — explizit verworfen 2026-05-20
- Migration der Tools-Section (Handoffs/Referrals/Audit-Log) zu echtem Dashboard — bleiben Sidebar-Links
- Aenderung der `/settings/team`-Page selbst (Visual-Refactor) — V8.1 betrifft nur Tile-Sichtbarkeit, nicht die Ziel-Page

## Acceptance Criteria

### SLC-821 Solopreneur-Mode
- Frisch eingeloggter Admin mit team_size=1: `/team` und `/settings/team` Sidebar-Eintraege sind NICHT sichtbar
- Nach Admin-Invite eines Members (Smoke ueber bestehendes Invite-Flow): nach Reload des Layouts werden beide Eintraege wieder sichtbar
- Member mit team_size=1 (theoretischer Fall — kein Admin im Tenant) sieht die Items ohnehin nicht (Permission-Layer war schon vorher Admin/Teamlead-only) — keine Regression
- Kein neues Setting, kein neuer Toggle, keine neue Migration

### SLC-822 Sidebar-Konsolidierung
- Sidebar zeigt KEINEN der 12 VERWALTUNG_SETUP-Eintraege mehr
- Ein neuer Eintrag "Einstellungen" → `/settings` ist fuer ALL_ROLES sichtbar
- `/settings`-Tile-Page rendert weiterhin korrekt mit ihren 3 Sections und allen Tiles entsprechend Permission
- `/handoffs`, `/referrals`, `/audit-log` bleiben per Sidebar erreichbar (Default in `WERKZEUGE`-Section, /architecture finalisiert)
- Bestehende Direkt-Links zu `/settings/pipelines`, `/settings/templates`, etc. aus anderen Komponenten/E-Mails/Audit-Log-Render funktionieren unveraendert (keine URL-Aenderung)

### SLC-823 Teamlead-Tile-Konsistenz
- Tile "Rollen-Verwaltung" / "Team-Mitglieder" erscheint im `/settings`-Layout sowohl fuer Admin als auch Teamlead
- Klick als Admin → `/settings/team` voll editierbar (Invite, Role-Select, Delete)
- Klick als Teamlead → `/settings/team` read-only (Liste sichtbar, keine Edit-Buttons, Role-Select disabled)
- Member sieht das Tile NICHT
- Sidebar-Eintrag "Team-Verwaltung" und Tile-Sichtbarkeit sind konsistent fuer Admin+Teamlead

### Gesamt
- `npm run build`, `npm run lint`, `npm run test` clean
- Vitest Coverage fuer neue Sidebar-Filter-Logik (Solopreneur-Helper, Sidebar-Konsolidierung Test)
- Live-Smoke gegen business.strategaizetransition.com fuer alle 3 Rollen (Admin/Teamlead/Member)

## Open Points

- **team_size-Source**: `profiles.team_id` per Default angenommen. /architecture verifiziert oder ersetzt durch korrektes V7-Field
- **Tools-Section-Naming**: "WERKZEUGE" als Arbeitstitel, finale Bezeichnung in /architecture oder Slice-Planning
- **Reihenfolge Sidebar nach Konsolidierung**: ANALYSE → OPERATIV → ARBEITSBEREICHE → VERWALTUNG_MEIN → WERKZEUGE → Einstellungen (Footer)? — /architecture finalisiert
- **`/settings/team` Read-Only-Mode fuer Teamlead**: Pruefen, ob V7.1-Permission-Layer das schon kann, sonst ergaenzen in SLC-823
- **Reihenfolge der Sub-Slices**: SLC-822 vor SLC-823 (Tile-Konsistenz erst nach Sidebar-Kondensation), SLC-821 unabhaengig. Empfohlene Reihenfolge SLC-821 → SLC-822 → SLC-823, weil 821 die kleinste isolierte Aenderung ist

## Risks / Assumptions

- **Risk:** Wenn `VERWALTUNG_SETUP` als Sidebar-Section komplett verschwindet und `/handoffs`/`/referrals`/`/audit-log` ohne Heimat sind, koennen User sie nicht mehr finden. Mitigation: explizite `WERKZEUGE`-Section oder Audit, ob Pages anderweitig verlinkt sind
- **Risk:** Direkt-Links auf `/settings/templates` aus E-Mail-Composing-Studio oder Workflow-Builder koennten Permissions-Probleme bekommen, wenn Tile-Permission und Page-Permission auseinanderlaufen. Mitigation: keine URL-Aenderung, Page-Permission bleibt unveraendert
- **Risk:** Wenn Solopreneur-Mode (SLC-821) den `team_size`-Query in jedem Sidebar-Render macht, wird das ein N+1-artiger Aufruf — Mitigation: Helper soll in der Layout-Server-Side-Render-Phase einmal pro Request gecached werden
- **Assumption:** V8-Image (`c5e0f0c`) ist im Burn-In stabil (post-launch noch nicht abgeschlossen). Falls /post-launch V8 ein Blocker-Issue aufdeckt, V8.1 wartet
- **Assumption:** Keine Datenbank-Aenderung noetig. V8.1 ist UI-/Permission-/Filter-Layer-Sprint

## Success Criteria (Mapping auf Goal)

- Solopreneur startet das System und sieht keine wertlosen Team-Items mehr (BL-482 closed)
- Sidebar ist um 12 Eintraege schlanker, eine einzige Surface fuer Config ist `/settings` (BL-483 closed)
- Teamlead-Sichtbarkeit von `/settings/team` ist konsistent zwischen Sidebar und Tile-Page (BL-484 closed)
- Keine Regression in V8-Stack: Settings-Tile-Page bleibt funktional, Sidebar-Items in anderen Sections bleiben unveraendert
- Mobile (<768px) bleibt funktional

## Related

- DEC-196 (Permission-Matrix Admin/Teamlead/Member aus V7.1)
- FEAT-801 (V8 Settings-Layout-Refactor) — V8.1 baut darauf auf, dass `/settings` schon 3 Sections + Tiles hat
- FEAT-701 (Multi-User-UX aus V7)
- V8.1 Discovery 2026-05-20 (RPT-490)
- BL-482, BL-483, BL-484 (Backlog-Items, V8.1)
- `sidebar-config.ts` aktuell 12 VERWALTUNG_SETUP-Eintraege (sidebar-config.ts:250-354)
- `/settings/page.tsx` aktuell `ADMIN_ONLY`-Rollen-Verwaltung-Tile (~Z.187)
