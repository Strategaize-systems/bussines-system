-- ============================================================================
-- MIG-032b — V6.6 System-Workflow-Rule fuer Win/Loss-Auto-Trigger (DEC-171)
-- ============================================================================
-- Datum: 2026-05-11 (Apply nach MIG-032, vor erstem Workflow-Action-Run)
-- Idempotent: ja (UNIQUE-Schluessel auf name+is_system, ON CONFLICT DO NOTHING).
--
-- Legt einmalig die System-Rule an, die jede deal.stage_changed-Event ueber
-- den V6.2-Dispatcher in die `auto_winloss_extract`-Action routet. Die Action
-- entscheidet selbst, ob `target_status` won/lost ist und ueberspringt sonst.
-- Filter auf Stage-IDs passiert NICHT in trigger_config (das wuerde 2 Rules
-- erfordern), sondern in der Action — siehe auto_winloss_extract.ts.
-- ============================================================================

-- created_by erfordert eine UUID; "system seed"-Pattern: nimm den ersten
-- vorhandenen Auth-User. Wenn noch keiner existiert (frischer Stack), bricht
-- der INSERT ab und kann nach dem ersten Login re-applied werden.
DO $$
DECLARE
  v_seed_user UUID;
BEGIN
  SELECT id INTO v_seed_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_seed_user IS NULL THEN
    RAISE NOTICE 'Skipping system-rule INSERT — no auth.users present yet';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM automation_rules
    WHERE is_system = true
      AND actions @> '[{"type":"auto_winloss_extract"}]'::jsonb
  ) THEN
    INSERT INTO automation_rules (
      name,
      description,
      status,
      trigger_event,
      trigger_config,
      conditions,
      actions,
      references_stage_ids,
      created_by,
      is_system
    ) VALUES (
      '[SYSTEM] Auto Win/Loss Extract',
      'V6.6 DEC-171: triggert Bedrock-Win/Loss-Analyse bei Stage-Wechsel auf won/lost (5-Min-Time-Window-Throttle).',
      'active',
      'deal.stage_changed',
      '{}'::jsonb,
      '[]'::jsonb,
      '[{"type":"auto_winloss_extract","params":{}}]'::jsonb,
      ARRAY[]::UUID[],
      v_seed_user,
      true
    );
    RAISE NOTICE 'Inserted system rule: Auto Win/Loss Extract';
  ELSE
    RAISE NOTICE 'System rule already present, skipping';
  END IF;
END$$;
