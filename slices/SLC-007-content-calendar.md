# SLC-007 — Redaktionskalender

## Meta
- Feature: FEAT-003
- Priority: High
- Status: planned
- Dependencies: SLC-001, SLC-002

## Goal
Einfacher Content-Kalender im Cockpit: Tabellen- und Kalender-Ansicht für geplante Content-Einträge. CRUD für Content-Einträge mit Status-Workflow.

## Scope
- Content-Calendar CRUD (Server Actions)
- Tabellen-Ansicht (TanStack Table mit Filtern nach Typ, Status, Kanal)
- Kalender-Ansicht (Monatsansicht, Einträge als farbige Punkte/Blöcke)
- Eintrag-Erstellen/Bearbeiten (Sheet/Modal)
- Status-Workflow: planned → in_progress → review → published
- Toggle zwischen Tabelle und Kalender

## Out of Scope
- Publishing an externe Kanäle (V2)
- Content-Performance-Tracking (V4)

### Micro-Tasks

#### MT-1: Server Actions für Content-Kalender
- Goal: CRUD für content_calendar-Tabelle
- Files: `cockpit/app/(app)/calendar/actions.ts`
- Expected behavior: createEntry, getEntries(month/filters), updateEntry, deleteEntry, updateStatus
- Verification: Einträge erstellen und filtern
- Dependencies: SLC-002

#### MT-2: Tabellen-Ansicht
- Goal: Content-Einträge als filtrierbare Tabelle
- Files: `cockpit/app/(app)/calendar/table-view.tsx`, `cockpit/app/(app)/calendar/columns.tsx`
- Expected behavior: Tabelle mit Titel, Typ, Kanal, Status, Datum. Filter nach Typ/Status/Kanal.
- Verification: Einträge sichtbar, Filter funktionieren
- Dependencies: MT-1

#### MT-3: Kalender-Ansicht
- Goal: Monatskalender mit Content-Einträgen als farbige Blöcke
- Files: `cockpit/app/(app)/calendar/calendar-view.tsx`
- Expected behavior: Monatsraster, Einträge farbig nach Typ, Klick öffnet Detail
- Verification: Einträge erscheinen am richtigen Datum
- Dependencies: MT-1

#### MT-4: Kalender-Seite mit View-Toggle
- Goal: Hauptseite mit Toggle zwischen Tabelle und Kalender + Erstellen-Button
- Files: `cockpit/app/(app)/calendar/page.tsx`, `cockpit/app/(app)/calendar/entry-form.tsx`
- Expected behavior: Toggle zwischen Views, Neuen Eintrag erstellen per Sheet
- Verification: Toggle funktioniert, Eintrag erstellen und sofort sichtbar
- Dependencies: MT-2, MT-3
