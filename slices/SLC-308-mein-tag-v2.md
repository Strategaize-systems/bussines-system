# SLC-308 — Mein Tag V2

## Slice Info
- Feature: FEAT-302
- Version: V3
- Priority: High
- Dependencies: SLC-304 (LLM Service), SLC-305 (Meetings + Calendar)
- Type: Frontend + Server Actions

## Goal
Mein Tag zur operativen Tages-Zentrale ausbauen: Echte Kalender-Daten, Meeting-Vorbereitung, Exception-Hinweise (stagnierte Deals, ueberfaellige Tasks), KI-Tages-Summary.

## Scope

### Included
1. Kalender-Panel: Echte Events aus calendar_events (statt Dummy-Daten)
2. Meeting-Prep Card: Naechstes Meeting mit Deal-/Kontakt-Kontext
3. Exception-Hinweise:
   - Stagnierte Deals (updated_at > 14 Tage, status='active')
   - Ueberfaellige Tasks (due_date < heute, status='open')
   - Fehlende Follow-ups (follow_up_date < heute, follow_up_status='pending')
4. KI-Tages-Summary: Bedrock-generierte Einschaetzung (async)
5. Verfuegbare-Zeit-Berechnung: Arbeitstag - Summe Event-Dauer
6. Bestehende Quick-Actions und Task-Liste beibehalten

### Excluded
- Exception Queue als eigene Seite (V3.1)
- KI-Assistent mit Aktionsfaehigkeit (V3.1)
- Cal.com-Sync (V4)
- Mobiles PWA-Layout (V3.1)

## Backlog Items
- BL-304: Mein Tag Kalender-Daten + Verfuegbare Zeit
- BL-305: Mein Tag Meeting-Prep + Exception-Hinweise
- BL-306: Mein Tag KI-Tages-Summary

## Acceptance Criteria
1. Kalender-Panel zeigt echte Events aus calendar_events fuer heute
2. Meeting-Prep zeigt naechstes Meeting mit verknuepftem Deal-/Kontakt-Kontext
3. Exception-Bereich zeigt stagnierte Deals mit Anzahl + Link
4. Exception-Bereich zeigt ueberfaellige Tasks
5. KI-Summary laedt async und zeigt Tageseinschaetzung
6. Verfuegbare-Zeit-Anzeige basiert auf echten Events
7. Bestehende Quick-Actions und Tasks bleiben funktional

## Micro-Tasks

### MT-1: Server Actions fuer Mein Tag Daten
- Goal: Neue/erweiterte Server Actions fuer Kalender-Daten, Exceptions
- Files: Bestehende Mein-Tag Server Actions (erweitern)
- Expected behavior: getCalendarEventsForDay(today), getStalledDeals(), getOverdueTasks(), getNextMeeting()
- Verification: Daten kommen korrekt zurueck
- Dependencies: SLC-301 (Schema), SLC-305 (Calendar Actions)

### MT-2: Kalender-Panel + Verfuegbare Zeit
- Goal: Echte Events statt Dummy-Daten anzeigen, verfuegbare Zeit berechnen
- Files: Bestehende Mein-Tag Komponenten (Kalender-Bereich)
- Expected behavior: Events chronologisch, Verfuegbare Zeit = 10h - Summe Event-Dauer
- Verification: Browser-Check — Events sichtbar, Zeit korrekt
- Dependencies: MT-1

### MT-3: Meeting-Prep + Exception-Hinweise
- Goal: Meeting-Prep Card und Exception-Warnungen einbauen
- Files: Bestehende Mein-Tag Seite (neue Sektionen)
- Expected behavior: Meeting-Prep zeigt naechstes Meeting + Kontext. Exceptions zeigen Zahlen + Links.
- Verification: Browser-Check — mit Testdaten
- Dependencies: MT-1

### MT-4: KI-Tages-Summary Panel
- Goal: Bedrock-generierte Tageseinschaetzung async laden
- Files: `components/mein-tag/ai-summary.tsx` (oder in bestehende Seite)
- Expected behavior: Async-Load von /api/ai/query type='daily-summary'. Zeigt Greeting, Prioritaeten, Warnungen, Suggested Focus.
- Verification: Browser-Check — Summary wird geladen
- Dependencies: SLC-304 (LLM Service)

## Technical Notes
- Stagnations-Query: `SELECT * FROM deals WHERE status = 'active' AND updated_at < now() - interval '14 days'`
- Meeting-Prep: Naechstes calendar_event mit type='meeting' heute/morgen → meeting_id → Deal/Kontakt laden
- KI-Summary braucht: Tasks heute, Events heute, stagnierte Deals, ueberfaellige Items als Kontext
- Bestehende Mein-Tag-Seite wird erweitert, nicht neu gebaut
