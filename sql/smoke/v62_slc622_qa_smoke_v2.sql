-- V6.2 SLC-622 /qa Smoke V2 — Reruns fuer P1+P2 mit korrekten Test-Daten

\set ON_ERROR_STOP on

-- P1-Fix: Test-Deal braucht created_by, sonst assignee-resolver throws.
UPDATE deals
SET created_by = '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid
WHERE id = '6620fddb-f2d7-44dc-b4d4-f92efb237ea9'::uuid
  AND created_by IS NULL;

-- Cleanup alte P1+P2-Runs (Behalte P1-Rule fuer re-use; loesche nur Runs)
DELETE FROM automation_runs
WHERE id::text IN (
  '00000000-0000-0000-0000-100000000011',
  '00000000-0000-0000-0000-100000000022'
);

-- P1: neuer Run mit demselben Rule-Eintrag (rule + audit_p1 existieren noch)
DO $$
DECLARE
  v_rule_p1 UUID := '00000000-0000-0000-0000-100000000001'::uuid;
  v_deal UUID := '6620fddb-f2d7-44dc-b4d4-f92efb237ea9'::uuid;
  v_run_p1_v2 UUID := '00000000-0000-0000-0000-1000000000a1'::uuid;
  v_audit_p1_v2 UUID;

  v_rule_p2 UUID := '00000000-0000-0000-0000-100000000002'::uuid;
  v_run_p2_v2 UUID := '00000000-0000-0000-0000-1000000000a2'::uuid;
BEGIN
  -- frischer audit-Eintrag fuer P1 v2
  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
  VALUES (
    '96322a0a-be2d-49e1-ba0d-03c4de1f1440'::uuid,
    'stage_change', 'deal', v_deal,
    jsonb_build_object('after', jsonb_build_object('stage', 'Recherchiert')),
    'QA-P1-V2: Stage-Change Re-Run'
  )
  RETURNING id INTO v_audit_p1_v2;

  -- P1-Run frisch
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p1_v2, v_rule_p1, 'deal.stage_changed', 'deal', v_deal,
    v_audit_p1_v2, true, 'pending', now() - interval '2 minutes'
  );

  -- P2 v2: 3 frische Pre-Runs (started_at = now(), success, mit
  -- action_results=update_field/success). Diese muessen JETZT entstehen
  -- damit Recursion-Window (60s) sie sieht.
  FOR i IN 1..3 LOOP
    INSERT INTO automation_runs (
      id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
      trigger_event_audit_id, conditions_match, status, started_at, finished_at,
      action_results
    ) VALUES (
      gen_random_uuid(), v_rule_p2, 'deal.stage_changed', 'deal', v_deal,
      gen_random_uuid(), true, 'success',
      now() - (i * interval '1 second'),
      now() - (i * interval '1 second'),
      jsonb_build_array(jsonb_build_object(
        'action_index', 0, 'type', 'update_field', 'outcome', 'success'
      ))
    );
  END LOOP;

  -- 4. Run = der zu testende, stuck started_at - 2min damit Cron picked
  INSERT INTO automation_runs (
    id, rule_id, trigger_event, trigger_entity_type, trigger_entity_id,
    trigger_event_audit_id, conditions_match, status, started_at
  ) VALUES (
    v_run_p2_v2, v_rule_p2, 'deal.stage_changed', 'deal', v_deal,
    gen_random_uuid(), true, 'pending', now() - interval '2 minutes'
  );

  RAISE NOTICE 'P1-V2 audit=% run=%', v_audit_p1_v2, v_run_p1_v2;
  RAISE NOTICE 'P2-V2 run=% (mit 3 frischen Pre-Runs)', v_run_p2_v2;
END$$;

-- Verifikation: Pre-Runs wirklich in den letzten 60s
SELECT 'P2 V2 Pre-Run-Count (letzte 60s, success, update_field):' AS state;
SELECT count(*) AS cnt
FROM automation_runs
WHERE trigger_entity_id = '6620fddb-f2d7-44dc-b4d4-f92efb237ea9'::uuid
  AND started_at > now() - interval '60 seconds'
  AND status = 'success'
  AND action_results @> '[{"type": "update_field", "outcome": "success"}]'::jsonb;
