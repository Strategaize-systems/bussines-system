-- =====================================================
-- MIG-025 — V5.4 E-Mail-Anhaenge-Upload (PC-Direkt)
-- =====================================================
-- DEC-097 Junction-Table-Pattern (vs. spalten-array)
-- DEC-098 storage-path = {user_id}/{compose_session_id}/{filename}
-- DEC-099 MIME-Whitelist als shared TS-Konstante (kein DB-Constraint)
-- DEC-100 ZIP rein ohne Inhalt-Inspection
-- DEC-101 AttachmentsSection unter Body-Textarea
-- DEC-103 25 MB Total-Limit, 10 MB pro File (App-Level)
-- DEC-104 Tab-Session = Compose-Session (Reload generiert neue Session-ID)
--
-- Bestandteile:
--   1. Storage-Bucket "email-attachments" (privat — kein public-read)
--   2. Junction-Table email_attachments (FK zu emails ON DELETE CASCADE)
--   3. Index idx_email_attachments_email_id
--   4. RLS authenticated_full_access
--   5. service_role-Grants (Pattern aus MIG-021/023)

-- =====================================================
-- 1. Storage-Bucket "email-attachments" (privat)
-- =====================================================
-- public=false: keine Direkt-URL-Auslieferung, alle Reads laufen
-- ueber Service-Role-Storage-Client von send.ts (Server Action).
-- Keine MIME-Whitelist auf DB-Ebene (DEC-099) — App-Level Validation.
-- Kein file_size_limit auf DB-Ebene — App-Level (10 MB pro File, 25 MB Total).

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Junction-Table email_attachments
-- =====================================================
-- DEC-097 Junction-Pattern: emails 1:N email_attachments
-- ON DELETE CASCADE: wenn eine email-Row geloescht wird, verschwindet
-- auch die Junction-Row. Storage-Files bleiben (keine Trigger,
-- DEC-104 deferred Cleanup-Cron).

CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Index fuer Email-Detail-Queries
-- =====================================================
-- Pattern: SELECT * FROM email_attachments WHERE email_id = $1
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id
  ON email_attachments(email_id);

-- =====================================================
-- 4. RLS aktivieren + Policy
-- =====================================================
-- Single-User-Internal-Tool: authenticated_full_access analog branding_settings.
-- service_role hat eigene Grants (siehe Punkt 5).

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_attachments' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON email_attachments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 5. Grants (BYPASSRLS != table permissions)
-- =====================================================
-- Pattern aus MIG-021/023 — service_role muss explizit GRANTed werden.

GRANT SELECT, INSERT, UPDATE, DELETE ON email_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_attachments TO service_role;

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- SELECT id, name, public FROM storage.buckets WHERE id = 'email-attachments';
-- \d email_attachments
-- SELECT indexname FROM pg_indexes WHERE tablename = 'email_attachments';
-- SELECT polname FROM pg_policies WHERE tablename = 'email_attachments';
