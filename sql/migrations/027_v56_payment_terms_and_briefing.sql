-- =====================================================
-- MIG-027 — V5.6 Zahlungsbedingungen + Pre-Call Briefing Schema
-- =====================================================
-- DEC-115 Sum-Validation Split-Plan strict (App-Level)
-- DEC-116 Skonto als separate Spalten + UI-Mutex
-- DEC-117 Briefing-Trigger user-konfigurierbar via user_settings
-- DEC-118 Briefing-Cron Idempotenz via meetings.briefing_generated_at
-- DEC-119 Briefing-Persistierung als activities (type='briefing')
-- DEC-120 PDF-Renderer-Erweiterung mit V5.5-Fallback bit-identisch
-- DEC-121 V5.6 Slicing 4 Slices SLC-561..564
--
-- Bestandteile (5 Aenderungen):
--   1. Neue Tabelle payment_terms_templates + RLS + Grants + UNIQUE-Index + Seed
--   2. Neue Tabelle proposal_payment_milestones + RLS + Grants + Indizes + UNIQUE
--   3. proposals erweitert um skonto_percent + skonto_days + 2 CHECK-Constraints
--   4. meetings erweitert um briefing_generated_at + Partial-Index
--   5. user_settings erweitert um briefing_trigger_minutes + push/email-Flags
--
-- Idempotent: IF NOT EXISTS / DO $$ BEGIN ... / DROP POLICY IF EXISTS / ON CONFLICT.
-- Anwenden via SSH analog .claude/rules/sql-migration-hetzner.md (postgres-User).

-- =====================================================
-- 1. payment_terms_templates — neue Tabelle (DEC-115/121, Sub-Theme A)
-- =====================================================
-- Vorlagen fuer Zahlungsbedingungen, die im Proposal-Editor per Dropdown
-- ausgewaehlt werden. is_default markiert die Pre-Selektion fuer neue
-- Angebote — UNIQUE partial index auf (is_default) WHERE is_default = true
-- garantiert max. 1 Default-Template (DEC-115).

CREATE TABLE IF NOT EXISTS payment_terms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_terms_templates_default
  ON payment_terms_templates(is_default)
  WHERE is_default = true;

ALTER TABLE payment_terms_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_terms_templates' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON payment_terms_templates
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_terms_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_terms_templates TO service_role;

-- Seed: Standard-Default "30 Tage netto". ON CONFLICT DO NOTHING macht
-- den Run idempotent. Kein UNIQUE auf label, daher keine Konflikt-Spalte —
-- wir verlassen uns auf den UNIQUE-Index auf is_default=true. Beim ersten
-- Run gibt es keine Default-Row, INSERT geht durch. Beim zweiten Run
-- existiert bereits eine Default-Row, der UNIQUE-Index wuerde greifen,
-- und ON CONFLICT DO NOTHING macht das stillschweigend.
INSERT INTO payment_terms_templates (label, body, is_default)
SELECT '30 Tage netto', 'Zahlbar innerhalb von 30 Tagen netto.', true
WHERE NOT EXISTS (
  SELECT 1 FROM payment_terms_templates WHERE is_default = true
);

-- =====================================================
-- 2. proposal_payment_milestones — neue Tabelle (DEC-115, Sub-Theme B)
-- =====================================================
-- Split-Plan Teilzahlungen pro Proposal. Sum-Validation strict 100% wird
-- im Server Action saveProposalPaymentMilestones (SLC-563) enforced —
-- nicht hier (DB-CHECK kann nicht ueber Aggregat definiert werden).

CREATE TABLE IF NOT EXISTS proposal_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  amount NUMERIC(12,2),
  due_trigger TEXT NOT NULL CHECK (due_trigger IN (
    'on_signature',
    'on_completion',
    'days_after_signature',
    'on_milestone'
  )),
  due_offset_days INT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_payment_milestones_proposal
  ON proposal_payment_milestones(proposal_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_payment_milestones_proposal_sequence
  ON proposal_payment_milestones(proposal_id, sequence);

ALTER TABLE proposal_payment_milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proposal_payment_milestones' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON proposal_payment_milestones
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_payment_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_payment_milestones TO service_role;

-- =====================================================
-- 3. proposals — skonto_percent + skonto_days (DEC-116, Sub-Theme C)
-- =====================================================
-- Beide nullable, beide-oder-keiner via CHECK-Constraint.
-- Range-Checks: percent 0.01-9.99, days 1-90.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS skonto_percent NUMERIC(4,2)
    CHECK (skonto_percent IS NULL OR (skonto_percent > 0 AND skonto_percent < 10));

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS skonto_days INTEGER
    CHECK (skonto_days IS NULL OR (skonto_days > 0 AND skonto_days <= 90));

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_skonto_both_or_none'
      AND conrelid = 'proposals'::regclass
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_skonto_both_or_none
      CHECK (
        (skonto_percent IS NULL AND skonto_days IS NULL) OR
        (skonto_percent IS NOT NULL AND skonto_days IS NOT NULL)
      );
  END IF;
END $$;

-- =====================================================
-- 4. meetings — briefing_generated_at + Partial-Index (DEC-118)
-- =====================================================
-- Idempotenz-Marker fuer Pre-Call Briefing Cron. Partial-Index filtert auf
-- briefing_generated_at IS NULL AND deal_id IS NOT NULL — Cron-Query holt
-- nur Meetings im Trigger-Fenster, die noch kein Briefing haben und einem
-- Deal zugeordnet sind (PRD-Constraint).

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS briefing_generated_at TIMESTAMPTZ;

-- Hinweis: meetings nutzt scheduled_at, nicht start_time (MIG-027-Spec-Korrektur).
CREATE INDEX IF NOT EXISTS idx_meetings_briefing_pending
  ON meetings(scheduled_at)
  WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL;

-- =====================================================
-- 5. user_settings — briefing_trigger_minutes + Toggles (DEC-117)
-- =====================================================
-- Trigger-Minuten als diskreter Enum (15/30/45/60 via CHECK), Push und
-- E-Mail als BOOLEAN-Toggles. NOT NULL DEFAULT — bestehende Rows bekommen
-- automatisch Defaults. Backfill-UPDATE als Defense-in-Depth (idempotent).

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS briefing_trigger_minutes INT NOT NULL DEFAULT 30
    CHECK (briefing_trigger_minutes IN (15, 30, 45, 60));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS briefing_push_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS briefing_email_enabled BOOLEAN NOT NULL DEFAULT true;

-- Defense-in-Depth: defensiver Backfill, falls eine Migrationspipeline die
-- DEFAULT-Werte umgangen hat. NOT NULL + DEFAULT macht das eigentlich
-- unnoetig, aber idempotent + harmlos.
UPDATE user_settings
SET
  briefing_trigger_minutes = COALESCE(briefing_trigger_minutes, 30),
  briefing_push_enabled = COALESCE(briefing_push_enabled, true),
  briefing_email_enabled = COALESCE(briefing_email_enabled, true)
WHERE
  briefing_trigger_minutes IS NULL OR
  briefing_push_enabled IS NULL OR
  briefing_email_enabled IS NULL;

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- \d payment_terms_templates
-- \d proposal_payment_milestones
-- \d proposals          -- skonto_percent NUMERIC(4,2), skonto_days INTEGER
-- \d meetings           -- briefing_generated_at TIMESTAMPTZ
-- \d user_settings      -- briefing_trigger_minutes/push/email
-- SELECT * FROM payment_terms_templates;        -- Seed: "30 Tage netto" is_default=true
-- SELECT count(*) FROM proposals;                -- V5.5-Bestand unveraendert
-- SELECT count(*) FROM meetings WHERE briefing_generated_at IS NOT NULL;  -- 0 (alle NULL nach Apply)
