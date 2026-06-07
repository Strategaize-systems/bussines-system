-- ============================================================================
-- MIG-046 — V8.11 SLC-902 RLS-Sweep Klasse B (Team-Templates)
-- ============================================================================
-- Datum: 2026-06-05 (Apply via SLC-902 MT-2 NACH MIG-045)
-- Idempotent: ja (DROP POLICY IF EXISTS + CREATE; DO-Block-Loop).
-- Verhalten-aendernd: nach Apply gilt Admin-mutate-Pattern auf 11 Klasse-B-Tabellen.
--   - SELECT: all authenticated (USING(true))
--   - INSERT/UPDATE/DELETE: nur is_admin() (Member/Teamlead-write blockiert)
-- V8.10-Verhalten bleibt funktional fuer Admin-Pfade. Member/Teamlead koennen
-- weiterhin SELECT (Team-Templates sind read-share-by-default).
--
-- Pattern-Quelle: sql/migrations/045_v8_11_slc_901_klasse_a.sql DO-Loop-Section
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md).
-- Architektur-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse B + DEC-271 + DEC-274.
--
-- Klasse-B-Pattern vs Klasse-A:
--   - kein user_id-Owner-Check (Tabellen sind Owner-less)
--   - SELECT bleibt Team-weit lesbar (USING(true))
--   - INSERT/UPDATE/DELETE strikt Admin-only via is_admin()
--   - Forward-compatible zu V9: USING(true) wird zu USING(team_id = get_my_team_id())
--
-- Pre-Apply Done-Gate (loose query): 37
-- Post-Apply Done-Gate (loose query): 26 (37 - 11)
--
-- Pflicht-Sec-Audit-Helper-Function-Deploy (DEC-274) am Ende der Migration:
-- list_tables_with_authenticated_full_access() RETURNS TABLE — Done-Gate-Quelle
-- ab MIG-046 fuer SLC-903..905 + /post-launch T+24h Burn-In-Monitoring.
-- ============================================================================

-- ============================================================================
-- 1) Helper-Existenz-Guard (V7-Functions Pflicht: is_admin)
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
    RAISE EXCEPTION 'MIG-046: V7-Helper-Functions fehlen (gefunden %, erwarte 4). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) 11 Klasse-B-Tabellen: alte Full-Access raus, 4 Klasse-B-Policies rein
-- ============================================================================
-- Pro Tabelle:
--   SELECT — USING(true) (alle authenticated lesen)
--   INSERT — WITH CHECK is_admin()
--   UPDATE — USING is_admin() + WITH CHECK is_admin()
--   DELETE — USING is_admin()
--
-- DROP-Strategie: pro Tabelle BEIDE Drop-Varianten (authenticated_full_access
-- UND <table>_full_access) — idempotent.

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'branding_settings',
    'email_templates',
    'payment_terms_templates',
    'compliance_templates',
    'vat_id_validations',
    'pipelines',
    'pipeline_stages',
    'products',
    'automation_rules',
    'cadences',
    'cadence_steps'
  ]) LOOP
    -- Alte V1/V5-Policy droppen (beide Varianten — idempotent)
    EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON %I', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_full_access ON %I', v_table, v_table);

    -- Idempotenz: alte V8.11-Policies droppen falls Re-Apply
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', v_table, v_table);

    -- SELECT all authenticated
    EXECUTE format($f$
      CREATE POLICY %I_select ON %I
        FOR SELECT TO authenticated
        USING (true)
    $f$, v_table, v_table);

    -- INSERT Admin-only
    EXECUTE format($f$
      CREATE POLICY %I_insert ON %I
        FOR INSERT TO authenticated
        WITH CHECK (is_admin())
    $f$, v_table, v_table);

    -- UPDATE Admin-only
    EXECUTE format($f$
      CREATE POLICY %I_update ON %I
        FOR UPDATE TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin())
    $f$, v_table, v_table);

    -- DELETE Admin-only
    EXECUTE format($f$
      CREATE POLICY %I_delete ON %I
        FOR DELETE TO authenticated
        USING (is_admin())
    $f$, v_table, v_table);
  END LOOP;
END $$;


-- ============================================================================
-- 3) Sec-Audit-Helper-Function (DEC-274) — persistent, ab hier Done-Gate-Quelle
-- ============================================================================
-- Pattern-Quelle: V7 SECURITY-DEFINER-Pattern (MIG-035 is_admin etc.).
-- Liefert: alle public-Tabellen die noch eine `authenticated_full_access`-
-- oder `<table>_full_access`-Policy haben (= noch nicht in V8.11-RLS-Sweep
-- integriert). Bei V8.11-Abschluss: COUNT(*) = 0.

CREATE OR REPLACE FUNCTION list_tables_with_authenticated_full_access()
  RETURNS TABLE(schemaname TEXT, tablename TEXT, policyname TEXT)
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT schemaname::TEXT, tablename::TEXT, policyname::TEXT
    FROM pg_policies
   WHERE schemaname = 'public'
     AND (policyname = 'authenticated_full_access'
          OR policyname LIKE '%_full_access');
$$;

GRANT EXECUTE ON FUNCTION list_tables_with_authenticated_full_access() TO authenticated;


-- ============================================================================
-- 4) Verifikation (rein lesend, Apply-Telemetrie)
-- ============================================================================

DO $$
DECLARE
  v_policy_count INT;
  v_orphan_count INT;
  v_helper_count INT;
  v_done_gate_count INT;
BEGIN
  -- 4a: 44 Klasse-B-Policies (11 Tabellen × 4 Ops)
  SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = ANY(ARRAY[
       'branding_settings','email_templates','payment_terms_templates',
       'compliance_templates','vat_id_validations','pipelines',
       'pipeline_stages','products','automation_rules','cadences','cadence_steps'
     ])
     AND policyname LIKE ANY(ARRAY['%_select','%_insert','%_update','%_delete']);

  IF v_policy_count <> 44 THEN
    RAISE EXCEPTION 'MIG-046: erwarte 44 Policies (11 Tabellen × 4 Ops), gefunden %', v_policy_count;
  END IF;

  -- 4b: Kein authenticated_full_access mehr auf Klasse-B-Tabellen
  SELECT COUNT(*) INTO v_orphan_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname IN ('authenticated_full_access','automation_rules_full_access',
                        'branding_settings_full_access','email_templates_full_access',
                        'payment_terms_templates_full_access','compliance_templates_full_access',
                        'vat_id_validations_full_access','pipelines_full_access',
                        'pipeline_stages_full_access','products_full_access',
                        'cadences_full_access','cadence_steps_full_access')
     AND tablename = ANY(ARRAY[
       'branding_settings','email_templates','payment_terms_templates',
       'compliance_templates','vat_id_validations','pipelines',
       'pipeline_stages','products','automation_rules','cadences','cadence_steps'
     ]);
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'MIG-046: % alte *_full_access-Policies auf Klasse-B-Tabellen noch aktiv', v_orphan_count;
  END IF;

  -- 4c: Helper-Function exists + executable
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'list_tables_with_authenticated_full_access';
  IF v_helper_count <> 1 THEN
    RAISE EXCEPTION 'MIG-046: list_tables_with_authenticated_full_access() nicht angelegt (gefunden %)', v_helper_count;
  END IF;

  -- 4d: Done-Gate via Helper-Function — soll 26 sein (37 - 11)
  SELECT COUNT(*) INTO v_done_gate_count
    FROM list_tables_with_authenticated_full_access();
  IF v_done_gate_count <> 26 THEN
    RAISE EXCEPTION 'MIG-046 Done-Gate: erwarte 26 verbleibende *_full_access-Policies, gefunden %', v_done_gate_count;
  END IF;

  RAISE NOTICE 'MIG-046 verify: 44 Klasse-B-Policies aktiv, Helper-Function deployed, Done-Gate=26';
END $$;
