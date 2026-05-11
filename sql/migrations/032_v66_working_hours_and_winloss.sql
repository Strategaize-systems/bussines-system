-- ============================================================================
-- MIG-032 — V6.6 Working-Hours-Setting + Win/Loss-Auto-Trigger Schema
-- ============================================================================
-- Datum: 2026-05-11 (Apply via SLC-665 MT-1 vor Workflow-Action-Code-Deploy)
-- Idempotent: ja (alle CREATE/ALTER mit IF NOT EXISTS bzw. DO-Block-Guards).
--
-- Drei rein additive Aenderungen:
--   1. user_settings + working_hours_start/end TIME (DEC-172, SLC-667 nutzt)
--   2. auto_winloss_runs (DEC-171, SLC-665 nutzt)
--   3. automation_rules.is_system BOOLEAN (DEC-171, schuetzt System-Rule vor
--      Builder-UI-Eintraegen und vor versehentlicher User-Bearbeitung)
-- ============================================================================

-- ============================================================================
-- 1) user_settings: working_hours-Spalten + CHECK-Constraint (DEC-172)
-- ============================================================================

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS working_hours_start TIME NULL,
  ADD COLUMN IF NOT EXISTS working_hours_end TIME NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_settings_working_hours_check'
  ) THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT user_settings_working_hours_check
      CHECK (
        (working_hours_start IS NULL AND working_hours_end IS NULL)
        OR (
          working_hours_start IS NOT NULL
          AND working_hours_end IS NOT NULL
          AND working_hours_start < working_hours_end
        )
      );
  END IF;
END$$;


-- ============================================================================
-- 2) auto_winloss_runs (DEC-171)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_winloss_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  target_status TEXT NOT NULL CHECK (target_status IN ('won', 'lost')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by_user_id UUID NULL,
  triggered_by_system BOOLEAN NOT NULL DEFAULT true,
  bedrock_output TEXT NULL,
  bedrock_model TEXT NULL,
  bedrock_completed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_winloss_runs_deal
  ON auto_winloss_runs(deal_id);

CREATE INDEX IF NOT EXISTS idx_auto_winloss_runs_recent
  ON auto_winloss_runs(deal_id, target_status, triggered_at DESC);

ALTER TABLE auto_winloss_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auto_winloss_runs_full_access ON auto_winloss_runs;
CREATE POLICY auto_winloss_runs_full_access
  ON auto_winloss_runs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON auto_winloss_runs TO authenticated, service_role;


-- ============================================================================
-- 3) automation_rules.is_system (DEC-171)
-- ============================================================================
-- Schuetzt System-Rules vor Builder-UI-Listing + vor User-Edit. Default false
-- damit bestehende User-Rules unveraendert bleiben. SLC-665 INSERTet die
-- Win/Loss-System-Rule mit is_system=true.

ALTER TABLE automation_rules
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_automation_rules_is_system
  ON automation_rules(is_system)
  WHERE is_system = true;
