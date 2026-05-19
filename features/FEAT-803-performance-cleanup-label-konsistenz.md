# FEAT-803 — /performance-Page-Cleanup + Task/Aufgabe-Label-Konsistenz

## Status

planned (V8)

## Created

2026-05-19

## Why

Zwei kleine Hygiene-Items, die seit V6.6 (REL-028, 2026-05-11) als Cleanup offen sind und im V8-Backlog-Hygiene-Review identifiziert wurden:

### BL-453 (/performance-Page weg)
DEC-169 (V6.6): SLC-662 hat `/performance` zur Redirect-Page mit 1.5s-Toast gemacht (User-Migrations-Pfad: "Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button"). Diese Bruecke war fuer **1 Sprint** geplant. Wir sind jetzt 5 Sprints weiter (V6.6 → V6.7→V7.0→V7.1→V7.2→V7.5→V7.6→V8). Die Bruecke kann komplett geloescht werden.

**Aktueller Code:** `cockpit/src/app/(app)/performance/page.tsx` (35 Zeilen) — Redirect via `useRouter().replace("/mein-tag")` nach 1.5s, plus Sparkles-Toast-Karte.

**Sub-Folder pruefen:** `cockpit/src/app/(app)/performance/goals/` existiert noch — Inhalt pruefen in Slice-Planning, ggf. mit weg.

### BL-459 (Task/Aufgabe Label-Konsistenz)
Gesamt-/qa V6.6 RPT-386 Low-Finding L-1 (2026-05-11): Cockpit (SLC-666) verwendet "Aufgabe" als Label fuer den Quick-Action-Task-Button, Mein-Tag (SLC-662) und Deal-Detail (SLC-664) verwenden "Task". Funktional identisch, aber inkonsistent. Strategaize-Style spricht durchgaengig Deutsch ("Aufgabe").

**Konkret:** ueberall "Task" → "Aufgabe" in den Quick-Action-Buttons der drei KI-Workspace-Pages.

## Scope

### In Scope

- **BL-453 Cleanup**:
  - `cockpit/src/app/(app)/performance/page.tsx` komplett loeschen
  - `cockpit/src/app/(app)/performance/goals/` pruefen — wenn isoliert + ungenutzt: mitloeschen
  - Sidebar-Eintrag fuer `/performance` final entfernen (falls noch ein Rest vorhanden)
  - Links zu `/performance` im Code finden und entfernen (Grep auf `/performance` in `cockpit/src`)
- **BL-459 Label-Vereinheitlichung**:
  - Quick-Action-Button-Label "Task" → "Aufgabe" in `/mein-tag` (SLC-662), `/deals/[id]` (SLC-664), `/cockpit` (SLC-666)
  - Pruefen ob weitere "Task"-Strings im UI vorkommen — alle auf "Aufgabe"
  - Schema-Felder bleiben unveraendert (`activities`-Tabelle, intern weiter "Task"-Begriff in Code OK)

### Out of Scope

- Schema-Rename `activities`-Tabelle — nur UI-Label-Change
- Sonstige Sidebar-Reorganisation — siehe FEAT-801 Settings-Refactor
- Toast-Pattern aendern — V6.6-Pattern bleibt fuer andere Migrations-Bruecken nutzbar

## Acceptance Criteria

- `/performance`-URL gibt 404 (kein Redirect mehr) oder fuehrt zu einem klaren Routing-Default
- Grep auf `Task` in `cockpit/src/app/(app)/*.tsx` ausserhalb von Test-Files und Code-Identifiern zeigt 0 User-sichtbare Treffer
- 3 Quick-Action-Buttons rendern "Aufgabe" cross-page
- `npm run build` + `npm run lint` + `npm run test` clean
- Live-Smoke: GET `/performance` produziert kein Crash-/Redirect-Loop, Quick-Action-Buttons sichtbar

## Open Points

- `performance/goals/` Inhalt pruefen in Slice-Planning — falls aktive Goal-Verwaltung dort lebt, muss die woanders hin BEVOR Loeschung erfolgt (z.B. nach /mein-tag oder /team)

## Related

- BL-453 (Backlog-Item, low prio, 2026-05-09)
- BL-459 (Backlog-Item, low prio, 2026-05-11)
- DEC-169 (V6.6 — /performance-Redirect-Bruecke)
- RPT-386 (V6.6 Gesamt-/qa Low-Finding L-1)
