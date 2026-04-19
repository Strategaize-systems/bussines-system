-- =============================================================
-- MIG-016: V4.3 Insight Governance — Schema-Erweiterung
-- Date: 2026-04-19
-- Scope: ai_action_queue (+4 Spalten), meetings (+1), email_messages (+1)
-- DEC-049: ai_action_queue erweitern statt neue Tabelle
-- =============================================================

-- 1. ai_action_queue: 4 neue nullable Spalten fuer Insight-Vorschlaege
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS target_entity_type TEXT;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS target_entity_id UUID;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS proposed_changes JSONB;
ALTER TABLE ai_action_queue ADD COLUMN IF NOT EXISTS confidence FLOAT;

-- 2. Index fuer Target-Entity-Lookups (KI-Badge-Anzeige im Deal-Workspace)
CREATE INDEX IF NOT EXISTS idx_ai_queue_target
  ON ai_action_queue(target_entity_type, target_entity_id)
  WHERE target_entity_id IS NOT NULL;

-- 3. meetings: Signal-Status-Tracking (null → pending → completed/no_signals)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS signal_status TEXT;

-- 4. email_messages: Signal-Status-Tracking (null → pending → completed/no_signals)
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS signal_status TEXT;

-- 5. Verification
DO $$
BEGIN
  RAISE NOTICE 'MIG-016 V4.3 Insight Governance complete:';
  RAISE NOTICE '  - ai_action_queue: +target_entity_type, +target_entity_id, +proposed_changes, +confidence';
  RAISE NOTICE '  - meetings: +signal_status';
  RAISE NOTICE '  - email_messages: +signal_status';
END $$;
