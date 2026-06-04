-- ============================================================================
-- MIG-045 — V8.11 SLC-901 RLS-Sweep Klasse A (Per-User-Stammdaten)
-- ============================================================================
-- Datum: 2026-06-04 (Apply via SLC-901 MT-2 NACH MIG-035 + V7-Helper LIVE)
-- Idempotent: ja (DROP POLICY IF EXISTS + CREATE; DO-Block-Loop).
-- Verhalten-aendernd: nach Apply gilt Owner-aware RLS auf 4 Per-User-Tabellen.
-- V8.10-Verhalten bleibt funktional dank Admin-Bypass (is_admin() Path).
--
-- Pattern-Quelle: sql/migrations/035_v7_rls_switch.sql DO-Loop-Section
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md).
-- Architektur-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse A + DEC-270.
--
-- Klasse-A-Drift vs V7-Pattern:
--   - keine can_see_owner()-Wrap → reines `user_id = auth.uid()`
--   - kein teamlead-Bypass (per DEC-270: Per-User-Stammdaten sind privat)
--   - Admin-Bypass via `is_admin()`
--
-- Pre-Apply Done-Gate (loose query mit policyname LIKE '%_full_access'): 41
-- Post-Apply Done-Gate (loose query): 37 (41 - 4)
-- ============================================================================

-- ============================================================================
-- 1) Helper-Existenz-Guard (V7-Functions Pflicht)
-- ============================================================================
DO $$
DECLARE
  v_helper_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('is_admin','is_teamlead','get_my_team_id','can_see_owner');

  IF v_helper_count < 4 THEN
    RAISE EXCEPTION 'MIG-045: V7-Helper-Functions fehlen (gefunden %, erwarte 4). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) 4 Per-User-Tabellen: alte authenticated_full_access raus, 4 Klasse-A-Policies rein
-- ============================================================================
-- Pro Tabelle:
--   SELECT — user_id = auth.uid() ODER is_admin()
--   INSERT — user_id = auth.uid() ODER is_admin()
--   UPDATE — user_id = auth.uid() ODER is_admin() (USING + CHECK)
--   DELETE — user_id = auth.uid() ODER is_admin()

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'user_settings','kpi_snapshots','goals','activity_kpi_targets'
  ]) LOOP
    -- Alte V1-Policy droppen
    EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON %I', v_table);

    -- Idempotenz: alte V8.11-Policies droppen falls Re-Apply
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_select ON %I
        FOR SELECT TO authenticated
        USING (user_id = auth.uid() OR is_admin())
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_insert ON %I
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid() OR is_admin())
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_update ON %I
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid() OR is_admin())
        WITH CHECK (user_id = auth.uid() OR is_admin())
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_delete ON %I
        FOR DELETE TO authenticated
        USING (user_id = auth.uid() OR is_admin())
    $f$, v_table, v_table);
  END LOOP;
END $$;


-- ============================================================================
-- 3) Verifikation (rein lesend, Apply-Telemetrie)
-- ============================================================================

DO $$
DECLARE
  v_policy_count INT;
  v_orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('user_settings','kpi_snapshots','goals','activity_kpi_targets');

  IF v_policy_count <> 16 THEN
    RAISE EXCEPTION 'MIG-045: erwarte 16 Policies auf 4 Klasse-A-Tabellen (4 pro Tabelle), gefunden %', v_policy_count;
  END IF;

  -- Kein authenticated_full_access mehr auf Klasse-A-Tabellen
  SELECT COUNT(*) INTO v_orphan_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname = 'authenticated_full_access'
     AND tablename IN ('user_settings','kpi_snapshots','goals','activity_kpi_targets');
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'MIG-045: % alte authenticated_full_access-Policies auf Klasse-A-Tabellen noch aktiv', v_orphan_count;
  END IF;

  RAISE NOTICE 'MIG-045 verify: 16 Klasse-A-Policies aktiv auf user_settings, kpi_snapshots, goals, activity_kpi_targets';
END $$;
