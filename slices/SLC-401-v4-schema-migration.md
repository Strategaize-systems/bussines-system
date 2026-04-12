# SLC-401 — V4 Schema-Migration (MIG-010)

## Slice Info
- Feature: FEAT-405, FEAT-407, FEAT-408, FEAT-406
- Priority: Blocker
- Delivery Mode: internal-tool

## Goal
5 neue DB-Tabellen erstellen (email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback) + calendar_events erweitern. RLS + Grants + Indizes. Dependencies installieren (imapflow, mailparser).

## Scope
- SQL-Migration erstellen (MIG-010)
- RLS Policies fuer neue Tabellen
- Grants fuer authenticated
- Dependencies: imapflow, mailparser installieren
- TypeScript Types fuer neue Tabellen

## Out of Scope
- IMAP-Sync-Logik (SLC-402)
- UI-Aenderungen (spaetere Slices)
- Cal.com Docker-Setup (SLC-407)

### Micro-Tasks

#### MT-1: SQL-Migrationsdatei erstellen
- Goal: MIG-010 SQL-File mit allen 5 neuen Tabellen + calendar_events ALTER
- Files: `cockpit/sql/10_v4_migration.sql`
- Expected behavior: SQL laeuft fehlerfrei auf Hetzner PostgreSQL
- Verification: SQL-Syntax-Check, manuelle Ausfuehrung auf Hetzner
- Dependencies: none

#### MT-2: Dependencies installieren
- Goal: imapflow + mailparser als Dependencies hinzufuegen
- Files: `cockpit/package.json`
- Expected behavior: npm install laeuft ohne Fehler
- Verification: npm install && npm run build
- Dependencies: none

#### MT-3: TypeScript Types definieren
- Goal: Types fuer email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback
- Files: `cockpit/src/types/email.ts`, `cockpit/src/types/ai-queue.ts`
- Expected behavior: Types matchen DB-Schema exakt
- Verification: TypeScript Compilation ohne Fehler
- Dependencies: MT-1

## Acceptance Criteria
1. Alle 5 Tabellen existieren in PostgreSQL
2. calendar_events hat 4 neue Spalten (source, external_id, sync_status, booking_link)
3. RLS ist auf allen neuen Tabellen aktiviert
4. imapflow + mailparser sind installiert
5. TypeScript Types sind definiert
6. Build laeuft ohne Fehler
