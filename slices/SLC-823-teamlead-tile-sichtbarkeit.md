# SLC-823 — Teamlead-Tile-Sichtbarkeit in /settings (FEAT-811 / BL-484)

## Metadata
- **Slice ID:** SLC-823
- **Version:** V8.1
- **Feature:** FEAT-811 Sub-Slice 3
- **Backlog:** BL-484
- **Status:** planned
- **Priority:** Low
- **Created:** 2026-05-20
- **Estimated Effort:** ~10-15 Min Code + ~5-10 Min /qa + Live-Smoke = ~15-25 Min Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** nicht noetig (2-Zeilen-Change in einer Datei)
- **Pattern-Reuse:** keine — triviale Permission-Aenderung
- **Reihenfolge-Empfehlung:** SLC-823 DRITTER in V8.1 nach SLC-822. Trivial, schnell, isoliert.

## Why

`/settings/team` ist als Sidebar-Eintrag fuer Admin+Teamlead sichtbar (sidebar-config.ts:121-125). Das `/settings`-Tile "Rollen-Verwaltung" ist aber `ADMIN_ONLY` (settings/page.tsx:187). Same URL, verschiedene Sichtbarkeit. Teamlead findet die Seite nur ueber die Sidebar, nicht ueber die Tile-Page.

DEC-229: Reine Tile-Permission-Aenderung `ADMIN_ONLY` → `ADMIN_TEAMLEAD`. Edit-Verhalten wird in SLC-824 angepasst. SLC-823 ist nur Sichtbarkeits-Fix.

## Scope

**In Scope:**

- [cockpit/src/app/(app)/settings/page.tsx](cockpit/src/app/(app)/settings/page.tsx) Z.187: `visibleFor: ADMIN_ONLY` → `visibleFor: ADMIN_TEAMLEAD`
- Z.183 Tile-Description neutralisieren: "Team-Mitglieder, Rollen-Zuweisung und Drilldown" → "Team-Mitglieder einsehen und verwalten" (sprachlich neutral fuer Admin und Teamlead)
- Vitest fuer `visibleSections.filter`-Logik (Teamlead sieht jetzt "Rollen-Verwaltung"-Tile in System-Section)

**Out of Scope:**
- `/settings/team`-Page-Internals (`team-members-table.tsx`, `invite-dialog.tsx`, `bulk-reassign-dialog.tsx`) — V7-Verhalten bleibt
- Server-Action-Permission-Aenderungen — kommt in SLC-824
- UI-Disabling von Edit-Buttons fuer Teamlead — kommt in SLC-824

## Acceptance Criteria

- **AC1** — Z.187 `visibleFor: ADMIN_ONLY` → `ADMIN_TEAMLEAD`
- **AC2** — Z.183 Description neutralisiert
- **AC3** — Teamlead-Login: `/settings`-Tile-Page zeigt "Rollen-Verwaltung"-Tile in System-Section
- **AC4** — Admin-Login: `/settings`-Tile-Page zeigt "Rollen-Verwaltung"-Tile (unveraendert, V8-FEAT-801-Verhalten)
- **AC5** — Member-Login: Tile NICHT sichtbar (Member hat keine System-Section-Tiles)
- **AC6** — Klick als Teamlead → `/settings/team` rendert (assertRole bereits Admin+Teamlead, V7-Verhalten)
- **AC7** — `npm run build`, `npm run lint`, `npm run test` clean
- **AC8** — Vitest: `visibleSections`-Filter zeigt fuer Teamlead "Rollen-Verwaltung"

## Micro-Tasks

### MT-1: Tile-Permission aendern + Description neutralisieren
- **Goal:** 2 Zeilen in settings/page.tsx aendern
- **Files:** `cockpit/src/app/(app)/settings/page.tsx` (modify)
- **Expected behavior:**
  - Z.187: `visibleFor: ADMIN_ONLY` → `visibleFor: ADMIN_TEAMLEAD`
  - Z.183: Description-String neutralisieren
- **Verification:** Build clean
- **Dependencies:** keine

### MT-2: Vitest Update / Add
- **Goal:** Test dass Teamlead-Role "Rollen-Verwaltung"-Tile sieht
- **Files:** `cockpit/src/app/(app)/settings/page.test.tsx` (modify oder neu — pruefen ob existiert)
- **Expected behavior:** Test gegen `visibleSections`-Filter mit Mock-Role `'teamlead'` → System-Section enthaelt Tile mit `href === '/settings/team'`
- **Verification:** `npm run test -- page.test.tsx` PASS
- **Dependencies:** MT-1

### MT-3: Build/Lint/Test + Live-Smoke
- **Goal:** Gesamt-Validierung + visuelle Pruefung
- **Expected behavior:** Live-Smoke per Playwright-MCP: Login als qa-teamlead → `/settings` → "Rollen-Verwaltung"-Tile in System-Section sichtbar → Klick → `/settings/team` rendert
- **Verification:** Browser-Smoke PASS
- **Dependencies:** MT-2

## Open Points

- **Description-Text-Detail:** "Team-Mitglieder einsehen und verwalten" — funktioniert fuer Admin (Edit) und Teamlead (Limited-Edit nach SLC-824). Endgueltige Sprach-Wahl in MT-1.

## Risks

- **Risk:** Vor SLC-824 sieht Teamlead das Tile, klickt drauf, sieht V7-Verhalten (kann nicht loeschen, kann teamlead einladen). Das ist Zwischen-Zustand. Mitigation: SLC-823 und SLC-824 zeitlich nahe ausfuehren (gleiche Session), kein langes Plateau zwischen den beiden Slices.
- **Risk:** Tile-Layout in System-Section koennte mit zusaetzlichem Tile unaufgeraeumt aussehen (Tile-Zahl steigt fuer Teamlead von 0 auf 1 in System-Section). Mitigation: keine — System-Section war fuer Teamlead bisher leer, jetzt mit einem Tile sichtbar.

## Dependencies

- Empfohlen NACH SLC-822 (Sidebar-Konsolidierung), damit `/settings/team` als Tile die "richtige" Erreichbarkeit ist (statt Doppelung Sidebar+Tile).

## Reihenfolge-Empfehlung in V8.1

SLC-823 als DRITTER Slice. Sehr klein (~10-15 Min), gut als "schnelle Win"-Slice. Sollte direkt vor SLC-824 gebaut werden, damit Tile-Sichtbarkeit + Edit-Verhalten konsistent sind.

## Reports

- Quelle: V8.1 Architecture RPT-491
- Reports erwartet: 1x /frontend RPT-49X + 1x /qa RPT-49X (sehr kurz)
