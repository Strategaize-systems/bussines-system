# SLC-501 — Schema-Migration + Types

## Slice Info
- Feature: FEAT-501, FEAT-505, FEAT-506
- Priority: Blocker
- Status: planned

## Goal
Alle 5 neuen Tabellen und 2 Tabellen-Erweiterungen fuer V5 erstellen. TypeScript-Types definieren. Basis-Slice, blockiert alle folgenden V5-Slices.

## Scope
- 5 neue Tabellen: cadences, cadence_steps, cadence_enrollments, cadence_executions, email_tracking_events
- 2 Tabellen-Erweiterungen: emails (+tracking_id, +tracking_enabled), email_messages (+assignment_source, +ai_match_confidence)
- RLS-Policies + Indizes fuer alle neuen Tabellen
- TypeScript-Types fuer alle neuen Tabellen
- Migration-SQL-Datei

## Out of Scope
- CRUD Server Actions (SLC-504)
- UI-Komponenten
- Cron-Logik

## Acceptance Criteria
- AC1: Alle 5 Tabellen existieren in der DB mit korrekten Spalten, Typen, Defaults
- AC2: Alle Indizes und Unique Constraints sind erstellt
- AC3: RLS aktiviert mit authenticated_full_access Policy auf allen neuen Tabellen
- AC4: TypeScript-Types spiegeln die Tabellen-Struktur korrekt wider
- AC5: Bestehende emails-Tabelle hat tracking_id und tracking_enabled Spalten
- AC6: Bestehende email_messages-Tabelle hat assignment_source und ai_match_confidence Spalten
- AC7: Build kompiliert ohne Fehler (npm run build)

## Dependencies
- Keine (erster V5-Slice)

## QA Focus
- Schema-Verifikation via psql (Tabellen, Spalten, Indizes, Constraints)
- FK-Referenzen korrekt (cadence_steps → cadences, enrollments → cadences/deals/contacts, etc.)
- TypeScript-Build kompiliert

### Micro-Tasks

#### MT-1: SQL-Migration erstellen
- Goal: Vollstaendige Migration-SQL-Datei mit allen 5 Tabellen, 2 Erweiterungen, Indizes, RLS
- Files: `sql/migrations/020_v5_schema.sql`
- Expected behavior: SQL kann idempotent ausgefuehrt werden (IF NOT EXISTS)
- Verification: SQL-Syntax-Check, Zeilencount plausibel (~150 Zeilen)
- Dependencies: none

#### MT-2: Migration auf Hetzner ausfuehren
- Goal: Schema auf dem Produktionsserver anlegen
- Files: keine Code-Dateien (Server-Aktion)
- Expected behavior: Alle Tabellen und Indizes existieren in der DB
- Verification: `\dt`, `\d cadences`, `\d cadence_steps`, etc.
- Dependencies: MT-1

#### MT-3: TypeScript-Types definieren
- Goal: Types fuer alle neuen Tabellen + erweiterte Spalten
- Files: `cockpit/src/types/cadence.ts`, `cockpit/src/types/email-tracking.ts`
- Expected behavior: Types matchen DB-Schema exakt. Bestehende Email-Types um neue Spalten erweitert.
- Verification: `npm run build` kompiliert ohne Fehler
- Dependencies: MT-1 (Schema als Referenz)
