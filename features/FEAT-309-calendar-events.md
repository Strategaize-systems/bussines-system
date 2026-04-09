# FEAT-309 — Kalender-Events

## Summary
Eigene Kalender-Datenquelle fuer Mein Tag. Einfache calendar_events Tabelle mit CRUD-UI.

## Version
V3

## Related Decisions
- DEC-026: Eigene calendar_events-Tabelle

## Schema: calendar_events

| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | PK |
| title | TEXT | Event-Titel |
| start_time | TIMESTAMPTZ | Startzeit |
| end_time | TIMESTAMPTZ | Endzeit |
| type | TEXT | meeting/call/block/personal/other |
| description | TEXT | Beschreibung |
| location | TEXT | Ort oder Link |
| deal_id | UUID FK | Verknuepfter Deal (optional) |
| contact_id | UUID FK | Verknuepfter Kontakt (optional) |
| company_id | UUID FK | Verknuepfte Firma (optional) |
| meeting_id | UUID FK | Verknuepftes Meeting (optional) |
| created_by | UUID | Ersteller |
| created_at | TIMESTAMPTZ | Erstellungszeitpunkt |

## Acceptance Criteria
1. calendar_events Tabelle existiert mit definierten Feldern
2. Events koennen erstellt, bearbeitet, geloescht werden
3. Mein Tag Kalender-Panel zeigt echte Events statt Dummy-Daten
4. Verfuegbare-Zeit-Berechnung basiert auf echten Events
5. Events koennen mit Deals, Kontakten, Firmen verknuepft werden
6. Meeting-Erstellung (FEAT-308) erzeugt automatisch Calendar-Event

## Technical Notes
- CRUD via Server Actions (getCalendarEvents, createCalendarEvent, etc.)
- Mein Tag laedt Events fuer heute + morgen
- Verfuegbare-Zeit = Arbeitstag (z.B. 10h) - Summe Event-Dauer
- Meetings (FEAT-308) erzeugen Calendar-Event mit meeting_id Verweis
