# FEAT-801 — Settings-Layout-Refactor + Rollen-Auffindbarkeit

## Status

planned (V8)

## Created

2026-05-19

## Why

Die `/settings`-Landing-Page ist aktuell eine einspaltige Liste aus 10 Tiles ohne Gruppierung. Mit den drei Permission-Levels (Admin / Teamlead / Member) und 14 Subpage-Verzeichnissen ist die Auffindbarkeit schlecht — speziell die **Rollen-Verwaltung existiert bereits** in `/settings/team/team-members-table.tsx` als Inline-Select pro Zeile, aber sie ist visuell versteckt in einer Tabellen-Spalte und der User vermutete, sie wuerde komplett fehlen.

Zusatzbefund aus `/discovery`-Code-Inspektion 2026-05-19:
- **Ghost-Subpages**: `/settings/products/` und `/settings/workflow-automation/` haben keinen Tile-Eintrag, sind nur via Direkt-URL erreichbar
- **Automation-Duplikat**: `/settings/automation/` (im Tile-Array) UND `/settings/workflow-automation/` als Folder — Refactor-Rest
- **Doppel-Pfad fuer Team**: `/team` (Top-Level, Cockpit + KI-Workspace) UND `/settings/team` (Verwaltung) — gewollt, aber Funktion ist nicht klar abgegrenzt
- **Drilldown-Button disabled** in `team-members-table.tsx:198` mit Title "Drilldown kommt mit SLC-706" — Code-Rest aus V7

V8 raeumt die Settings strukturell auf und macht Rollen-Verwaltung sichtbar.

## Scope

### In Scope

- **Tile-Gruppierung mit drei Sections**: Persoenlich (Arbeitszeit, Meeting-Einstellungen, Pre-Call Briefing) / Vertrieb (Pipelines, Workflow-Automation, Kampagnen, E-Mail-Templates) / System (Branding, Zahlungsbedingungen, Einwilligungstexte, Rollen-Verwaltung)
- **Rollen-Verwaltung als eigenes Tile** in der System-Section sichtbar machen — Link zur bestehenden `/settings/team`-Page
- **Ghost-Subpages cleanup**: `/settings/products/` und `/settings/workflow-automation/` Folder loeschen (keine erreichbare Funktion), oder als Tile sichtbar machen falls noch benoetigt — Pruefung in Slice-Planning
- **Automation-Duplikat aufloesen**: nur `/settings/automation/` bleibt, `workflow-automation/` Folder geht weg
- **Drilldown-Button aktivieren oder entfernen** in `team-members-table.tsx` — wenn aktiviert, fuehrt er zu `/team/[user_id]` (Page existiert bereits per `/team/[user_id]/page.tsx`)
- **Mobile-Layout**: Tile-Sections funktionieren auch unter 768px

### Out of Scope

- 4. Rolle (Read-Only / Auditor / Steuerberater) — gehoert ins OS, nicht ins BS, siehe `/discovery`-Klaerung 2026-05-19
- `/team` Top-Level entfernen oder verschmelzen — bleibt als Cockpit/Analyse erhalten
- Neue Settings-Funktionen — V8 ist Layout-Refactor, kein Feature-Add
- Tile-Icons/Brand-Refresh — siehe BL-441 Theming-Sprint
- Rollen-Konzept-Aenderung (Permission-Matrix DEC-196 bleibt unveraendert)

## Acceptance Criteria

- `/settings` rendert 3 visuell getrennte Sections mit Section-Headers (Persoenlich / Vertrieb / System)
- Mindestens 1 Tile in jeder Section sichtbar fuer alle Rollen (Member sieht nur Persoenlich-Section + ggf. Vertrieb-Subset)
- Rollen-Verwaltung erscheint als eigenes Tile in System-Section, Klick fuehrt zu `/settings/team`
- Ghost-Subpages `/settings/products` und `/settings/workflow-automation` sind entweder geloescht oder als Tile registriert
- Drilldown-Button in `team-members-table.tsx` ist entweder aktiv (fuehrt zu `/team/[user_id]`) oder komplett entfernt — keine disabled-Buttons mit "kommt mit SLC-XXX"-Title
- `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` PASS
- Live-Smoke: alle 3 Rollen (qa-admin, qa-teamlead, qa-member) sehen ihre erlaubten Tiles in der richtigen Section

## Open Points

- Genaue Tile-Reihenfolge innerhalb der Sections — in Slice-Planning festzulegen
- Drilldown-Button aktivieren ODER entfernen — Entscheidung in Slice-Planning nach Pruefung ob `/team/[user_id]`-Page in V7 wirklich vollstaendig wurde

## Related

- DEC-196 (Permission-Matrix Admin/Teamlead/Member)
- BL-466 (Drilldown-Polish damals aus V7.1 ausgegliedert)
- `/discovery` BS V8 2026-05-19 (RPT-???)
