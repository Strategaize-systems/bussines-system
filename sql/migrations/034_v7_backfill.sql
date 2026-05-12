-- ============================================================================
-- MIG-034 — V7 Multi-User Backfill (Phase B)
-- ============================================================================
-- Datum: 2026-05-12 (Apply via SLC-701 MT-3 NACH MIG-033, VOR MIG-035)
-- Idempotent: ja (WHERE owner_user_id IS NULL filtert wiederholte Apply,
-- ON CONFLICT DO NOTHING auf teams).
-- Bricht hart ab, wenn nach UPDATE noch user-erzeugte NULL-Rows existieren —
-- MIG-035 wuerde sonst Member-Read-Pfad fuer betroffene Records brechen.
-- ============================================================================

-- ============================================================================
-- 1) Default-Team anlegen (Bestands-Instanz Immo = "Strategaize")
-- ============================================================================

INSERT INTO teams (name) VALUES ('Strategaize')
  ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- 2) Profiles auf Default-Team mappen
-- ============================================================================

-- 2a) Falls bestehende profiles.team TEXT-Werte existieren: zuerst als Teams anlegen.
INSERT INTO teams (name)
  SELECT DISTINCT TRIM(team)
    FROM profiles
   WHERE team IS NOT NULL
     AND TRIM(team) <> ''
     AND TRIM(team) NOT IN (SELECT name FROM teams)
  ON CONFLICT (name) DO NOTHING;

-- 2b) profiles.team_id setzen auf team-Wert wenn vorhanden, sonst auf Default-Team.
UPDATE profiles p
   SET team_id = t.id
  FROM teams t
 WHERE p.team_id IS NULL
   AND p.team IS NOT NULL
   AND TRIM(p.team) = t.name;

UPDATE profiles
   SET team_id = (SELECT id FROM teams WHERE name = 'Strategaize')
 WHERE team_id IS NULL;


-- ============================================================================
-- 3) owner_user_id-Backfill auf 8 Kerntabellen
-- ============================================================================
-- Strategie: alle bestehenden Records erhalten den ersten Admin als Owner.
-- System-Records, die das Script nach MIG-035 mit NULL anlegen will (Cron ohne
-- User-Context), bleiben hier ebenfalls gefuellt — Cron-Owner-Inheritance
-- kommt in SLC-704 MT-5.

DO $$
DECLARE
  v_admin    UUID;
  v_affected JSONB := '{}'::JSONB;
  v_rows     INT;
BEGIN
  SELECT id INTO v_admin
    FROM profiles
   WHERE role = 'admin'
   ORDER BY created_at ASC, id ASC
   LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'MIG-034: kein admin-Profile vorhanden — Backfill nicht moeglich';
  END IF;

  UPDATE companies      SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{companies}',      to_jsonb(v_rows));

  UPDATE contacts       SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{contacts}',       to_jsonb(v_rows));

  UPDATE deals          SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{deals}',          to_jsonb(v_rows));

  UPDATE activities     SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{activities}',     to_jsonb(v_rows));

  UPDATE meetings       SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{meetings}',       to_jsonb(v_rows));

  UPDATE proposals      SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{proposals}',      to_jsonb(v_rows));

  UPDATE email_messages SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{email_messages}', to_jsonb(v_rows));

  UPDATE calls          SET owner_user_id = v_admin WHERE owner_user_id IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_affected := jsonb_set(v_affected, '{calls}',          to_jsonb(v_rows));

  -- audit_log-Trail-Eintrag (Schema: actor_id/action/entity_type/entity_id/changes/context)
  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
    VALUES (v_admin, 'v7_backfill_complete', 'system', gen_random_uuid(), v_affected, 'MIG-034');

  RAISE NOTICE 'MIG-034 backfill complete, affected_rows=%', v_affected;
END$$;


-- ============================================================================
-- 4) Hard-Verifikation: 0 NULL-Owner ueber alle 8 Kerntabellen
-- ============================================================================
-- Diese Pruefung ist HART. AC2 verlangt COUNT=0. Wenn ein UPDATE oben
-- aussetzt (z.B. wegen Trigger-Rollback), bricht die Migration hier ab.

DO $$
DECLARE
  v_table TEXT;
  v_count INT;
  v_drift_total INT := 0;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY[
    'companies','contacts','deals','activities',
    'meetings','proposals','email_messages','calls'
  ]) LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE owner_user_id IS NULL', v_table)
      INTO v_count;
    IF v_count > 0 THEN
      RAISE WARNING 'MIG-034 verify: % hat noch % NULL-Owner-Rows', v_table, v_count;
      v_drift_total := v_drift_total + v_count;
    END IF;
  END LOOP;

  IF v_drift_total > 0 THEN
    RAISE EXCEPTION 'MIG-034 abort: insgesamt % NULL-Owner-Rows ueber 8 Tabellen — RLS-Switch (MIG-035) NICHT applieren bis Drift = 0', v_drift_total;
  END IF;

  RAISE NOTICE 'MIG-034 verify: 0 NULL-Owner-Rows ueber 8 Kerntabellen — bereit fuer MIG-035';
END$$;
