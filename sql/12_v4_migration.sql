-- ============================================================
-- V4 Schema-Migration (MIG-010): IMAP + KI-Gatekeeper + Cal.com
-- ============================================================
-- 5 neue Tabellen: email_threads, email_messages, email_sync_state,
--                  ai_action_queue, ai_feedback
-- 1 Tabellen-Erweiterung: calendar_events (+source, external_id, sync_status, booking_link)
-- RLS: authenticated_full_access auf neuen Tabellen
-- Idempotent: kann mehrfach laufen (IF NOT EXISTS / IF EXISTS)
-- KEINE auth.users Referenzen
-- ============================================================

-- ============================================================
-- 1. NEUE TABELLE: email_threads (FEAT-405)
-- ============================================================
-- Muss VOR email_messages erstellt werden (FK-Referenz)

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  first_message_at TIMESTAMPTZ NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL,
  message_count INT DEFAULT 1,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. NEUE TABELLE: email_messages (FEAT-405, FEAT-408)
-- ============================================================
-- classification: unclassified, anfrage, antwort, auto_reply, newsletter, intern, spam
-- priority: dringend, normal, niedrig, irrelevant
-- attachments: JSONB Array [{filename, mime_type, size_bytes}]

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  in_reply_to TEXT,
  references_header TEXT,
  thread_id UUID REFERENCES email_threads(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  classification TEXT DEFAULT 'unclassified',
  priority TEXT DEFAULT 'normal',
  gatekeeper_summary TEXT,
  is_auto_reply BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT now(),
  retention_expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  headers_json JSONB,
  created_by UUID
);

-- ============================================================
-- 3. NEUE TABELLE: email_sync_state (FEAT-405)
-- ============================================================
-- Tracking fuer inkrementellen IMAP-Sync

CREATE TABLE IF NOT EXISTS email_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL UNIQUE,
  last_uid INT DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'idle',
  error_message TEXT,
  emails_synced_total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. NEUE TABELLE: ai_action_queue (FEAT-407, FEAT-408)
-- ============================================================
-- Zentrale Human-in-the-Loop Queue fuer KI-Vorschlaege
-- type: reply, followup, meeting, assign_contact, reclassify, task, info
-- source: gatekeeper, followup_engine, auto_reply_detector
-- status: pending, approved, rejected, executed, expired

CREATE TABLE IF NOT EXISTS ai_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  reasoning TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  context_json JSONB,
  priority TEXT DEFAULT 'normal',
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  suggested_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  execution_result TEXT,
  dedup_key TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. NEUE TABELLE: ai_feedback (FEAT-407)
-- ============================================================
-- Feedback auf KI-Vorschlaege fuer Lern-Effekt

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_queue_id UUID REFERENCES ai_action_queue(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. TABELLEN-ERWEITERUNG: calendar_events (FEAT-406)
-- ============================================================
-- source: manual, calcom, google, outlook
-- external_id: Cal.com Booking ID oder Google Event ID
-- sync_status: synced, pending_sync, conflict

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS booking_link TEXT;

-- ============================================================
-- 7. INDEXES
-- ============================================================

-- email_threads
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_contact ON email_threads(contact_id);

-- email_messages
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_contact ON email_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_company ON email_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_deal ON email_messages(deal_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_classification ON email_messages(classification);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_from ON email_messages(from_address);
CREATE INDEX IF NOT EXISTS idx_email_messages_retention ON email_messages(retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;

-- ai_action_queue
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_action_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ai_queue_entity ON ai_action_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_queue_source ON ai_action_queue(source);
CREATE INDEX IF NOT EXISTS idx_ai_queue_dedup ON ai_action_queue(dedup_key) WHERE dedup_key IS NOT NULL;

-- ai_feedback
CREATE INDEX IF NOT EXISTS idx_ai_feedback_queue ON ai_feedback(action_queue_id);

-- calendar_events (neue Spalten)
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON calendar_events(source);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- 8. RLS — authenticated_full_access (V1-Muster)
-- ============================================================

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON email_threads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON email_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON email_sync_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON ai_action_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON ai_feedback
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. GRANTS
-- ============================================================
-- service_role braucht explizite Grants (BYPASSRLS ≠ table permissions)

GRANT ALL ON email_threads TO authenticated;
GRANT ALL ON email_threads TO service_role;
GRANT ALL ON email_messages TO authenticated;
GRANT ALL ON email_messages TO service_role;
GRANT ALL ON email_sync_state TO authenticated;
GRANT ALL ON email_sync_state TO service_role;
GRANT ALL ON ai_action_queue TO authenticated;
GRANT ALL ON ai_action_queue TO service_role;
GRANT ALL ON ai_feedback TO authenticated;
GRANT ALL ON ai_feedback TO service_role;
