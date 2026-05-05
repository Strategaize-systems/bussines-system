-- ============================================================================
-- MIG-029 — V6.2 Workflow-Automation + Kampagnen-Attribution Schema
-- ============================================================================
-- Datum: 2026-05-05 (planned, Apply via SLC-621 + SLC-624 + SLC-625)
-- Idempotent: ja (alle CREATE TABLE/INDEX/POLICY mit IF NOT EXISTS bzw.
-- via DO-Block-Guard)
--
-- Aufbau in 3 Slice-Phasen, alle in dieser einen File konsolidiert:
--   Phase 1 (SLC-621): automation_rules + automation_runs + Anti-Loop-UNIQUE
--   Phase 2 (SLC-624): campaigns + 3 ALTER campaign_id auf contacts/companies/deals
--   Phase 3 (SLC-625): campaign_links + campaign_link_clicks
--
-- Re-Apply ist sicher — alle Operationen sind idempotent.
-- ============================================================================

-- ============================================================================
-- PHASE 1 (SLC-621) — Workflow-Automation Schema
-- ============================================================================

-- 1.1  automation_rules — Regel-Definitionen
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'disabled')) DEFAULT 'paused',
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('deal.stage_changed', 'deal.created', 'activity.created')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  references_stage_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  paused_reason TEXT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ NULL,
  last_run_status TEXT NULL CHECK (last_run_status IS NULL OR last_run_status IN ('pending', 'running', 'success', 'partial_failed', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_active
  ON automation_rules (trigger_event, status)
  WHERE status = 'active';

-- 1.2  automation_runs — Run-History + Idempotency-Marker
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  trigger_entity_type TEXT NOT NULL CHECK (trigger_entity_type IN ('deal', 'activity')),
  trigger_entity_id UUID NOT NULL,
  trigger_event_audit_id UUID NULL,
  conditions_match BOOLEAN NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'partial_failed', 'failed', 'skipped')) DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  action_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anti-Loop-UNIQUE: identischer Trigger triggert nicht erneut die gleiche Regel.
-- NULL in trigger_event_audit_id wird von Postgres als verschieden behandelt --
-- daher MUSS der Aufrufer immer eine ID setzen (entweder echte audit_log.id
-- oder synthetisch entityId-Cast als Fallback).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'automation_runs_anti_loop_uq'
  ) THEN
    ALTER TABLE automation_runs
      ADD CONSTRAINT automation_runs_anti_loop_uq
      UNIQUE (rule_id, trigger_entity_id, trigger_event_audit_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_automation_runs_pending
  ON automation_runs (started_at)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_automation_runs_rule
  ON automation_runs (rule_id, started_at DESC);

-- 1.3  RLS Policies — Single-User V1: full-access fuer authenticated
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_rules_full_access ON automation_rules;
CREATE POLICY automation_rules_full_access
  ON automation_rules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS automation_runs_full_access ON automation_runs;
CREATE POLICY automation_runs_full_access
  ON automation_runs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 1.4  GRANTS — service_role + authenticated brauchen explizite Table-GRANTs
GRANT ALL ON automation_rules TO authenticated, service_role;
GRANT ALL ON automation_runs TO authenticated, service_role;


-- ============================================================================
-- PHASE 2 (SLC-624) — Campaigns Schema
-- ============================================================================
-- Aktiviert mit SLC-624 Implementation (FEAT-622, DEC-135 + DEC-136).
-- Re-Apply nach SLC-621 — Workflow-Tabellen bleiben unangetastet, jetzt
-- kommen Campaigns + 3 ALTER-FKs auf contacts/companies/deals dazu.
-- ============================================================================

-- 2.1  campaigns — Kampagnen-Definition
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'linkedin', 'event', 'ads', 'referral', 'other')),
  channel TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'finished', 'archived')) DEFAULT 'draft',
  external_ref TEXT NULL,
  notes TEXT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_date_range_chk CHECK (end_date IS NULL OR end_date >= start_date)
);

-- UNIQUE (LOWER(name)) — case-insensitive Name-Uniqueness
-- (DEC-135: utm_campaign-Match case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_name_lower_uq
  ON campaigns (LOWER(name));

-- Partial UNIQUE auf external_ref (nur wenn gesetzt)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_external_ref_uq
  ON campaigns (external_ref) WHERE external_ref IS NOT NULL;

-- Partial-Index fuer aktive Kampagnen (CampaignPicker Default-Query)
CREATE INDEX IF NOT EXISTS idx_campaigns_status_active
  ON campaigns (status, start_date)
  WHERE status = 'active';

-- 2.2  RLS Policy — Single-User V1: full-access fuer authenticated
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_full_access ON campaigns;
CREATE POLICY campaigns_full_access
  ON campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2.3  GRANTS — service_role + authenticated
GRANT ALL ON campaigns TO authenticated, service_role;

-- 2.4  ALTER TABLE — campaign_id-FK auf contacts/companies/deals
-- DEC-136: additive FK, keine Source-Migration. ON DELETE SET NULL = sicheres
-- Default-Verhalten wenn Kampagne geloescht wird.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL;

-- Partial-Indizes fuer schnelle JOIN-Queries auf KPI-Subqueries
CREATE INDEX IF NOT EXISTS idx_contacts_campaign
  ON contacts (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_campaign
  ON companies (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_campaign
  ON deals (campaign_id) WHERE campaign_id IS NOT NULL;


-- ============================================================================
-- PHASE 3 (SLC-625) — Tracking-Links + Click-Log
-- ============================================================================
-- TODO SLC-625: Phase 3 hier einfuegen (campaign_links + campaign_link_clicks)
