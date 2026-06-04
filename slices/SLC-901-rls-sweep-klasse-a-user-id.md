# SLC-901 — V8.11 RLS-Sweep Klasse A (Per-User-Stammdaten, user_id-Spalte)

**Status:** planned
**Version:** V8.11
**Feature:** FEAT-911
**Backlog:** BL-500-901
**Created:** 2026-06-04
**Architecture:** docs/ARCHITECTURE.md V8.11-Addendum (Klasse A) + DEC-270
**Slice-Reihenfolge (DEC-265):** Sub-Slice 1 von 5 — etabliert Pattern + Test-Setup + Cron-Audit-Template
**Aufwand-Schaetzung:** ~3-4h Code-Side
**Migration:** MIG-045
**Worktree:** `v8-11-rls-sweep` (cumulative Single-Branch, Master-Merge erst nach SLC-905 + Gesamt-/qa V8.11)

## Goal

4 Per-User-Stammdaten-Tabellen mit eigener `user_id`-Spalte werden von der V1-`authenticated_full_access`-Policy auf das Owner-aware Klasse-A-Pattern umgestellt: `user_id = auth.uid() OR is_admin()` fuer SELECT + Mutate.

**Done-Gate-Baseline pre-SLC-901:** `list_tables_with_authenticated_full_access()` returns 41 Rows. Pflicht (existiert noch nicht): Sec-Audit-Helper-Function wird in SLC-902 MIG-046 deployed (DEC-274). Solange SLC-901 vor SLC-902 laeuft, wird Done-Gate-Check fuer SLC-901 als reine `pg_policies`-Direkt-Query gefahren (SQL inline in MT-6).

## Tabellen (4)

| Tabelle | user_id-Spalte | Cron/Worker-Schreiber |
|---|---|---|
| `user_settings` | NOT NULL | kein Cron — direct user-action via Server-Action |
| `kpi_snapshots` | NOT NULL | `/api/cron/kpi-aggregate` (analog V6) — schreibt pro User-Row via service_role |
| `goals` | nullable (Team-Goals haben user_id NULL?) → MT-1 Pre-Check Pflicht | kein Cron — Admin-Server-Action |
| `activity_kpi_targets` | NOT NULL | kein Cron — direct user-action |

**Pre-Check MT-1:** vor Migration-Apply per SSH `SELECT COUNT(*) FROM goals WHERE user_id IS NULL`. Wenn >0: Klassifizierung verfeinern (Team-Goals brauchen Klasse-B-Pattern). Default-Annahme: `goals.user_id NOT NULL` (Personal-Goals nur).

## Policy-Template (DEC-270)

```sql
-- Pro Tabelle <table> in {user_settings, kpi_snapshots, goals, activity_kpi_targets}
DROP POLICY IF EXISTS authenticated_full_access ON <table>;

CREATE POLICY <table>_select ON <table>
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_insert ON <table>
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_update ON <table>
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY <table>_delete ON <table>
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());
```

**Begruendung Klasse-A:** Per-User-Stammdaten sind privat. Admin-Bypass fuer Support-Cases ("warum sieht User X die KPI nicht"). Kein Teamlead-Pfad (eigene Settings sind privat, Team-Aggregate ueber Cron + service_role).

## Acceptance Criteria

- **AC-901-1:** Pre-Check `SELECT COUNT(*) FROM goals WHERE user_id IS NULL` = 0 (oder Klassifizierung wird explizit angepasst und in MT-1 dokumentiert).
- **AC-901-2:** MIG-045 idempotent applied auf Coolify-DB. Pre-Apply: 41 Rows in `pg_policies` mit `policyname LIKE '%_full_access'` UND `schemaname='public'`. Post-Apply: 37 Rows (41 minus 4).
- **AC-901-3:** Pro Tabelle 4 Policies (`<table>_select|_insert|_update|_delete`) vorhanden. Verifikation per `SELECT COUNT(*) FROM pg_policies WHERE tablename = '<table>' AND schemaname='public'` = 4.
- **AC-901-4:** Vitest `cockpit/__tests__/rls/v8-11-slc-901-rls-matrix.test.ts` GREEN: 4 Tabellen × 3 Rollen (admin/teamlead/member) × 4 Ops (SELECT/INSERT/UPDATE/DELETE) = **48 Tests**.
  - admin: alle 16 Ops allowed
  - teamlead: alle 16 Ops auf own-user-Rows allowed (teamlead-Pfad nicht aktiv — eigene Settings, kein team-bypass)
  - member-2 (foreign-uid): SELECT 0 Rows, INSERT RLS-Violation, UPDATE 0 affected, DELETE 0 affected
- **AC-901-5:** Cron-Code-Audit `/api/cron/kpi-aggregate` ergibt: schreibt mit `user_id = <profile-id>` korrekt via service_role. Dokumentation in `docs/AUDIT_CRON_V811.md` (neu, SLC-901 etabliert das File).
- **AC-901-6:** EXPLAIN ANALYZE 5 Queries (siehe `qa/SLC-901-perf-baseline.md`) erfuellt DEC-266-Threshold `max(100ms, 10x Pre-V8.11-Baseline)`. Bei Verletzung: Index-Audit + CREATE INDEX in Migration ergaenzen.
- **AC-901-7:** Pre-V8.11-Baseline pro Query gemessen vor MIG-045-Apply und in `qa/SLC-901-perf-baseline.md` dokumentiert.
- **AC-901-8:** Live-Smoke 3 Pfade auf business.strategaizetransition.com PASS:
  - admin loggt sich ein, sieht user_settings + kpi_snapshots + goals + activity_kpi_targets (eigene + alle anderen via Admin-Bypass)
  - teamlead loggt sich ein, sieht nur eigene Rows
  - member-2 SELECT auf own → returns own Rows, member-2 versucht SELECT auf member-1-Rows → 0 Rows
- **AC-901-9:** Records-Sync: `slices/INDEX.md` SLC-901 status = `done`, `planning/backlog.json` BL-500-901 status = `done`, `docs/STATE.md` Current Focus → "V8.11 SLC-902 Klasse B (Templates)", `docs/MIGRATIONS.md` MIG-045-Eintrag, RPT-583 (Code-Side) + RPT-584 (Live-Smoke).
- **AC-901-10:** Done-Gate-Check post-SLC-901: 37 Tabellen mit `*_full_access`-Policy verbleibend (41 - 4 = 37). Per direkter `pg_policies`-Query (Sec-Audit-Helper-Function wird erst in SLC-902 deployed).

## Micro-Tasks

### MT-1: Pre-Check Schema-Verify + Pre-V8.11-Baseline
- **Goal:** Verifizieren dass alle 4 Tabellen die erwartete `user_id`-Spalte haben, dass `goals.user_id` keine NULL-Rows hat, und 5 typische Queries pre-Migration messen.
- **Files:** `qa/SLC-901-perf-baseline.md` (neu).
- **Expected behavior:** Pre-Migration-SQL-Inspection via SSH:
  ```sql
  -- Schema-Check
  SELECT table_name, column_name, is_nullable FROM information_schema.columns
   WHERE table_schema='public' AND table_name IN ('user_settings','kpi_snapshots','goals','activity_kpi_targets')
     AND column_name='user_id';
  -- Null-Check
  SELECT COUNT(*) FROM goals WHERE user_id IS NULL;
  -- Baseline-Queries (mit existierenden Daten)
  EXPLAIN ANALYZE SELECT * FROM user_settings WHERE user_id = '<test-uuid>';
  EXPLAIN ANALYZE SELECT * FROM kpi_snapshots WHERE user_id = '<test-uuid>' ORDER BY snapshot_date DESC LIMIT 30;
  EXPLAIN ANALYZE SELECT * FROM goals WHERE user_id = '<test-uuid>' AND status = 'active';
  EXPLAIN ANALYZE SELECT * FROM activity_kpi_targets WHERE user_id = '<test-uuid>';
  EXPLAIN ANALYZE SELECT COUNT(*) FROM kpi_snapshots WHERE created_at >= NOW() - INTERVAL '30 days';
  ```
- **Verification:** `qa/SLC-901-perf-baseline.md` enthaelt 5 Pre-V8.11-Baseline-Werte (ms + plan-Hash). `goals.user_id NULL`-Count dokumentiert.
- **Dependencies:** keine

### MT-2: MIG-045 Migration-Datei + DO-Loop-Pattern
- **Goal:** Idempotente Migration-Datei mit DO-Block-Loop ueber 4 Tabellen-Array, der Old-Policy droppt und 4 neue Policies pro Tabelle anlegt.
- **Files:** `sql/migrations/045_v8_11_slc_901_klasse_a.sql` (neu).
- **Expected behavior:** Migration-Body:
  ```sql
  -- Idempotent: drop existing _full_access + create 4 policies per table
  DO $$
  DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['user_settings','kpi_snapshots','goals','activity_kpi_targets'];
  BEGIN
    FOREACH t IN ARRAY tables LOOP
      EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', t, t);
      EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin())', t, t);
      EXECUTE format('CREATE POLICY %I_insert ON %I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin())', t, t);
      EXECUTE format('CREATE POLICY %I_update ON %I FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin())', t, t);
      EXECUTE format('CREATE POLICY %I_delete ON %I FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin())', t, t);
    END LOOP;
  END $$;
  ```
  Plus Helper-Existenz-Guard:
  ```sql
  DO $$
  DECLARE helper_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO helper_count
      FROM pg_proc
     WHERE proname IN ('is_admin','is_teamlead','get_my_team_id','can_see_owner');
    IF helper_count < 4 THEN
      RAISE EXCEPTION 'V7-Helper-Functions fehlen, MIG-045 abgebrochen';
    END IF;
  END $$;
  ```
- **Verification:** Datei existiert. Re-Apply (zweimal hintereinander) ohne Fehler. Post-Apply `SELECT COUNT(*) FROM pg_policies WHERE tablename = ANY(ARRAY['user_settings','kpi_snapshots','goals','activity_kpi_targets']) AND schemaname='public'` = 16.
- **Dependencies:** MT-1

### MT-3: Vitest RLS-Matrix-File (4×3×4 = 48 Tests)
- **Goal:** Test-File analog `cockpit/__tests__/rls/v7-rls-matrix.test.ts` (DEC-268). Pattern-Quelle 1:1 wiederverwenden mit Adapter fuer Klasse A (kein owner_user_id, sondern user_id).
- **Files:** `cockpit/__tests__/rls/v8-11-slc-901-rls-matrix.test.ts` (neu).
- **Expected behavior:**
  - Boundary-Pattern wie V7-Matrix: admin/teamlead/member-2 sessioniert via `SET LOCAL request.jwt.claim.sub`.
  - Fixture-Lookup: 1 Row pro Tabelle mit `user_id = TEST_MEMBER_1` (Seed-Pflicht).
  - **Wichtig: Klasse-A hat KEIN teamlead-Pfad-Allow** — teamlead-Test erwartet `denied` (0 Rows / RLS-Violation), nicht `allowed`. Das weicht vom V7-Pattern ab und ist explizit per DEC-270.
  - 48 Tests = 4 Tabellen × (admin=allowed × 4 ops + teamlead=denied × 4 ops + member-2=denied × 4 ops).
  - SAVEPOINT-Pattern fuer expected INSERT-Rejections (per `coolify-test-setup.md`).
- **Verification:** Vitest gegen Coolify-DB-Sidecar (node:22 im business-net) GREEN 48/48 lokal + im Sidecar.
- **Dependencies:** MT-2

### MT-4: Cron-Code-Audit Klasse-A-Schreiber
- **Goal:** Verifizieren dass alle Cron/Worker, die in Klasse-A-Tabellen schreiben, `user_id` korrekt aus Parent-Daten setzen.
- **Files:** `docs/AUDIT_CRON_V811.md` (neu, SLC-901 etabliert das File mit Sektion "Klasse A").
- **Expected behavior:** `grep -rn "createAdminClient" cockpit/src/app/api/cron/` + `grep -rn "from('kpi_snapshots'|'goals'|'user_settings'|'activity_kpi_targets')" cockpit/src/`. Pro Treffer: pruefen ob `user_id`-Set korrekt aus Parent (profile.id). Bekannte Schreiber-Liste:
  - `/api/cron/kpi-aggregate` (oder Aequivalent in V6) — pro Profile-Loop, user_id = profile.id setzen
  - `/api/cron/goal-progress-recalc` (falls existiert)
  - Server-Actions `cockpit/src/app/(app)/performance/actions.ts`
- **Verification:** `docs/AUDIT_CRON_V811.md` enthaelt Klasse-A-Section mit:
  - Liste aller Treffer
  - Pro Treffer: `user_id`-Set-Quelle (z.B. "from profiles.id loop")
  - Status `OK` oder `FIX-NEEDED` mit kurzer Code-Aenderung
- **Dependencies:** MT-2

### MT-5: Post-MIG-045 EXPLAIN ANALYZE Re-Run + Threshold-Check
- **Goal:** 5 Queries aus MT-1 re-messen post-MIG-045. Vergleich mit Pre-V8.11-Baseline. DEC-266-Threshold pruefen.
- **Files:** `qa/SLC-901-perf-baseline.md` (Erweiterung Sektion "Post-V8.11").
- **Expected behavior:** Pro Query: ms-Wert + plan-Hash + Faktor zur Pre-V8.11-Baseline. Wenn `max(absolut > 100ms, relativ > 10x)`: Index-Audit-Sektion ergaenzen + Index-DDL als Patch ans Ende MIG-045 anhaengen + erneut applien.
- **Verification:** `qa/SLC-901-perf-baseline.md` zeigt 5 Post-Werte. Keine Threshold-Violation. Bei Violation: dokumentierter Fix in MIG-045.
- **Dependencies:** MT-2, MT-3 (Tests muessen vor Perf-Re-Run GREEN sein)

### MT-6: Done-Gate-Check + Records-Sync + Live-Smoke + RPT-583/RPT-584
- **Goal:** Done-Gate via `pg_policies`-Direkt-Query (Sec-Audit-Helper-Function existiert noch nicht — kommt in SLC-902 MIG-046 per DEC-274). Records-Sync. Live-Smoke 3 Pfade. 2 Reports.
- **Files:**
  - `slices/INDEX.md` (Status SLC-901 → done)
  - `planning/backlog.json` (BL-500-901 → done)
  - `docs/STATE.md` (Current Focus → "V8.11 SLC-902 Klasse B")
  - `docs/MIGRATIONS.md` (MIG-045-Eintrag mit Date/Scope/Rollback-Notes)
  - `reports/RPT-583.md` (SLC-901 Code-Side + /qa)
  - `reports/RPT-584.md` (SLC-901 Live-Smoke)
- **Expected behavior:**
  - Done-Gate-SQL: `SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND (policyname = 'authenticated_full_access' OR policyname LIKE '%_full_access')` = 37.
  - Live-Smoke 3 Pfade auf business.strategaizetransition.com (Playwright-MCP autonom per `feedback_playwright_live_smoke_autonomous.md`):
    1. admin: SELECT eigene + andere user_settings (allowed via Admin-Bypass)
    2. teamlead: SELECT eigene (1+) + member-2-Rows (0)
    3. member-2: SELECT eigene (1+), INSERT eigene (allowed), UPDATE member-1 (0 affected)
  - Records updated per IMP-950 Defense.
- **Verification:** Done-Gate = 37. Records-Files match Cockpit-Parse. Live-Smoke 3/3 PASS-LIVE. RPT-583 + RPT-584 in `/reports/` mit YAML-Frontmatter.
- **Dependencies:** MT-2, MT-3, MT-4, MT-5

## Pre-Conditions

- V8.13 SLC-895 ISSUE-089 GoTrue signInWithPassword fix LIVE (per `project_bs_v813_released_post_launch_t3h_pass_2026_06_03`-Memory) — sonst kein Live-Smoke moeglich.
- V8.10 SLC-893 `(auth.uid())::text = (storage.foldername(name))[1]` Policy LIVE (Storage-Pfad-Konflikt mit SLC-903 documents-Tabelle ist Naming-only, kein Daten-Konflikt).
- V7-Helper-Functions `is_admin()`, `is_teamlead()`, `get_my_team_id()`, `can_see_owner()` LIVE (A-V8.11-1).
- Seed-Script `npm run seed:multi-user` LIVE-applied auf Coolify-DB (per V7.2 SLC-721 ISSUE-073 — IMP-Reuse).
- Worktree `v8-11-rls-sweep` ist gecheckt aus `master` HEAD `bb3c8f9` (V8.13-Stand 2026-06-03).

## Pattern-Reuse (BLOCKING per general.md Rule 5)

- **MT-2 Migration-Pattern:** wiederverwendet aus `sql/migrations/035_v7_rls_switch.sql` (DO-Loop-Pattern). Header-Kommentar Pflicht.
- **MT-3 Test-Pattern:** wiederverwendet aus `cockpit/__tests__/rls/v7-rls-matrix.test.ts` (DEC-268). Header-Kommentar Pflicht. **Klasse-A-Drift:** teamlead-Expected = `denied` statt `allowed` (V7 erlaubt teamlead-bypass, V8.11 Klasse A nicht). Drift im Kommentar dokumentieren.
- **MT-3 Test-Sidecar:** `coolify-test-setup.md` 1:1 (node:22, business-net, SAVEPOINT).
- **MT-2 Migration-Apply:** `sql-migration-hetzner.md` 1:1 (SSH+base64+psql als postgres-Superuser).

## Risks / Assumptions

- **R-901-1 (Low):** `goals.user_id` koennte NULL-Rows enthalten (Team-Goals). Mitigation: MT-1 Pre-Check, bei NULL-Rows Klassifizierung anpassen oder NULL-Rows zu owner via Default-Founder-UUID nachpatchen.
- **R-901-2 (Low):** Performance-Drop unwahrscheinlich (user_id-Pfad ist Standard-Postgres-RLS, kein JOIN). Default-Index auf `(user_id)` pro Tabelle sollte vorhanden sein.
- **A-901-1:** Cron `/api/cron/kpi-aggregate` (oder Aequivalent) existiert und setzt user_id korrekt. Verifikation per MT-4 Audit.

## Out of Scope

- Multi-Tenant-V9 `team_id`-Filter (kommt spaeter, V8.11 forward-compatible)
- Team-Goals (vermutlich nicht in V8.11 — falls doch, MT-1 entscheidet)
- KI-Coaching-Server-Action-Pfade fuer kpi_snapshots (separater Audit in SLC-902 falls relevant)

## Related

- `docs/ARCHITECTURE.md` V8.11-Addendum Klasse A
- `docs/DECISIONS.md` DEC-270, DEC-269, DEC-266, DEC-268
- `features/FEAT-911-v811-rls-sweep.md`
- Pattern-Quelle Migration: `sql/migrations/035_v7_rls_switch.sql`
- Pattern-Quelle Test: `cockpit/__tests__/rls/v7-rls-matrix.test.ts`
- Rule: `.claude/rules/sql-migration-hetzner.md`
- Rule: `.claude/rules/coolify-test-setup.md`
- Rule: `.claude/rules/strategaize-pattern-reuse.md`
- Memory: `feedback_playwright_live_smoke_autonomous`
- Memory: `feedback_module_access_test_setup_explicit_user_module_access`

## Next Slice

SLC-902 — Klasse B Templates (11 Tabellen + Sec-Audit-Helper-Function-Deploy).
