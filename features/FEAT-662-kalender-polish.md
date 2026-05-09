# FEAT-662 — Kalender-Polish (Working-Hours-Setting)

**Status:** planned
**Version:** V6.6
**Created:** 2026-05-09
**Sources:** DISCOVERY-V6.6.md Block 2

## Purpose

Der Mein-Tag-Kalender und der Dashboard-Kalender (FEAT-665) zeigen heute hartkodiert 07:00–20:00 Uhr (`kalender-client.tsx`). Frueh-Termine (z.B. 06:30 mit Premium-Kunden) und Spaet-Sessions (z.B. 20:30 Inside-Sales-Reviews) sind nicht sichtbar. Gleichzeitig haben User unterschiedliche Arbeitszeiten — der eine arbeitet 09:00–18:00, der andere 06:00–14:00.

Ziel: Stunden-Range default ausweiten + Working-Hours-Setting pro User-Profil + Toggle fuer "Voller Tag / Nur Arbeitstag", damit der User sein gewohntes Arbeitsfenster sehen kann, aber bei Bedarf den vollen Tag aufmachen kann.

Feiertag-Logik (DE/NL via `date-holidays`-Lib + UI-Markierung) ist NICHT V6.6-Scope (Backlog BL-444).

## Scope

### Teil 1: Default-Range erweitern

- `kalender-client.tsx` Stunden-Range default 07:00–20:00 → **06:00–21:00** (4h mehr Sichtbarkeit pro Tag)
- Betrifft Mein-Tag-Kalender UND Dashboard-Kalender (gleiche Component)

### Teil 2: Working-Hours-Setting pro User

- Neue User-Setting: `working_hours_start` + `working_hours_end` (TIME-Spalten in `user_profiles` ODER JSONB-Feld)
- UI in `/settings` → neue Sektion "Arbeitszeit" mit zwei TimePicker-Inputs (Start, Ende)
- Default: leer (= "Voller Tag" 06:00–21:00 wird genutzt)
- Bei gesetztem Working-Hours-Setting: Kalender zeigt **defaultmaessig nur den Arbeitstag** im Hauptbereich, ueberhaengende Termine bleiben sichtbar (oben/unten gestaucht oder kompakter Hint "2 weitere Termine ausserhalb der Arbeitszeit")

### Teil 3: Toggle "Voller Tag / Nur Arbeitstag"

- Toggle in der Kalender-Header-Bar (z.B. neben dem heutigen Datum oder ueber die Kalender-Toolbar)
- Toggle-Persistenz: localStorage pro User (kein DB-Roundtrip-Overhead)
- Wenn User keine Working-Hours gesetzt hat: Toggle ist **disabled** mit Hint "Working-Hours in Settings setzen"

### Teil 4: V7-Multi-User-Kompatibilitaet

- Working-Hours-Setting ist user_id-scoped — kein globaler Toggle
- Bei spaeterem Multi-User-Sprint kann jeder User seine eigene Arbeitszeit setzen ohne weitere Schema-Aenderung

## Acceptance Criteria

**AC1:** `kalender-client.tsx` rendert default 06:00–21:00 statt 07:00–20:00 (Hartkodierung entfernt, Konstante oder Setting-Wert).

**AC2:** Mein-Tag-Kalender und Dashboard-Kalender beide zeigen 06:00–21:00 (gleiche Component, kein Drift).

**AC3:** Settings-Page hat eine neue Sektion "Arbeitszeit" mit zwei TimePicker-Inputs (Start + Ende), Save-Action persistiert in `user_profiles.working_hours_start/end` (oder aequivalent).

**AC4:** Wenn Working-Hours gesetzt sind, zeigt der Kalender defaultmaessig nur den Arbeitstag-Bereich im Haupt-Viewport. Termine ausserhalb der Arbeitszeit bleiben sichtbar (z.B. via gestauchtem Pre/Post-Bereich oder "X Termine vor/nach Arbeitszeit"-Hint).

**AC5:** Toggle "Voller Tag / Nur Arbeitstag" ist sichtbar in Kalender-Header. Klick wechselt Range. Persistenz via localStorage. Default "Voller Tag" wenn keine Working-Hours gesetzt.

**AC6:** Wenn User keine Working-Hours gesetzt hat, ist der Toggle disabled mit Hint "Working-Hours in Settings setzen".

**AC7:** Schema-Migration ist additiv — `user_profiles` bekommt `working_hours_start TIME NULL + working_hours_end TIME NULL` (oder aequivalent). Bestehende User-Profile bleiben funktional ohne Wert.

**AC8:** Build clean, Vitest gruen, Lint clean.

**AC9:** Live-Smoke: User setzt Working-Hours 09:00–18:00 in Settings, oeffnet Mein Tag, sieht 09:00–18:00 als Hauptbereich, Toggle "Voller Tag" zeigt 06:00–21:00.

## Out of Scope

- Feiertag-Logik (DE/NL via `date-holidays`) → BL-444 (Backlog, eigener Slice nach V7)
- Time-Zone-Handling (User in anderer TZ als Server) → V7 oder spaeter
- Kalender-Color-Coding pro Termin-Typ → separates UI-Update-Sprint-Item
- Drag-und-Drop-Termin-Verschieben → kein V6.6-Scope
- Multi-User-Kalender-Sicht (Team-Kalender) → V7
- Kalender-Drucken / PDF-Export → aktueller Bedarf nicht erkennbar

## Open Questions for /architecture

- **F12**: Speicherung — `user_profiles.working_hours_start/end` (TIME-Spalten, additive Migration) oder JSONB? Empfehlung: TIME-Spalten, da typisiert.
- **F13**: Toggle-Persistenz — localStorage pro User (kein DB-Roundtrip) oder DB? Empfehlung: localStorage.
- **F18 (neu)**: Wenn ein Termin "ueberhaengt" (z.B. 17:30–18:30 bei Working-Hours 09:00–18:00), wird er gestaucht angezeigt oder mit "X Termine ausserhalb"-Hint? UX-Detail fuer /architecture.

## References

- `c:/strategaize/strategaize-business-system/docs/DISCOVERY-V6.6.md` Block 2
- `cockpit/src/components/kalender-client.tsx:29` (aktuelle Hartkodierung)
- FEAT-309 Kalender-Events (V3, Reuse)
- BL-444 Feiertag-Logik (Out of Scope V6.6)
