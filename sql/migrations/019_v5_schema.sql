-- =====================================================
-- MIG-019 — V5 Automatisierung + Vertriebsintelligenz
-- =====================================================
-- 5 neue Tabellen: cadences, cadence_steps, cadence_enrollments, cadence_executions, email_tracking_events
-- 2 Erweiterungen: emails (+tracking_id, +tracking_enabled), email_messages (+assignment_source, +ai_match_confidence)
-- Idempotent: IF NOT EXISTS auf allen CREATE Statements

-- =====================================================
-- 1. Cadences (FEAT-501)
-- =====================================================

CREATE TABLE IF NOT EXISTS cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadences_status ON cadences(status);

ALTER TABLE cadences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cadences' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON cadences FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON cadences TO authenticated;
GRANT ALL ON cadences TO service_role;

-- =====================================================
-- 2. Cadence Steps (FEAT-501)
-- =====================================================

CREATE TABLE IF NOT EXISTS cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,
  delay_days INT NOT NULL DEFAULT 0,
  email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  email_subject TEXT,
  email_body TEXT,
  task_title TEXT,
  task_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadence_steps_cadence ON cadence_steps(cadence_id, step_order);

ALTER TABLE cadence_steps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cadence_steps' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON cadence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON cadence_steps TO authenticated;
GRANT ALL ON cadence_steps TO service_role;

-- =====================================================
-- 3. Cadence Enrollments (FEAT-501)
-- =====================================================

CREATE TABLE IF NOT EXISTS cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_step_order INT NOT NULL DEFAULT 1,
  next_execute_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT enrollment_target CHECK (deal_id IS NOT NULL OR contact_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_active ON cadence_enrollments(status, next_execute_at)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_cadence ON cadence_enrollments(cadence_id);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_deal ON cadence_enrollments(deal_id)
  WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_contact ON cadence_enrollments(contact_id)
  WHERE contact_id IS NOT NULL;

-- Unique: kein doppeltes aktives Enrollment desselben Targets in dieselbe Cadence
CREATE UNIQUE INDEX IF NOT EXISTS idx_cadence_enrollments_unique ON cadence_enrollments(
  cadence_id,
  COALESCE(deal_id, '00000000-0000-0000-0000-000000000000'::UUID),
  COALESCE(contact_id, '00000000-0000-0000-0000-000000000000'::UUID)
) WHERE status = 'active';

ALTER TABLE cadence_enrollments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cadence_enrollments' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON cadence_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON cadence_enrollments TO authenticated;
GRANT ALL ON cadence_enrollments TO service_role;

-- =====================================================
-- 4. Cadence Executions (FEAT-501)
-- =====================================================

CREATE TABLE IF NOT EXISTS cadence_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES cadence_steps(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'executed',
  result_detail TEXT,
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadence_executions_enrollment ON cadence_executions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_step ON cadence_executions(step_id);

ALTER TABLE cadence_executions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cadence_executions' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON cadence_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON cadence_executions TO authenticated;
GRANT ALL ON cadence_executions TO service_role;

-- =====================================================
-- 5. Email Tracking Events (FEAT-506)
-- =====================================================

CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL,
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  link_url TEXT,
  link_index INT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking ON email_tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_email ON email_tracking_events(email_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON email_tracking_events(event_type);

ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_tracking_events' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON email_tracking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON email_tracking_events TO authenticated;
GRANT ALL ON email_tracking_events TO service_role;

-- =====================================================
-- 6. Tabellen-Erweiterung: emails (FEAT-506)
-- =====================================================

ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking_id UUID;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_tracking ON emails(tracking_id) WHERE tracking_id IS NOT NULL;

-- =====================================================
-- 7. Tabellen-Erweiterung: email_messages (FEAT-505)
-- =====================================================

ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS assignment_source TEXT;
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS ai_match_confidence NUMERIC(3,2);

CREATE INDEX IF NOT EXISTS idx_email_messages_unassigned ON email_messages(contact_id)
  WHERE contact_id IS NULL AND classification NOT IN ('spam', 'newsletter', 'auto_reply');

-- =====================================================
-- Fertig
-- =====================================================
