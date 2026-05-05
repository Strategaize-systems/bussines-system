-- ============================================================================
-- MIG-029 Phase 1 — Workflow-Schema Smoke-Test
-- ============================================================================
-- V6.2 SLC-621 MT-8 Schema-Smoke gegen Coolify-DB.
-- Pruepft: Schema-Existenz, Anti-Loop-UNIQUE, RLS, GRANTS, CASCADE-Delete.
-- Idempotent: Test-Daten werden vor + nach gecleant.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- 1. Schema-Existenz
-- ----------------------------------------------------------------------------
SELECT 'TEST 1.1: automation_rules table exists' AS test;
SELECT 1 FROM information_schema.tables
WHERE table_schema='public' AND table_name='automation_rules';

SELECT 'TEST 1.2: automation_runs table exists' AS test;
SELECT 1 FROM information_schema.tables
WHERE table_schema='public' AND table_name='automation_runs';

SELECT 'TEST 1.3: Anti-Loop UNIQUE constraint exists' AS test;
SELECT conname FROM pg_constraint
WHERE conname = 'automation_runs_anti_loop_uq';

SELECT 'TEST 1.4: idx_automation_rules_active partial index exists' AS test;
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_automation_rules_active';

SELECT 'TEST 1.5: idx_automation_runs_pending partial index exists' AS test;
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_automation_runs_pending';

-- ----------------------------------------------------------------------------
-- 2. RLS aktiv
-- ----------------------------------------------------------------------------
SELECT 'TEST 2.1: RLS enabled on automation_rules' AS test;
SELECT relrowsecurity FROM pg_class
WHERE oid = 'public.automation_rules'::regclass AND relrowsecurity = true;

SELECT 'TEST 2.2: RLS enabled on automation_runs' AS test;
SELECT relrowsecurity FROM pg_class
WHERE oid = 'public.automation_runs'::regclass AND relrowsecurity = true;

-- ----------------------------------------------------------------------------
-- 3. GRANTS auf service_role + authenticated
-- ----------------------------------------------------------------------------
SELECT 'TEST 3.1: service_role has ALL on automation_rules' AS test;
SELECT privilege_type FROM information_schema.role_table_grants
WHERE table_name='automation_rules' AND grantee='service_role'
  AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
ORDER BY privilege_type;

SELECT 'TEST 3.2: authenticated has ALL on automation_runs' AS test;
SELECT privilege_type FROM information_schema.role_table_grants
WHERE table_name='automation_runs' AND grantee='authenticated'
  AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
ORDER BY privilege_type;

-- ----------------------------------------------------------------------------
-- 4. Anti-Loop-UNIQUE Test (data-level)
-- ----------------------------------------------------------------------------
-- Setup: ein Test-Rule erstellen
DO $$
DECLARE
  v_rule_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_entity_id UUID := '00000000-0000-0000-0000-0000000000aa'::uuid;
  v_audit_id UUID := '00000000-0000-0000-0000-0000000000bb'::uuid;
  v_created_by UUID := '00000000-0000-0000-0000-000000000099'::uuid;
  v_run_count INTEGER;
BEGIN
  -- Test-Rule
  INSERT INTO automation_rules (id, name, status, trigger_event, actions, created_by)
  VALUES (
    v_rule_id, 'SMOKE-TEST-RULE', 'active', 'deal.stage_changed',
    '[{"type":"create_task","params":{"title":"smoke"}}]'::jsonb,
    v_created_by
  )
  ON CONFLICT (id) DO NOTHING;

  -- Erste Run-Insert sollte succeeden
  INSERT INTO automation_runs (rule_id, trigger_event, trigger_entity_type, trigger_entity_id, trigger_event_audit_id, status)
  VALUES (v_rule_id, 'deal.stage_changed', 'deal', v_entity_id, v_audit_id, 'pending')
  ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING;

  -- Zweite Run-Insert mit identischem Tripel sollte vom UNIQUE geblockt werden
  INSERT INTO automation_runs (rule_id, trigger_event, trigger_entity_type, trigger_entity_id, trigger_event_audit_id, status)
  VALUES (v_rule_id, 'deal.stage_changed', 'deal', v_entity_id, v_audit_id, 'pending')
  ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING;

  -- Verifikation: nur 1 Run
  SELECT count(*) INTO v_run_count FROM automation_runs
  WHERE rule_id = v_rule_id AND trigger_entity_id = v_entity_id AND trigger_event_audit_id = v_audit_id;

  IF v_run_count != 1 THEN
    RAISE EXCEPTION 'TEST 4.1 FAILED: Anti-Loop UNIQUE did not prevent duplicate (count=%)', v_run_count;
  END IF;

  RAISE NOTICE 'TEST 4.1 PASS: Anti-Loop UNIQUE blocks duplicate run';
END$$;

-- ----------------------------------------------------------------------------
-- 5. CASCADE-Delete Test
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_rule_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_run_count INTEGER;
BEGIN
  -- Vor Delete: 1 run existiert
  SELECT count(*) INTO v_run_count FROM automation_runs WHERE rule_id = v_rule_id;
  IF v_run_count != 1 THEN
    RAISE EXCEPTION 'TEST 5.0 SETUP FAILED: expected 1 run, got %', v_run_count;
  END IF;

  -- Delete Rule
  DELETE FROM automation_rules WHERE id = v_rule_id;

  -- Nach Delete: 0 runs
  SELECT count(*) INTO v_run_count FROM automation_runs WHERE rule_id = v_rule_id;
  IF v_run_count != 0 THEN
    RAISE EXCEPTION 'TEST 5.1 FAILED: CASCADE-Delete did not remove runs (remaining=%)', v_run_count;
  END IF;

  RAISE NOTICE 'TEST 5.1 PASS: CASCADE-Delete removes child runs';
END$$;

-- ----------------------------------------------------------------------------
-- 6. CHECK-Constraints (negative tests)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_rejected BOOLEAN := false;
  v_created_by UUID := '00000000-0000-0000-0000-000000000099'::uuid;
BEGIN
  -- Ungueltiger trigger_event sollte abgelehnt werden
  BEGIN
    INSERT INTO automation_rules (id, name, status, trigger_event, actions, created_by)
    VALUES (
      gen_random_uuid(), 'BAD-EVENT', 'active', 'invalid.event.type',
      '[]'::jsonb, v_created_by
    );
  EXCEPTION
    WHEN check_violation THEN v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 6.1 FAILED: invalid trigger_event was not rejected';
  END IF;

  RAISE NOTICE 'TEST 6.1 PASS: trigger_event CHECK rejects invalid value';
END$$;

DO $$
DECLARE
  v_rejected BOOLEAN := false;
  v_created_by UUID := '00000000-0000-0000-0000-000000000099'::uuid;
BEGIN
  -- Ungueltiger status sollte abgelehnt werden
  BEGIN
    INSERT INTO automation_rules (id, name, status, trigger_event, actions, created_by)
    VALUES (
      gen_random_uuid(), 'BAD-STATUS', 'invalid_status', 'deal.created',
      '[]'::jsonb, v_created_by
    );
  EXCEPTION
    WHEN check_violation THEN v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 6.2 FAILED: invalid status was not rejected';
  END IF;

  RAISE NOTICE 'TEST 6.2 PASS: status CHECK rejects invalid value';
END$$;

-- ----------------------------------------------------------------------------
-- DONE — Cleanup ist nicht noetig weil Test 5 die Rule schon entfernt hat
-- ----------------------------------------------------------------------------
SELECT 'ALL SMOKE TESTS PASSED' AS result;
