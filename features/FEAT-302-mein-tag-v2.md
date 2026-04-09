# FEAT-302 — Mein Tag V2

## Summary
Geschaerftes operatives Tages-Cockpit mit echten Kalender-Daten, Meeting-Prep, Exception-Hinweisen und erster KI-Funktion (Tages-Summary).

## Version
V3

## Related Decisions
- DEC-023: Zentraler LLM-Service-Layer
- DEC-026: Eigene calendar_events-Tabelle

## Components
1. **Kalender-Panel:** Echte Events aus calendar_events Tabelle (FEAT-309)
2. **Meeting-Prep:** Naechstes Meeting mit Deal-/Kontakt-Kontext anzeigen
3. **Exception-Hinweise:** Stagnierte Deals (>14d), ueberfaellige Tasks, fehlende Follow-ups
4. **KI-Tages-Summary:** Bedrock-generierte Einschaetzung "Was steht heute an, was ist wichtig"
5. **Verfuegbare Zeit:** Berechnung basierend auf echten Calendar-Events
6. **Bestehend (beibehalten):** Tasks mit Kategorisierung, Quick-Actions, KI-Assistent-Shell

## Acceptance Criteria
1. Kalender-Panel zeigt echte Events aus calendar_events
2. Meeting-Prep zeigt naechstes Meeting mit verknuepftem Deal-/Kontakt-Kontext
3. Exception-Bereich zeigt stagnierte Deals und ueberfaellige Tasks
4. KI-Summary liefert Bedrock-generierte Tageseinschaetzung
5. Verfuegbare-Zeit basiert auf echten Calendar-Events
6. Bestehende Quick-Actions und Task-Liste bleiben funktional

## Technical Notes
- Stagnations-Erkennung: Deals mit updated_at > 14 Tage und status='active'
- KI-Summary nutzt FEAT-305 LLM-Service mit Tages-Kontext (Tasks, Events, Deals)
- Meeting-Prep: naechstes calendar_event mit type='meeting' + verknuepfter Deal/Kontakt
- Exception-Logik ist regelbasiert (kein LLM noetig)

## Out of Scope
- Exception Queue als eigene Seite (V3.1)
- KI-Assistent mit Aktionsfaehigkeit (V3.1)
- Cal.com-Sync (V4)
