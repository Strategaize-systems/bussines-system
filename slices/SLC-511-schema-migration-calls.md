# SLC-511 — Schema-Migration + Types (calls)

## Meta
- Feature: FEAT-511, FEAT-512, FEAT-513, FEAT-514
- Priority: Blocker
- Status: planned
- Created: 2026-04-22

## Goal

calls-Tabelle, TypeScript-Types, RLS-Policies, Supabase Storage Bucket. Basis-Slice fuer alle V5.1-Slices.

## Scope

- SQL-Migration: calls-Tabelle mit 22 Spalten, 6 Indexes, RLS, Grants
- TypeScript-Types fuer Call-Entity
- Supabase Storage Bucket "call-recordings" erstellen
- Server Actions Grundgeruest (createCall, updateCallStatus, getCallsByDeal)

## Out of Scope

- Asterisk-Container (SLC-512)
- SIP.js-Integration (SLC-513)
- Cron-Pipeline (SLC-514)
- SMAO-Adapter (SLC-515)

## Acceptance Criteria

- AC1: calls-Tabelle existiert in PostgreSQL mit allen 22 Spalten
- AC2: 6 Indexes sind angelegt (deal, contact, status, recording, direction, created_at)
- AC3: RLS-Policy fuer authenticated + service_role ist aktiv
- AC4: TypeScript Call-Type ist definiert und exportiert
- AC5: Supabase Storage Bucket "call-recordings" existiert
- AC6: createCall Server Action inserted korrekt in calls-Tabelle
- AC7: updateCallStatus Server Action updated status + Zeitstempel korrekt
- AC8: getCallsByDeal liefert Calls fuer einen Deal sortiert nach created_at DESC

## Dependencies

- Keine (Basis-Slice)

## Micro-Tasks

### MT-1: SQL-Migration erstellen
- Goal: calls-Tabelle mit allen Spalten, Indexes, RLS, Grants als SQL-Datei
- Files: `sql/migrations/020_v51_calls.sql`
- Expected behavior: Migration laeuft fehlerfrei auf PostgreSQL, alle Spalten/Indexes/Policies existieren
- Verification: `\d calls` zeigt korrekte Struktur, `\di` zeigt 6 Indexes
- Dependencies: none

### MT-2: Migration auf Hetzner ausfuehren
- Goal: calls-Tabelle auf Produktions-DB anlegen
- Files: keine Repo-Aenderung (SSH-Befehl)
- Expected behavior: Tabelle existiert auf Hetzner-DB
- Verification: `docker exec ... psql -U postgres -c "\d calls"`
- Dependencies: MT-1

### MT-3: Supabase Storage Bucket erstellen
- Goal: call-recordings Bucket in Supabase Storage anlegen
- Files: `sql/migrations/020_v51_calls.sql` (oder separater Storage-SQL)
- Expected behavior: Bucket existiert, Uploads moeglich
- Verification: Supabase Storage API call oder Studio-Check
- Dependencies: MT-2

### MT-4: TypeScript Types + Server Actions
- Goal: Call-Type definieren, CRUD Server Actions erstellen
- Files: `cockpit/src/lib/types/call.ts`, `cockpit/src/app/(app)/calls/actions.ts`
- Expected behavior: createCall, updateCallStatus, getCallsByDeal funktionieren korrekt
- Verification: TypeScript kompiliert fehlerfrei, Server Actions gegen DB getestet
- Dependencies: MT-2
