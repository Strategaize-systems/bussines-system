-- MIG-052 Semantik-Probe (NICHT-persistent): applied Function+Trigger in einer
-- Transaktion, testet alle Guard-Pfade via DO-Block, ROLLBACK am Ende.
-- V8.15 SLC-913 MT-1 — R-913-1 Live-Verifikation ohne Apply (Deploy gated auf V8.14 STABLE).

BEGIN;

CREATE OR REPLACE FUNCTION profiles_role_change_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'member' OR NEW.team_id IS NOT NULL THEN
      RAISE EXCEPTION
        'profiles insert with privileged role/team_id denied for role "%" (service_role required)', current_user
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION
      'profiles.role change denied for role "%" (service_role required)', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION
      'profiles.team_id change denied for role "%" (service_role required)', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_change_guard ON profiles;

CREATE TRIGGER profiles_role_change_guard
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_role_change_guard();

DO $probe$
DECLARE
  v_admin uuid;
  v_other_team uuid;
BEGIN
  SELECT id INTO v_admin FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  SELECT t.id INTO v_other_team FROM teams t
   WHERE t.id IS DISTINCT FROM (SELECT team_id FROM profiles WHERE id = v_admin) LIMIT 1;

  -- T1: authenticated UPDATE team_id -> erwartet BLOCK
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    UPDATE profiles SET team_id = gen_random_uuid() WHERE id = v_admin;
    RAISE WARNING 'T1 FAIL: authenticated team_id-UPDATE NICHT geblockt';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T1 PASS: % ', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T2: service_role UPDATE team_id -> erwartet OK
  PERFORM set_config('role', 'service_role', true);
  BEGIN
    UPDATE profiles SET team_id = v_other_team WHERE id = v_admin;
    RAISE NOTICE 'T2 PASS: service_role team_id-UPDATE ok';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'T2 FAIL: service_role team_id-UPDATE geblockt: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T3: authenticated UPDATE role -> erwartet BLOCK (MIG-051-Regression)
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    UPDATE profiles SET role = 'member' WHERE id = v_admin;
    RAISE WARNING 'T3 FAIL: authenticated role-UPDATE NICHT geblockt';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T3 PASS: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T4: authenticated UPDATE display_name -> erwartet OK (kein Kollateral)
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    UPDATE profiles SET display_name = display_name WHERE id = v_admin;
    RAISE NOTICE 'T4 PASS: authenticated display_name-UPDATE ok';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'T4 FAIL: display_name-UPDATE geblockt: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T5: authenticated INSERT role='admin' -> erwartet BLOCK
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    INSERT INTO profiles (id, role) VALUES (gen_random_uuid(), 'admin');
    RAISE WARNING 'T5 FAIL: authenticated INSERT role=admin NICHT geblockt';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'T5 PASS: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T6: authenticated INSERT role='member', team_id NULL -> erwartet OK
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    INSERT INTO profiles (id, role, team_id) VALUES (gen_random_uuid(), 'member', NULL);
    RAISE NOTICE 'T6 PASS: authenticated INSERT member/NULL ok (Trigger laesst durch)';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'T6 FAIL: unprivilegierter INSERT geblockt: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);

  -- T7: service_role INSERT privilegiert -> erwartet OK (Invite-Pfad)
  PERFORM set_config('role', 'service_role', true);
  BEGIN
    INSERT INTO profiles (id, role, team_id) VALUES (gen_random_uuid(), 'teamlead', v_other_team);
    RAISE NOTICE 'T7 PASS: service_role privilegierter INSERT ok';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'T7 FAIL: service_role INSERT geblockt: %', SQLERRM;
  END;
  PERFORM set_config('role', 'postgres', true);
END
$probe$;

ROLLBACK;

-- Nach-Probe-Kontrolle: Live-Trigger ist unveraendert der MIG-051-Stand (nur UPDATE).
SELECT tgname, tgtype FROM pg_trigger
 WHERE tgname = 'profiles_role_change_guard' AND NOT tgisinternal;
