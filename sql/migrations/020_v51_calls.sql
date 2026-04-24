-- =====================================================
-- MIG-020 — V5.1 Asterisk Telefonie Schema
-- =====================================================
-- 1 neue Tabelle: calls
-- 6 Indexes, RLS, Grants
-- Storage Bucket: call-recordings
-- Idempotent: IF NOT EXISTS auf allen CREATE Statements

-- =====================================================
-- 1. Calls (FEAT-512, FEAT-513, FEAT-514, DEC-074)
-- =====================================================
-- Eigene Tabelle fuer reichere Daten (analog meetings, DEC-021).
-- Activity mit type='call' + source_id fuer Timeline.

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Call-Metadata
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'initiated',
  phone_number TEXT,
  caller_id TEXT,
  -- Zeitstempel
  started_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  -- Recording (gleiches Pattern wie meetings)
  recording_url TEXT,
  recording_status TEXT DEFAULT 'not_recording',
  -- Transcription + Summary (gleiches Pattern wie meetings)
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending',
  ai_summary JSONB,
  summary_status TEXT DEFAULT 'pending',
  -- Voice-Agent (SMAO/Synthflow)
  voice_agent_handled BOOLEAN DEFAULT FALSE,
  voice_agent_classification TEXT,
  voice_agent_transcript TEXT,
  -- Asterisk-Referenz
  asterisk_channel_id TEXT,
  sip_call_id TEXT,
  -- Ownership
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_calls_deal ON calls(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_recording ON calls(recording_status)
  WHERE recording_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_calls_direction ON calls(direction);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created_at DESC);

-- =====================================================
-- 3. RLS + Policies + Grants
-- =====================================================

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calls' AND policyname = 'authenticated_full_access') THEN
    CREATE POLICY "authenticated_full_access" ON calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON calls TO authenticated;
GRANT ALL ON calls TO service_role;

-- =====================================================
-- 4. Supabase Storage Bucket: call-recordings
-- =====================================================
-- Bucket fuer WAV/Audio-Dateien von Telefonaten.
-- Analog zu meeting-recordings (V4.1).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings',
  'call-recordings',
  false,
  524288000,  -- 500 MB (grosszuegig fuer lange WAV-Dateien)
  ARRAY['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies intentionally omitted.
--
-- Rationale (verified 2026-04-24, SLC-514 E2E test, ISSUE-040):
--   Custom object-level RLS policies break storage-api uploads because
--   (a) the policies were mis-specified (FOR ALL USING without WITH
--   CHECK blocks INSERT) and (b) storage-api uses set_config('role',...)
--   to delegate requests through supabase_storage_admin, which requires
--   schema grants and role membership set up in MIG-021.
--
--   The `meeting-recordings` bucket has been operating without object
--   policies since V4.1 and works correctly via BYPASSRLS on service_role.
--   The same pattern is used here. Retention, upload, and download all
--   happen via admin/service-role server-side code paths.
--
-- See MIG-021 for the role-delegation and schema-grants fix.
