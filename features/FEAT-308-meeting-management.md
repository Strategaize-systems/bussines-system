# FEAT-308 — Meeting-Management

## Summary
Eigenes Meeting-Objekt als separate Tabelle (DEC-021). Meetings werden von Activities getrennt, behalten aber Timeline-Integration ueber source_type/source_id.

## Version
V3

## Related Decisions
- DEC-021: Activities bleibt polymorph, Meetings als eigene Tabelle

## Schema: meetings

| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | PK |
| title | TEXT | Meeting-Titel |
| scheduled_at | TIMESTAMPTZ | Geplanter Zeitpunkt |
| duration_minutes | INT | Geplante Dauer |
| location | TEXT | Ort oder Meeting-Link |
| participants | TEXT | Teilnehmer (Freitext oder JSON) |
| agenda | TEXT | Agenda / Vorbereitung |
| outcome | TEXT | Ergebnis / Zusammenfassung |
| notes | TEXT | Zusaetzliche Notizen |
| transcript | TEXT | Transkription (leer in V3, fuer V4) |
| deal_id | UUID FK | Verknuepfter Deal |
| contact_id | UUID FK | Verknuepfter Kontakt |
| company_id | UUID FK | Verknuepfte Firma |
| status | TEXT | planned/completed/cancelled |
| created_by | UUID | Ersteller |
| created_at | TIMESTAMPTZ | Erstellungszeitpunkt |

## Acceptance Criteria
1. meetings Tabelle existiert mit allen Feldern
2. Meeting-Erstellung aus Deal-Workspace und Mein Tag moeglich
3. Meetings erscheinen in Timeline (Activities mit source_type='meeting', source_id=meeting.id)
4. Meeting-Detail zeigt Teilnehmer, Agenda, Ergebnis
5. transcript-Feld existiert (leer, fuer V4)
6. Meeting-Status (planned/completed/cancelled) ist aenderbar

## Technical Notes
- Bei Meeting-Erstellung: automatisch Activity mit source_type='meeting' erstellen
- Activities-Tabelle braucht: source_type TEXT, source_id UUID (neue Spalten)
- Meeting-Form als Sheet oder auf Deal-Workspace-Seite
- Kalender-Events (FEAT-309) koennen automatisch aus Meetings erzeugt werden
