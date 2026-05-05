-- V6.2 SLC-622 P2 Re-Test (nach recursion-guard-Fix in 22673d4)
-- Pruepft: 3 Pre-Runs success + 1 stuck Run → 4. Run wird skipped.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_user UUID := '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid;
  v_deal UUID := '6620fddb-f2d7-44dc-b4d4-f92efb237ea9'::uuid;
  v_rule UUID := '00000000-0000-0000-0000-200000000002'::uuid;
  v_run UUID := '00000000-0000-0000-0000-2000000000a2'::uuid;
BEGIN
  -- Rule: update_field auf deals.value
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule,
    'QA-P2-V3 Recursion (post-fix)',
    'active',
    'deal.stage_changed',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'update_field',
      'params', jsonb_build_object('entity', 'deal', 'field', 'value', 'value', 99)
    )),
    ARRAY[]::UUID[],
    v_user
  );

  -- 3 frische success-Pre-Runs (started_at = now()-1s/2s/3s)
  FOR i IN 1..3 LOOP
    INSERT INTO automation_runs (
      id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
      trigger_event_audit_id, conditions_match, status, started_at, finished_at,
      action_results
    ) VALUES (
      gen_random_uuid(), v_rule, 'deal.stage_changed', 'deal', v_deal,
      gen_random_uuid(), true, 'success',
      now() - (i * interval '1 second'),
      now() - (i * interval '1 second'),
      jsonb_build_array(jsonb_build_object(
        'action_index', 0, 'type', 'update_field', 'outcome', 'success'
      ))
    );
  END LOOP;

  -- 4. Run: stuck pending mit started_at = now() - 2min damit Cron picked
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run, v_rule, 'deal.stage_changed', 'deal', v_deal,
    gen_random_uuid(), true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P2-V3 SETUP done — rule=%, run=%, 3 fresh success pre-runs', v_rule, v_run;
END$$;

-- Pre-Runs in 60s-Window verifizieren
SELECT 'Pre-Runs in 60s window (sollte 3 sein):' AS check_;
SELECT count(*) FROM automation_runs
WHERE trigger_entity_id = '6620fddb-f2d7-44dc-b4d4-f92efb237ea9'::uuid
  AND started_at > now() - interval '60 seconds'
  AND status = 'success'
  AND action_results @> '[{"type": "update_field", "outcome": "success"}]'::jsonb;
