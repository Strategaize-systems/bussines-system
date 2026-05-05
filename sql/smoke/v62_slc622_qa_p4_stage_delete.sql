-- V6.2 SLC-622 P4 Smoke: Stage-Delete-Soft-Disable Logic
-- Pruepft die SQL-Logic die deleteStage Server-Action ausfuehrt:
--   1. SELECT id, name FROM automation_rules WHERE references_stage_ids @> [stageId] AND status='active'
--   2. UPDATE automation_rules SET status='paused', paused_reason='Pipeline-Stage "X" wurde geloescht'
--   3. DELETE Stage selbst (nur Test-Stage)

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user UUID := '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid;
  v_pipeline UUID;
  v_test_stage UUID := gen_random_uuid();
  v_test_stage_name TEXT := 'QA-P4 Test-Stage';
  v_rule_id UUID := '00000000-0000-0000-0000-100000000004'::uuid;

  v_dependent_count INTEGER;
  v_paused_status TEXT;
  v_paused_reason TEXT;
BEGIN
  -- Setup: Pipeline finden + Test-Stage anlegen
  SELECT id INTO v_pipeline FROM pipelines ORDER BY sort_order LIMIT 1;

  INSERT INTO pipeline_stages (id, pipeline_id, name, color, sort_order, probability)
  VALUES (v_test_stage, v_pipeline, v_test_stage_name, '#999999', 999, 0);

  -- Active Rule mit references_stage_ids = [v_test_stage]
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule_id,
    'QA-P4 Stage-Reference Rule',
    'active',
    'deal.stage_changed',
    jsonb_build_object('stage_id', v_test_stage::text),
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'create_task',
      'params', jsonb_build_object('title', 'Task fuer test-stage')
    )),
    ARRAY[v_test_stage],
    v_user
  );

  -- ==== Simuliere deleteStage-Server-Action-Logic ====

  -- Step 1: SELECT dependent active rules
  SELECT count(*) INTO v_dependent_count
  FROM automation_rules
  WHERE status = 'active'
    AND references_stage_ids @> ARRAY[v_test_stage];

  IF v_dependent_count != 1 THEN
    RAISE EXCEPTION 'P4 STEP 1 FAILED: expected 1 dependent rule, got %', v_dependent_count;
  END IF;
  RAISE NOTICE 'P4 STEP 1 PASS: dependent_count=% (rule references stage)', v_dependent_count;

  -- Step 2: UPDATE dependent rules to paused
  UPDATE automation_rules
  SET status = 'paused',
      paused_reason = 'Pipeline-Stage "' || v_test_stage_name || '" wurde geloescht',
      updated_at = now()
  WHERE status = 'active'
    AND references_stage_ids @> ARRAY[v_test_stage];

  -- Verify pause
  SELECT status, paused_reason INTO v_paused_status, v_paused_reason
  FROM automation_rules WHERE id = v_rule_id;

  IF v_paused_status != 'paused' THEN
    RAISE EXCEPTION 'P4 STEP 2 FAILED: expected paused, got %', v_paused_status;
  END IF;
  IF v_paused_reason NOT LIKE '%' || v_test_stage_name || '%' THEN
    RAISE EXCEPTION 'P4 STEP 2 FAILED: paused_reason ohne Stage-Name: %', v_paused_reason;
  END IF;
  RAISE NOTICE 'P4 STEP 2 PASS: rule.status=paused, paused_reason=%', v_paused_reason;

  -- Step 3: DELETE Stage (Server-Action laeuft trotzdem durch)
  DELETE FROM pipeline_stages WHERE id = v_test_stage;
  RAISE NOTICE 'P4 STEP 3 PASS: Stage deleted, paused_count=%', v_dependent_count;

  -- Cleanup
  DELETE FROM automation_rules WHERE id = v_rule_id;
  RAISE NOTICE 'P4 CLEANUP done';
END$$;

SELECT 'P4 ALL CHECKS PASSED' AS result;
