# SLC-701 — Backend-Foundation (3-Phasen-Migration + RLS-Helper-Functions)

## Metadata
- **Slice ID:** SLC-701
- **Version:** V7
- **Feature:** FEAT-502 (Multi-User-Foundation)
- **Status:** planned
- **Priority:** Blocker (Foundation, MUSS zuerst — alle anderen V7-Slices bauen drauf auf)
- **Created:** 2026-05-12
- **Estimated Effort:** ~6-8h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (memory `feedback_slice_deploy_procedure` — direkt auf main + Coolify-Redeploy)
- **Architecture:** DEC-181..184, DEC-193, DEC-195, MIG-033/034/035
- **Reihenfolge-Pflicht:** **MUSS zuerst** — SLC-702 nutzt `profiles.role` CHECK-Constraint + `team_id` FK, SLC-704 nutzt `owner_user_id`-Spalten, SLC-705/706 nutzen RLS-Helper-Functions

## Goal

Datenbank-Fundament fuer Multi-User auf Hetzner ausrollen: Schema-Erweiterung (MIG-033) + Bestandsdaten-Backfill (MIG-034) + RLS-Switch (MIG-035) in 3 sicheren Phasen, jede mit Backout-Test. Plus Seed-Script fuer Performance-Smoke und parametrisierter Vitest-Generator fuer 96 Cross-Owner-Leak-Tests. Nach SLC-701 sind alle Tabellen owner-aware und RLS aktiv, aber der Anwendungs-Code nutzt es noch nicht (V6.6-Verhalten bleibt durch Admin-Default funktional, weil User Immo nach Backfill in allen Records Owner ist).

## Scope

**In Scope:**
- `sql/migrations/033_v7_schema.sql` (NEU) — Phase A: teams-Tabelle, profiles.team_id+role-CHECK, owner_user_id auf 8 Kerntabellen, Indizes, audit_log.view_as_target_user_id
- `sql/migrations/034_v7_backfill.sql` (NEU) — Phase B: Default-Team "Strategaize", Backfill aller owner_user_id auf User Immo, Verifikation-COUNT muss 0 sein
- `sql/migrations/035_v7_rls_switch.sql` (NEU) — Phase C: Helper-SQL-Functions (is_admin/is_teamlead/get_my_team_id/can_see_owner) + neue Policies pro Tabelle + Drop alter authenticated_full_access-Policies
- `cockpit/scripts/seed-multi-user.ts` (NEU) — Seed-Script fuer Test-Team mit 5 Member + 100 Deals + 500 Activities pro Member (gegen TEST_DATABASE_URL, nicht Production)
- `cockpit/__tests__/rls/v7-rls-matrix.test.ts` (NEU) — parametrisierter Vitest-Generator fuer 96 Cross-Owner-Leak-Tests (8 Tabellen × 3 Rollen × 4 Operationen, mit SAVEPOINT-Pattern fuer expected-Permission-Denials per coolify-test-setup.md)
- `cockpit/__tests__/rls/helper-functions.test.ts` (NEU) — Vitest fuer is_admin/is_teamlead/can_see_owner-Pfade
- `cockpit/scripts/pgbench-helper-smoke.sh` (NEU) — PgBench-Skript zum Messen von 1000-Row-Listing mit Helper-Function-Call (OTQ 3)
- `docs/MIGRATIONS.md` Verifikations-Snippets fuer Phase A/B/C
- `package.json` Scripts-Eintrag `seed:multi-user`

**Out of Scope:**
- Bestehende Server Actions owner-aware machen → SLC-704
- Sidebar-Refactor → SLC-702
- `/settings/team` UI → SLC-703
- `/team` Aggregat-Cockpit → SLC-705
- profiles.team TEXT physisch droppen (deprecated, Cleanup in spaeterer V7.x-MIG)

## Acceptance Criteria

**AC1 (MIG-033 Schema):** Nach Apply auf Hetzner existieren `teams`-Tabelle, `profiles.team_id UUID FK`, `profiles.role CHECK (admin|teamlead|member)`, `owner_user_id UUID NULL` auf allen 8 Kerntabellen, `idx_<table>_owner_user_id` pro Tabelle, `audit_log.view_as_target_user_id UUID NULL`. Verifikation via `\d <table>` zeigt neue Spalten + Indizes.

**AC2 (MIG-034 Backfill):** Nach Apply gibt es genau 1 Team-Row `Strategaize`, User Immo hat `team_id` gesetzt, `SELECT COUNT(*) FROM <table> WHERE owner_user_id IS NULL` returnt 0 fuer alle 8 Kerntabellen. Audit-Eintrag `v7_backfill_complete` mit `affected_rows`-Sum existiert.

**AC3 (MIG-035 RLS-Switch):** Nach Apply existieren 4 SQL-Helper-Functions (is_admin, is_teamlead, get_my_team_id, can_see_owner) als `LANGUAGE SQL STABLE SECURITY DEFINER`-Functions (Permission-Decoupling — Helper-Functions duerfen profiles lesen, ohne dass der aufrufende User direkte SELECT-Policy auf profiles braucht; siehe MIG-035-Snippet in MIGRATIONS.md Z.680-683). GRANT EXECUTE an `authenticated`. Pro Kerntabelle sind 4 neue Policies (SELECT/INSERT/UPDATE/DELETE) aktiv, alte `authenticated_full_access` ist gedropped. Verifikation via `\d+ <table>` zeigt Policies; `\df+ is_admin` zeigt `SECURITY DEFINER`-Marker.

**AC4 (Backout pro Phase):** Jede MIG hat einen Rollback-Snippet in MIGRATIONS.md, der manuell auf Hetzner getestet wurde: Phase A rollback droppt teams + Spalten, Phase B rollback setzt owner_user_id zurueck auf NULL, Phase C rollback re-aktiviert `authenticated_full_access`-Policy. Mindestens 1 vollstaendiger Rollback-Test (Apply MIG-033 → Rollback → Re-Apply) ist dokumentiert.

**AC5 (Cross-Owner-Leak-Tests):** Vitest-Generator produziert 96 Tests (8 Tabellen × 3 Rollen × 4 Operationen). Alle Tests laufen gegen Coolify-DB via node:20-Container im `<resource>_business-net`-Netz (memory `reference_coolify_test_setup`). SAVEPOINT-Pattern fuer 3-Rollen × 8-Tabellen × Expected-Deny-Operations = 60 Permission-Denial-Cases. 36 Allowed-Cases verifizieren Owner-Match.

**AC6 (PgBench Helper-Smoke):** `scripts/pgbench-helper-smoke.sh` misst 1000-Row-Listing mit `can_see_owner()`-Aufruf. Ergebnis muss <100ms p95 fuer Member-Role auf 1000 Activities sein. Falls verletzt: OTQ 3-Fallback dokumentieren (z.B. `SECURITY DEFINER` setzen oder Helper als inline-Subquery).

**AC7 (Seed-Script):** `npm run seed:multi-user` erzeugt gegen TEST_DATABASE_URL: 1 Team `Test-Team`, 5 Member-Profiles + 1 Teamlead-Profile, je 100 Deals + 500 Activities + 50 Companies + 200 Contacts mit `owner_user_id` zufaellig auf 5 Member verteilt. Idempotent (zweiter Run wirft keinen Fehler, ueberschreibt). Wird in SLC-705 fuer Aggregat-Performance-Smoke und in SLC-706 fuer Drilldown-Tests genutzt.

**AC8 (TSC + Vitest):** TSC `npx tsc --noEmit` clean. `npm run test` PASS inkl. 96 RLS-Matrix-Tests + Helper-Function-Tests. Bestehende 650 V6.6-Tests bleiben gruen (keine Regression durch RLS-Aenderung).

**AC9 (Production-Apply):** Alle 3 MIGs idempotent applied auf Hetzner via `docker exec -i <db-container> psql -U postgres -d postgres < /tmp/0XX.sql` (memory `feedback_sql_on_hetzner`). Post-Apply COUNT-Smokes PASS. Coolify-Redeploy NICHT vor Slice-Ende (Code nutzt RLS noch nicht, V6.6-Verhalten bleibt funktional dank Admin-Default).

## Reuse

- `reference_coolify_test_setup.md` Pattern fuer Vitest gegen Coolify-DB (node:20, SAVEPOINT, TEST_DATABASE_URL)
- `feedback_sql_on_hetzner.md` Pattern fuer SQL-Migration-Apply (base64 → /tmp → psql -U postgres)
- Bestehende RLS-Policies in `sql/02_rls.sql` und `sql/08_v3_schema.sql` (Reference-Pattern fuer authenticated_full_access)
- `audit_log`-Tabelle (V3-Bestand, neue Spalte additive)
- `pg_dump`-Schema-Snapshots aus V6.6 als Pre-Migration-Backup-Punkt

## Risks

- **R1 — RLS-Backfill-Drift:** Wenn auch nur 1 Row ohne owner_user_id bleibt, wird sie nach MIG-035 fuer alle ausser Admin unsichtbar. **Mitigation:** AC2 schreibt zwingend COUNT(*)=0-Verifikation vor MIG-035-Apply. Falls Drift entdeckt: Re-Run MIG-034 mit erweitertem WHERE-Clause.
- **R2 — Helper-Function-Performance:** `is_admin()` wird in jeder RLS-Policy aufgerufen. Bei 1000-Row-Listing 1000× evaluiert? **Mitigation:** STABLE-Markierung + Postgres-Statement-Cache + PgBench-Smoke (AC6). Fallback: SECURITY DEFINER setzen oder Inline-Subquery.
- **R3 — Bulk-Reassign-SET-LOCAL-ROLE:** Server Action braucht `postgres`-Rolle fuer RLS-Bypass. **Mitigation:** Connection-Pool-Konfiguration pruefen (`role: 'postgres'` per pg-Connection-Option) — eigentlich aber Implementation-Detail von SLC-707, hier nur Vorbereitung.
- **R4 — Phase-C-Scheitert-Recovery:** Wenn MIG-035 auf Hetzner kaputtgeht, sind Daten gebackfilled aber kein RLS aktiv. **Mitigation:** Phase A+B sind Code-rueckwaerts-kompatibel (Spalten existieren, Code ignoriert sie). Re-Apply MIG-035 nach Fix. Verifizierung via Smoke-Connect mit teamlead-Test-User.
- **R5 — Coolify-DB-Container-Restart waehrend Apply:** Lange-laufende UPDATE-Statements auf Bestandsdaten koennen abbrechen. **Mitigation:** Bestandsdaten klein (<5000 Rows pro Tabelle in Production-Instanz Immo), Apply-Dauer geschaetzt <30 Sekunden total. Falls Container-Restart: Re-Apply (idempotent).

## Verification Strategy

- **Pre:** `pg_dump -s` Schema-Snapshot von Hetzner-DB als Backup-Punkt. Verifizieren dass 8 Kerntabellen-Schema mit Architecture-Liste matched.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** 3 Apply-Phasen auf Hetzner mit Verifikations-Queries nach jeder Phase + 96 RLS-Matrix-Tests + PgBench-Smoke + Seed-Script-Idempotenz-Test
- **QA-Pflicht (nach Slice):** /qa Pflicht — verifiziert COUNT=0 ueber 8 Tabellen, laeuft Vitest gegen Coolify-DB, prueft `\d` Tabellen-Definitionen, fuehrt PgBench-Smoke aus, dokumentiert Helper-Function-Performance-Messung in RPT.

---

## Micro-Tasks

### MT-1: Seed-Script
- Goal: `npm run seed:multi-user` Script fuer Performance-Smoke-Daten.
- Files: `cockpit/scripts/seed-multi-user.ts` (NEU), `cockpit/package.json` (Scripts-Eintrag)
- Expected behavior: Idempotenter TS-Script gegen `TEST_DATABASE_URL`, erzeugt 1 Team + 5 Member-Profiles + 1 Teamlead-Profile + 100 Deals + 500 Activities + 50 Companies + 200 Contacts mit zufaelliger Owner-Verteilung. Output: "Seeded X rows in Yms". Cleanup-Mode (`npm run seed:multi-user -- --reset`) loescht alle vorhandenen `seed_<uuid>`-prefixed Records.
- Verification: `npm run seed:multi-user` 2x hintereinander, beide PASS, COUNT identisch.
- Dependencies: none (MIG-033 muss noch nicht appliedet sein, weil Seed gegen Schema-Stand nach MIG-033 laeuft)

### MT-2: MIG-033 Apply Phase A
- Goal: Schema-Erweiterung auf Hetzner.
- Files: `sql/migrations/033_v7_schema.sql` (NEU), `docs/MIGRATIONS.md` (Rollback-Snippet ergaenzen)
- Expected behavior: SQL-File mit additive ALTER-Statements (teams-Tabelle, profiles.team_id+role-CHECK, owner_user_id auf 8 Tabellen, Indizes, audit_log.view_as_target_user_id). Idempotent via `IF NOT EXISTS`. Apply via base64 → /tmp → `psql -U postgres -d postgres < /tmp/033.sql`. Verifikation: `\d teams`, `\d profiles`, `\d deals` zeigt neue Spalten.
- Verification: Post-Apply COUNT-Smoke: `SELECT COUNT(*) FROM teams = 0`, `SELECT COUNT(*) FROM profiles WHERE team_id IS NULL > 0` (pre-Backfill).
- Dependencies: MT-1

### MT-3: MIG-034 Apply Phase B
- Goal: Bestandsdaten-Backfill auf Hetzner.
- Files: `sql/migrations/034_v7_backfill.sql` (NEU), `docs/MIGRATIONS.md` (Rollback-Snippet ergaenzen)
- Expected behavior: INSERT Default-Team `Strategaize`, UPDATE profiles SET team_id, UPDATE alle 8 Kerntabellen SET owner_user_id = Admin-UUID WHERE owner_user_id IS NULL. Verifikations-Block am Ende: `DO $$ DECLARE c INT; BEGIN FOR t IN (...) LOOP SELECT COUNT(*) INTO c FROM <table> WHERE owner_user_id IS NULL; IF c > 0 THEN RAISE EXCEPTION '%: %', t, c; END IF; END LOOP; END $$;`. Audit-Insert `v7_backfill_complete` mit `payload->affected_rows`.
- Verification: Post-Apply 8× `SELECT COUNT(*) FROM <table> WHERE owner_user_id IS NULL` = 0. Audit-Log enthaelt `v7_backfill_complete`-Event.
- Dependencies: MT-2

### MT-4: RLS-Helper-Functions (Pre-MIG-035-Standalone)
- Goal: 4 Helper-Functions getrennt von Policy-Switch testen.
- Files: `cockpit/__tests__/rls/helper-functions.test.ts` (NEU)
- Expected behavior: SQL-Block fuer Helper-Functions vorbereiten (wird in MIG-035 mitausgerollt), aber separat als Vitest gegen Coolify-DB testen. Mit `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<test-user-id>'`. Tests: `SELECT is_admin()`, `SELECT is_teamlead()`, `SELECT get_my_team_id()`, `SELECT can_see_owner('<other-user-uuid>')` mit erwarteten BOOLEAN-Returns fuer 3 Test-Profiles (admin/teamlead/member).
- Verification: 12 Tests (4 Functions × 3 Rollen) PASS gegen Test-Team.
- Dependencies: MT-3 (Backfill muss durch, sonst keine validen Profiles vorhanden)

### MT-5: MIG-035 Apply Phase C + Policies
- Goal: RLS-Switch + alle 4 Policies pro Kerntabelle.
- Files: `sql/migrations/035_v7_rls_switch.sql` (NEU), `docs/MIGRATIONS.md` (Rollback-Snippet)
- Expected behavior: Helper-Functions CREATE OR REPLACE, dann pro 8 Kerntabellen: DROP alte `authenticated_full_access`-Policy + CREATE neue 4 Policies (SELECT/INSERT/UPDATE/DELETE). Verifikation-Block: `SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN (...)`.
- Verification: Post-Apply: 8 × 4 = 32 Policies aktiv. `\d+ deals` zeigt 4 neue Policies, keine `authenticated_full_access` mehr.
- Dependencies: MT-3, MT-4

### MT-6: Cross-Owner-Leak-Test-Generator (96 Tests)
- Goal: Parametrisierter Vitest-Generator fuer 8 Tabellen × 3 Rollen × 4 Operationen.
- Files: `cockpit/__tests__/rls/v7-rls-matrix.test.ts` (NEU)
- Expected behavior: `describe.each([...8-Tabellen]).each([admin, teamlead, member]).each([SELECT, INSERT, UPDATE, DELETE])` Pattern. Pro Test: BEGIN, SET LOCAL ROLE authenticated + JWT-Claim, SAVEPOINT, Operation gegen Test-Daten, expected: Allowed-or-Denied basierend auf RLS-Matrix-Tabelle (Architecture-Spec). ROLLBACK TO SAVEPOINT bei Deny-Cases. 36 Allowed-Cases + 60 Deny-Cases = 96 Tests total.
- Verification: `npm run test v7-rls-matrix` 96/96 PASS gegen Coolify-DB via node:20.
- Dependencies: MT-5

### MT-7: PgBench Helper-Performance-Smoke
- Goal: Measurement von `can_see_owner()`-Cost auf 1000-Row-Listing.
- Files: `cockpit/scripts/pgbench-helper-smoke.sh` (NEU), Output in RPT-Eintrag
- Expected behavior: `pgbench`-Script connected mit Test-Member-Auth, fuehrt 1000× `SELECT * FROM activities WHERE owner_user_id != auth.uid() LIMIT 1` aus, misst p50/p95/p99. Erwartung: p95 <100ms fuer Member-Role auf 1000 Rows. Falls verletzt: Fallback-Empfehlung in RPT (SECURITY DEFINER setzen).
- Verification: Script-Output zeigt p95-Latenz, in Slice-RPT dokumentiert.
- Dependencies: MT-5

### MT-8: Backout-Test (mindestens 1 Phase end-to-end)
- Goal: Reversibilitaet von mindestens 1 MIG end-to-end auf Hetzner verifizieren.
- Files: Rollback-Snippets in `docs/MIGRATIONS.md`
- Expected behavior: Manueller Test: Apply MIG-033 → Apply Rollback-Snippet MIG-033 → Verifikation Schema zurueck → Re-Apply MIG-033. Dokumentation der Schritte als Cookbook in MIGRATIONS.md. (Phase B + C werden NICHT vollstaendig rollbackt, weil Backfill irreversible Daten produziert — Rollback-Snippets existieren aber als Recovery-Anleitung.)
- Verification: Cookbook-Eintrag mit Schritt-fuer-Schritt-Befehlen, ausgefuehrt + dokumentiert.
- Dependencies: MT-2

---

## Open Technical Questions Answered (aus Architecture)

- **OTQ 1 (Seed-Script):** AC7 + MT-1. Seed-Script erzeugt 5 Member × 100 Deals × 500 Activities deterministisch.
- **OTQ 2 (Migration-Reihenfolge):** Phase A → B → C, jede idempotent, Backout-Snippet pro Phase, AC4 + MT-8.
- **OTQ 3 (Helper-Performance):** STABLE-Markierung + PgBench-Smoke in AC6 + MT-7.
- **OTQ 8 (Cross-Owner-Tests):** Parametrisierter Vitest-Generator 96 Tests, AC5 + MT-6.
- **OTQ 9 (Profile-Delete):** Per DEC-193 Hard-Lock bei lebendem Owner — Implementierung in SLC-703 (MT-4 dort). MIG-033 setzt `ON DELETE SET NULL` als FK-Default fuer audit_log-Trail-Behalt.

## QA-Fokus

- COUNT-Smoke pro Tabelle: 0 NULL-Owner nach MIG-034
- 96 RLS-Matrix-Tests PASS
- Helper-Function-Performance-Messung dokumentiert
- Bestehende 650 V6.6-Vitest-Tests bleiben gruen (keine Regression)
- TSC + Build clean
- Backout-Cookbook nachvollziehbar

## Recommended Next Step nach SLC-701

**/qa SLC-701** — verifiziert alle 9 AC, fuehrt 96 RLS-Tests aus, dokumentiert PgBench-Ergebnis. Bei PASS: Coolify-Redeploy NICHT noetig (Code aendert sich nicht in SLC-701). Direkt weiter mit **/backend + /frontend SLC-702** (Frontend-Foundation).
