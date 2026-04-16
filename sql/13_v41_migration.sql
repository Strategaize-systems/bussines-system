-- ============================================================
-- V4.1 Schema-Migration (MIG-011): Meeting Intelligence Basis
-- ============================================================
-- 1 neue Tabelle: user_settings (FEAT-409)
-- Tabellen-Erweiterungen:
--   contacts   +7 Consent-Felder (inkl. opt_out_communication, FEAT-411 + ISSUE-032)
--   meetings   +11 Recording/Transcript/Summary/Agenda/Reminder-Felder (FEAT-404 + FEAT-409)
--   activities +1 (ai_generated, FEAT-404)
-- Neue audit_log-Action-Werte: consent_requested, consent_granted, consent_declined,
--   consent_revoked, communication_opt_out_changed, recording_started, recording_completed,
--   recording_failed, transcript_generated, summary_generated
--   (audit_log bleibt strukturell unveraendert; ip_hash + user_agent_hash gehen in changes JSONB)
-- RLS: authenticated_full_access auf user_settings
-- Idempotent: IF NOT EXISTS / IF EXISTS, kann mehrfach laufen
-- KEINE auth.users Referenzen
-- ============================================================

-- ============================================================
-- 1. TABELLEN-ERWEITERUNG: contacts (FEAT-411, DEC-038, ISSUE-032)
-- ============================================================
-- consent_status: pending (Default) / granted / declined / revoked
-- consent_source: email_link / manual / imported / ad_hoc
-- consent_token: URL-safe 32-byte hex (crypto.randomBytes(32).toString('hex') in App)
-- opt_out_communication: Kommunikations-Unterdrueckung unabhaengig vom Consent-Status

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_token TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_token_expires_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_requested_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_communication BOOLEAN DEFAULT false;

-- Bestand-Kontakte: Default greift bei NULL-Werten nach ALTER (Postgres setzt Default nur
-- fuer neue Rows). Explizites Update, damit Bestand-Kontakte nicht NULL bleiben.
UPDATE contacts SET consent_status = 'pending' WHERE consent_status IS NULL;
UPDATE contacts SET opt_out_communication = false WHERE opt_out_communication IS NULL;

-- ============================================================
-- 2. TABELLEN-ERWEITERUNG: meetings (FEAT-404 + FEAT-409)
-- ============================================================
-- recording_status: not_recording / pending / recording / uploading / completed / failed / deleted
-- transcript_status: pending / processing / completed / failed
-- summary_status: pending / processing / completed / failed
-- ai_summary: { outcome, decisions[], action_items[], next_step }
-- reminders_sent: [{ type, recipient, sent_at }] fuer Idempotenz

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS jitsi_room_name TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'not_recording';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_duration_seconds INT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS transcript_status TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS summary_status TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_summary JSONB;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_agenda TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_agenda_generated_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS reminders_sent JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- 3. TABELLEN-ERWEITERUNG: activities (FEAT-404)
-- ============================================================
-- ai_generated: true fuer KI-erzeugte Timeline-Eintraege (Meeting-Summary, Insights)

ALTER TABLE activities ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
UPDATE activities SET ai_generated = false WHERE ai_generated IS NULL;

-- ============================================================
-- 4. TABELLEN-ANPASSUNG: audit_log (FEAT-411, Public-Page-Actor)
-- ============================================================
-- Public-Page-Aktionen (kein auth User) loggen mit actor_id=NULL und
-- changes.actor_label='public'. Dafuer muss actor_id nullable sein.

ALTER TABLE audit_log ALTER COLUMN actor_id DROP NOT NULL;

-- ============================================================
-- 5. NEUE TABELLE: user_settings (FEAT-409)
-- ============================================================
-- 1:1-Relation zu profiles.id (separater Table, damit User-Settings additiv wachsen koennen)
-- meeting_agenda_mode: auto / on_click / off (Default on_click wegen Bedrock-Kosten)
-- push_subscription: Web-Push Subscription-Object { endpoint, keys: { p256dh, auth } }

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_reminder_external_hours INT[] DEFAULT '{24, 2}',
  meeting_reminder_internal_enabled BOOLEAN DEFAULT false,
  meeting_reminder_internal_minutes INT DEFAULT 30,
  meeting_agenda_mode TEXT DEFAULT 'on_click',
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. INDEXES
-- ============================================================

-- contacts: Consent-Token-Lookup (Public-Page) und Opt-out-Filter
CREATE INDEX IF NOT EXISTS idx_contacts_consent_token ON contacts(consent_token)
  WHERE consent_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_consent_status ON contacts(consent_status);
CREATE INDEX IF NOT EXISTS idx_contacts_opt_out ON contacts(opt_out_communication)
  WHERE opt_out_communication = true;

-- meetings: Recording-Status-Queries (scheduled_at hat bereits Index aus MIG-005)
CREATE INDEX IF NOT EXISTS idx_meetings_recording_status ON meetings(recording_status)
  WHERE recording_status IS NOT NULL AND recording_status != 'not_recording';

-- ============================================================
-- 7. RLS — authenticated_full_access auf user_settings
-- ============================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON user_settings;
CREATE POLICY "authenticated_full_access" ON user_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. GRANTS
-- ============================================================
-- service_role braucht explizite Grants (BYPASSRLS != table permissions)

GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_settings TO service_role;
