-- ============================================================================
-- MIG-036 — V7.5 SLC-752 MT-0 — automation_rules.created_via
-- ============================================================================
-- Datum: 2026-05-16 (Apply via /backend SLC-752 vor Sculptor-Core-Code-Deploy)
-- Idempotent: ja (ALTER TABLE IF NOT EXISTS, kein Backfill noetig — DEFAULT
-- greift fuer bestehende Rows).
--
-- Eine rein additive Aenderung:
--   - automation_rules.created_via TEXT mit CHECK-Whitelist
--     ('click_wizard','nl_sculptor') und DEFAULT 'click_wizard'.
--
-- Hintergrund (DEC-205 / FEAT-751 Natural-Language Workflow-Sculptor):
-- V7.5 fuehrt eine NL-Surface ein, ueber die User Workflow-Regeln per
-- natuerlicher Sprache erstellen. Damit Inspection-Logs und Builder-UI
-- unterscheiden koennen, ob eine Rule durch den 4-Step-Wizard (V6.2) oder
-- den Sculptor (V7.5) angelegt wurde, bekommt jede Rule eine `created_via`-
-- Spalte. Bestehende Rules erhalten DEFAULT 'click_wizard' rueckwirkend,
-- da sie alle aus dem V6.2-Wizard stammen.
--
-- Risk: minimal. Additive Spalte mit DEFAULT, keine bestehende Query bricht.
-- Rollback: ALTER TABLE automation_rules DROP COLUMN created_via;
-- ============================================================================

ALTER TABLE automation_rules
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'click_wizard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'automation_rules_created_via_check'
  ) THEN
    ALTER TABLE automation_rules
      ADD CONSTRAINT automation_rules_created_via_check
      CHECK (created_via IN ('click_wizard', 'nl_sculptor'));
  END IF;
END $$;

COMMENT ON COLUMN automation_rules.created_via IS
  'V7.5 SLC-752: Provenance der Rule — click_wizard (V6.2 4-Step-Wizard) oder nl_sculptor (V7.5 NL-Surface). Default click_wizard fuer rueckwirkende V6.2-Rules.';
