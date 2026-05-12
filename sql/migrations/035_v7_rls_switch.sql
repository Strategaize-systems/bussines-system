-- ============================================================================
-- MIG-035 — V7 Multi-User RLS-Switch (Phase C)
-- ============================================================================
-- Datum: 2026-05-12 (Apply via SLC-701 MT-5 NACH MIG-033 + MIG-034)
-- Idempotent: ja (CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS).
-- Verhalten-aendernd: nach Apply gilt Owner-aware RLS auf 8 Kerntabellen.
-- V6.6-Verhalten bleibt funktional dank Admin-Default (User Immo ist Admin
-- und sieht durch is_admin()-Pfad alle Rows).
--
-- Pre-Switch Smoke (manuell vor Apply): SELECT * FROM deals LIMIT 1; MUSS Daten
-- liefern. Post-Switch Smoke: gleiche Query MUSS fuer Admin Daten liefern,
-- fuer ungueltige Session keine Daten, fuer Member-Session nur eigene Owner.
-- ============================================================================

-- ============================================================================
-- 1) Helper-SQL-Functions (DEC-183, AC3 nach M2-Spec-QA-Fix)
-- ============================================================================
-- SECURITY DEFINER erlaubt is_admin/is_teamlead/get_my_team_id auf profiles zu
-- lesen, ohne dass der aufrufende User direkte SELECT-Policy auf profiles
-- haben muss (Permission-Decoupling). STABLE markiert die Functions als
-- Postgres-Cache-faehig pro Statement (1× evaluiert, n× in Policies genutzt).
-- search_path lock vermeidet Hijack-Risk durch User-spezifische Suchpfade.

CREATE OR REPLACE FUNCTION is_admin()
  RETURNS BOOLEAN
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_teamlead()
  RETURNS BOOLEAN
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT role = 'teamlead' FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_team_id()
  RETURNS UUID
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION can_see_owner(target_owner UUID)
  RETURNS BOOLEAN
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT
    is_admin()
    OR target_owner = auth.uid()
    OR (
      is_teamlead()
      AND EXISTS (
        SELECT 1 FROM profiles
         WHERE id = target_owner
           AND team_id = get_my_team_id()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION is_admin()              TO authenticated;
GRANT EXECUTE ON FUNCTION is_teamlead()           TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_team_id()        TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_owner(UUID)     TO authenticated;


-- ============================================================================
-- 2) 8 Kerntabellen: alte authenticated_full_access raus, 4 owner-Policies rein
-- ============================================================================
-- Pro Tabelle:
--   SELECT — can_see_owner(owner) ODER (admin UND System-Record mit NULL-owner)
--   INSERT — owner=auth.uid() ODER admin ODER (teamlead UND owner in own team)
--   UPDATE — can_see_owner(owner) USING + CHECK
--   DELETE — owner=auth.uid() ODER admin ODER (teamlead UND can_see_owner)

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'companies','contacts','deals','activities',
    'meetings','proposals','email_messages','calls'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON %I', v_table);

    -- Idempotenz: alte v7-Policies droppen falls Re-Apply
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_update ON %I', v_table, v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON %I', v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_select ON %I
        FOR SELECT TO authenticated
        USING (can_see_owner(owner_user_id) OR (is_admin() AND owner_user_id IS NULL))
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_insert ON %I
        FOR INSERT TO authenticated
        WITH CHECK (
          owner_user_id = auth.uid()
          OR is_admin()
          OR (is_teamlead() AND can_see_owner(owner_user_id))
        )
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_update ON %I
        FOR UPDATE TO authenticated
        USING (can_see_owner(owner_user_id))
        WITH CHECK (can_see_owner(owner_user_id))
    $f$, v_table, v_table);

    EXECUTE format($f$
      CREATE POLICY %I_delete ON %I
        FOR DELETE TO authenticated
        USING (
          owner_user_id = auth.uid()
          OR is_admin()
          OR (is_teamlead() AND can_see_owner(owner_user_id))
        )
    $f$, v_table, v_table);
  END LOOP;
END$$;


-- ============================================================================
-- 3) profiles + teams Policies (DEC-190 + DEC-191)
-- ============================================================================
-- profiles: alle Team-Members sehen einander; Admin darf mutate.
-- teams: alle Authenticated sehen Team-Liste; Admin darf mutate.

DROP POLICY IF EXISTS authenticated_full_access ON profiles;
DROP POLICY IF EXISTS admin_full_profiles        ON profiles;
DROP POLICY IF EXISTS user_select_own_profile    ON profiles;
DROP POLICY IF EXISTS profiles_select_team       ON profiles;
DROP POLICY IF EXISTS profiles_admin_insert      ON profiles;
DROP POLICY IF EXISTS profiles_admin_update      ON profiles;
DROP POLICY IF EXISTS profiles_admin_delete      ON profiles;

CREATE POLICY profiles_select_team ON profiles
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR id = auth.uid()
    OR team_id = get_my_team_id()
  );

CREATE POLICY profiles_admin_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin() OR id = auth.uid())
  WITH CHECK (is_admin() OR id = auth.uid());

CREATE POLICY profiles_admin_delete ON profiles
  FOR DELETE TO authenticated
  USING (is_admin());


DROP POLICY IF EXISTS teams_authenticated_full_access ON teams;
DROP POLICY IF EXISTS teams_select_all               ON teams;
DROP POLICY IF EXISTS teams_admin_insert             ON teams;
DROP POLICY IF EXISTS teams_admin_update             ON teams;
DROP POLICY IF EXISTS teams_admin_delete             ON teams;

CREATE POLICY teams_select_all ON teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY teams_admin_insert ON teams
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY teams_admin_update ON teams
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY teams_admin_delete ON teams
  FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================================
-- 4) Verifikation (rein lesend, Apply-Telemetrie)
-- ============================================================================

DO $$
DECLARE
  v_helper_count INT;
  v_policy_count INT;
  v_orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('is_admin','is_teamlead','get_my_team_id','can_see_owner');

  IF v_helper_count <> 4 THEN
    RAISE EXCEPTION 'MIG-035: erwarte 4 Helper-Functions, gefunden %', v_helper_count;
  END IF;

  SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('companies','contacts','deals','activities',
                       'meetings','proposals','email_messages','calls');

  IF v_policy_count <> 32 THEN
    RAISE EXCEPTION 'MIG-035: erwarte 32 Policies auf 8 Kerntabellen (4 pro Tabelle), gefunden %', v_policy_count;
  END IF;

  -- Kein authenticated_full_access mehr auf Kerntabellen
  SELECT COUNT(*) INTO v_orphan_count
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname = 'authenticated_full_access'
     AND tablename IN ('companies','contacts','deals','activities',
                       'meetings','proposals','email_messages','calls');
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'MIG-035: % alte authenticated_full_access-Policies noch aktiv', v_orphan_count;
  END IF;

  RAISE NOTICE 'MIG-035 verify: 4 Helper-Functions + 32 owner-Policies aktiv, keine authenticated_full_access mehr';
END$$;
