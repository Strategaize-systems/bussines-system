# SLC-301 — V3 Schema-Migration (MIG-005)

## Slice Info
- Feature: FEAT-307, FEAT-308, FEAT-309
- Version: V3
- Priority: Blocker
- Dependencies: keine
- Type: Backend (SQL)

## Goal
Alle V3-Schema-Aenderungen als eine Migration ausfuehren: 3 neue Tabellen, 2 Tabellen-Erweiterungen, Indexes, RLS auf neuen Tabellen, Grants.

## Scope

### Included
1. CREATE TABLE meetings (alle Felder laut ARCHITECTURE.md)
2. CREATE TABLE calendar_events (alle Felder laut ARCHITECTURE.md)
3. CREATE TABLE audit_log (alle Felder laut ARCHITECTURE.md)
4. ALTER TABLE activities ADD source_type, source_id + Index
5. ALTER TABLE profiles ADD role (default 'admin'), team
6. RLS ENABLE auf meetings, calendar_events, audit_log
7. RLS Policies: authenticated_full_access auf neuen Tabellen (operator_own_data kommt mit MIG-006)
8. GRANT ALL auf neue Tabellen fuer authenticated

### Excluded
- MIG-006 (RLS-Umbau bestehende Tabellen) — separater Slice oder spaeter
- Server Actions
- UI

## Backlog Items
- BL-316: Activities source_type + source_id
- BL-312 (partial): profiles.role + profiles.team
- BL-313 (partial): audit_log Tabelle
- BL-314 (partial): meetings Tabelle
- BL-315 (partial): calendar_events Tabelle

## Acceptance Criteria
1. Alle 3 Tabellen existieren mit korrektem Schema
2. Activities hat source_type + source_id Spalten
3. Profiles hat role + team Spalten
4. Alle Indexes sind angelegt
5. RLS ist aktiviert auf neuen Tabellen
6. Grants sind gesetzt
7. Bestehende Daten sind nicht beschaedigt

## Micro-Tasks

### MT-1: SQL-Migration vorbereiten
- Goal: Vollstaendiges MIG-005 SQL-Script erstellen und validieren
- Files: `/sql/MIG-005-v3-schema.sql`
- Expected behavior: Script enthaelt alle CREATE TABLE, ALTER TABLE, CREATE INDEX, RLS, GRANT Statements
- Verification: SQL-Syntax-Review, kein Tippfehler
- Dependencies: keine

### MT-2: Migration auf Hetzner ausfuehren
- Goal: MIG-005 auf Produktions-DB ausfuehren
- Files: —
- Expected behavior: Alle Tabellen/Spalten existieren, keine Fehler
- Verification: `\d meetings`, `\d calendar_events`, `\d audit_log`, `\d activities` (source_type pruefen), `\d profiles` (role pruefen)
- Dependencies: MT-1

### MT-3: Verifizierung + Doku
- Goal: Migration verifizieren und MIGRATIONS.md aktualisieren
- Files: `/docs/MIGRATIONS.md`
- Expected behavior: MIG-005 als ausgefuehrt dokumentiert
- Verification: Tabellen ansprechbar via Supabase REST
- Dependencies: MT-2

## Technical Notes
- SQL wird via `docker exec` auf Hetzner ausgefuehrt (psql)
- Bestehende Rows bleiben unveraendert (neue Spalten haben Defaults)
- RLS: Vorerst authenticated_full_access (einfacher Start), Umbau auf operator_own_data in MIG-006

## Risks
- Niedriges Risiko: Nur additive Aenderungen, kein Datenverlust moeglich
- Profiles Default 'admin': Bestehender User bleibt Admin
