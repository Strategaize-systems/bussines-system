# SLC-305 — Meeting + Calendar CRUD

## Slice Info
- Feature: FEAT-308, FEAT-309
- Version: V3
- Priority: High
- Dependencies: SLC-301 (Schema)
- Type: Backend + Frontend

## Goal
Meeting- und Calendar-Event-Management implementieren: Server Actions, Formulare, /termine Seite, Activity-Integration, Meeting→Calendar Auto-Erzeugung.

## Scope

### Included
1. Meeting Server Actions: createMeeting, updateMeeting, deleteMeeting, getMeetings, getMeetingById
2. Calendar Event Server Actions: createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEvents, getCalendarEventsForDay
3. Meeting-Formular (Sheet/Dialog) — erreichbar aus Deal-Workspace und Mein Tag
4. Calendar-Event-Formular (Sheet/Dialog)
5. /termine Seite: Tages/Wochen-Ansicht der Calendar-Events
6. Activity source_type Integration: Meeting-Erstellung erzeugt automatisch Activity mit source_type='meeting'
7. Meeting→Calendar: Meeting-Erstellung erzeugt automatisch Calendar-Event

### Excluded
- KI-generierte Meeting-Summaries (V4)
- Meeting-Transkription (V4)
- Cal.com-Sync (V4)
- Verfuegbare-Zeit-Berechnung (kommt in SLC-308 Mein Tag)

## Backlog Items
- BL-314: Meetings-Tabelle + CRUD
- BL-315: Calendar-Events Tabelle + CRUD + Mein Tag Integration

## Acceptance Criteria
1. Meetings koennen erstellt, bearbeitet, geloescht werden
2. Calendar-Events koennen erstellt, bearbeitet, geloescht werden
3. /termine Seite zeigt Events chronologisch
4. Meeting-Erstellung erzeugt automatisch Activity (source_type='meeting')
5. Meeting-Erstellung erzeugt automatisch Calendar-Event
6. Meetings/Events koennen mit Deal, Kontakt, Firma verknuepft werden
7. Meeting-Status (planned/completed/cancelled) ist aenderbar

## Micro-Tasks

### MT-1: Meeting Server Actions
- Goal: CRUD-Funktionen fuer meetings Tabelle
- Files: `lib/actions/meetings.ts` (oder wo Server Actions liegen)
- Expected behavior: createMeeting erzeugt Meeting + Activity + Calendar-Event
- Verification: Meeting erstellen, in DB pruefen
- Dependencies: SLC-301

### MT-2: Calendar Event Server Actions
- Goal: CRUD-Funktionen fuer calendar_events Tabelle
- Files: `lib/actions/calendar-events.ts`
- Expected behavior: Standard CRUD + getCalendarEventsForDay(date) fuer Mein Tag
- Verification: Event erstellen, in DB pruefen
- Dependencies: SLC-301

### MT-3: Meeting-Formular
- Goal: UI-Dialog zum Erstellen/Bearbeiten von Meetings
- Files: `components/meetings/meeting-form.tsx` (oder aehnlich)
- Expected behavior: Formular mit Titel, Zeitpunkt, Dauer, Teilnehmer, Agenda, Deal/Kontakt/Firma-Verknuepfung
- Verification: Browser-Check — Meeting anlegen
- Dependencies: MT-1

### MT-4: Calendar-Event-Formular + /termine Seite
- Goal: UI-Dialog fuer Events + /termine Listenansicht
- Files: `components/calendar/event-form.tsx`, `app/(main)/termine/page.tsx`
- Expected behavior: Events erstellen/bearbeiten, /termine zeigt chronologische Liste
- Verification: Browser-Check — Events sichtbar
- Dependencies: MT-2

## Technical Notes
- Meeting-Formular muss von mehreren Orten aufrufbar sein (Deal-Workspace, Mein Tag, /termine)
- Activity auto-creation: Bei createMeeting → insert in activities mit source_type='meeting', source_id=meeting.id
- Calendar auto-creation: Bei createMeeting → insert in calendar_events mit meeting_id, type='meeting'
- /termine Seite: Einfache Listenansicht, kein Full-Calendar-Widget noetig in V3
