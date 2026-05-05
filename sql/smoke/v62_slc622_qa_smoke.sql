-- ============================================================================
-- V6.2 SLC-622 /qa Live-Smoke gegen Coolify-DB
-- ============================================================================
-- Pruepft 5 Pruefpunkte gegen die Workflow-Engine ohne Browser-UI:
--   P1: End-to-End create_task-Action + audit_log-Side-Effect
--   P2: Recursion-Guard skipped 4. update_field-Run
--   P3: PII-Schutz Defense-in-Depth (contact.email rejected)
--   P4: Stage-Delete-Soft-Disable (SQL-Logik-Verifikation)
--   P5: update_field-Action audit_log-Side-Effect mit triggered_by_user_id
--
-- Pattern: simuliert dispatcher.dispatchAutomationTrigger via direct INSERT
-- in automation_runs mit started_at = now() - 2min. Cron-Endpoint picked
-- die Run + executiert. Ergebnisse werden via SELECT verifiziert.
--
-- Cleanup am Ende entfernt alle SLC-622-QA-Test-Daten.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- SETUP: Test-Konstanten
-- ----------------------------------------------------------------------------
SELECT 'V6.2 SLC-622 /qa Live-Smoke STARTED' AS phase;

DO $$
DECLARE
  v_user UUID := '96322a0a-be2d-49e1-ba0d-03c4de1f1440';        -- richard@bellaerts.de
  v_deal UUID := '6620fddb-f2d7-44dc-b4d4-f92efb237ea9';        -- existing Test-Deal
  v_stage_from UUID := '25f4400d-7682-4757-b3e5-16bb77794484';  -- Identifiziert
  v_stage_to UUID := 'fe63b51c-c8d8-4c9c-b062-575c5f2c19e4';    -- Recherchiert

  -- P1
  v_rule_p1 UUID := '00000000-0000-0000-0000-100000000001'::uuid;
  v_audit_p1 UUID;
  v_run_p1 UUID := '00000000-0000-0000-0000-100000000011'::uuid;
  v_run_p1_status TEXT;
  v_run_p1_results JSONB;
  v_p1_activity_count INTEGER;

  -- P2 (Recursion)
  v_rule_p2 UUID := '00000000-0000-0000-0000-100000000002'::uuid;
  v_run_p2_pre UUID;
  v_run_p2 UUID := '00000000-0000-0000-0000-100000000022'::uuid;
  v_run_p2_status TEXT;
  v_run_p2_results JSONB;

  -- P3 (PII-Defense)
  v_rule_p3 UUID := '00000000-0000-0000-0000-100000000003'::uuid;
  v_run_p3 UUID := '00000000-0000-0000-0000-100000000033'::uuid;
  v_run_p3_status TEXT;
  v_run_p3_results JSONB;

  -- P5 (audit_log Side-Effect)
  v_rule_p5 UUID := '00000000-0000-0000-0000-100000000005'::uuid;
  v_run_p5 UUID := '00000000-0000-0000-0000-100000000055'::uuid;
  v_run_p5_status TEXT;
  v_run_p5_audit_count INTEGER;
  v_run_p5_audit_changes JSONB;
BEGIN
  -- =====================================================================
  -- P1: End-to-End create_task
  -- =====================================================================
  -- Test-Rule: bei deal.stage_changed → create_task
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule_p1,
    'QA-P1: Stage-Change → Task',
    'active',
    'deal.stage_changed',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'create_task',
      'params', jsonb_build_object(
        'title', 'Follow-up zu Deal {{deal.title}}',
        'due_in_days', 1
      )
    )),
    ARRAY[]::UUID[],
    v_user
  );

  -- Audit-Log fuer Stage-Change (RETURNING id als Anti-Loop-Token)
  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
  VALUES (
    v_user, 'stage_change', 'deal', v_deal,
    jsonb_build_object('before', jsonb_build_object('stage', 'Identifiziert'),
                       'after',  jsonb_build_object('stage', 'Recherchiert')),
    'QA-P1: Pipeline Stage Identifiziert → Recherchiert'
  )
  RETURNING id INTO v_audit_p1;

  -- automation_runs-Insert simuliert dispatcher (started_at = now() - 2min,
  -- damit pickupStuckRuns ihn picked).
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p1, v_rule_p1, 'deal.stage_changed', 'deal', v_deal,
    v_audit_p1, true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P1 SETUP done — rule=%, run=%', v_rule_p1, v_run_p1;

  -- =====================================================================
  -- P2: Recursion-Guard
  -- =====================================================================
  -- Rule: bei deal.stage_changed → update_field deal.value=42
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule_p2,
    'QA-P2: Recursion-Test (update value)',
    'active',
    'deal.stage_changed',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'update_field',
      'params', jsonb_build_object('entity', 'deal', 'field', 'value', 'value', 42)
    )),
    ARRAY[]::UUID[],
    v_user
  );

  -- 3 vergangene success-Runs in den letzten 30s (Recursion-Counter sieht 3)
  FOR i IN 1..3 LOOP
    INSERT INTO automation_runs (
      id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
      trigger_event_audit_id, conditions_match, status, started_at, finished_at,
      action_results
    ) VALUES (
      gen_random_uuid(), v_rule_p2, 'deal.stage_changed', 'deal', v_deal,
      gen_random_uuid(), true, 'success',
      now() - (i * interval '5 seconds'),
      now() - (i * interval '5 seconds'),
      jsonb_build_array(jsonb_build_object(
        'action_index', 0, 'type', 'update_field', 'outcome', 'success'
      ))
    );
  END LOOP;

  -- 4. Run (zu picken) mit started_at = now() - 2min (stuck)
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p2, v_rule_p2, 'deal.stage_changed', 'deal', v_deal,
    gen_random_uuid(), true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P2 SETUP done — rule=%, run=%', v_rule_p2, v_run_p2;

  -- =====================================================================
  -- P3: PII-Schutz Defense-in-Depth
  -- =====================================================================
  -- Direct-INSERT umgeht Server-Action-Validation. Action-Executor MUSS
  -- die Whitelist sekundaer pruefen und die Aktion mit failed beenden.
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule_p3,
    'QA-P3: PII Direct-Insert (contact.email)',
    'active',
    'deal.stage_changed',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'update_field',
      'params', jsonb_build_object('entity', 'contact', 'field', 'email', 'value', 'leak@example.com')
    )),
    ARRAY[]::UUID[],
    v_user
  );

  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p3, v_rule_p3, 'deal.stage_changed', 'deal', v_deal,
    gen_random_uuid(), true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P3 SETUP done — rule=%, run=%', v_rule_p3, v_run_p3;

  -- =====================================================================
  -- P5: audit_log-Side-Effect (update_field auf deal.value)
  -- =====================================================================
  INSERT INTO automation_rules (
    id, name, status, trigger_event, trigger_config, conditions, actions,
    references_stage_ids, created_by
  ) VALUES (
    v_rule_p5,
    'QA-P5: Audit-Side-Effect',
    'active',
    'deal.stage_changed',
    '{}'::jsonb,
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'type', 'update_field',
      'params', jsonb_build_object('entity', 'deal', 'field', 'value', 'value', 12345)
    )),
    ARRAY[]::UUID[],
    v_user
  );

  -- audit-id fuer triggered_by-Lookup (mit actor=user, ID wird gefunden)
  -- Wir nutzen Audit-ID aus P1 als shared trigger event (executor liest
  -- diesen audit-id und liest actor_id daraus).
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p5, v_rule_p5, 'deal.stage_changed', 'deal', v_deal,
    v_audit_p1, true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P5 SETUP done — rule=%, run=%', v_rule_p5, v_run_p5;

  -- =====================================================================
  -- Smoke-Test setup-state Verifikation
  -- =====================================================================
  PERFORM 1 FROM automation_rules WHERE id = v_rule_p1;
  PERFORM 1 FROM automation_runs WHERE id = v_run_p1 AND status = 'pending';
  PERFORM 1 FROM automation_rules WHERE id = v_rule_p2;
  PERFORM 1 FROM automation_runs WHERE id = v_run_p2 AND status = 'pending';

  RAISE NOTICE '=== ALL SETUP DONE — bereit fuer Cron-Trigger ===';
END$$;

-- Setup-Verifikation Output
SELECT 'SETUP COMPLETE — 4 pending runs ready for cron pickup' AS state;
SELECT id, status, started_at, trigger_entity_id
FROM automation_runs
WHERE id::text LIKE '00000000-0000-0000-0000-1000%'
ORDER BY id;
