-- =====================================================
-- MIG-023 — V5.3 Branding + Email-Templates Schema + Systemvorlagen-Seed
-- =====================================================
-- Diese Migration ist in zwei Teile gegliedert:
--   Teil 1 (SLC-531, dieser File): branding_settings + Storage Bucket "branding"
--   Teil 2 (SLC-532, ergaenzt diesen File): email_templates-Erweiterung + Seed
--
-- Beide Teile sind idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING) und koennen
-- nacheinander oder zusammen ausgefuehrt werden.
--
-- DEC-088 Branding-Settings als eigene Tabelle (single-row)
-- DEC-089 Logo-Storage via Supabase Storage Bucket "branding"
-- DEC-095 Branding-Renderer als Single-Source-of-Truth fuer HTML-Output

-- =====================================================
-- Teil 1 — SLC-531 Branding Foundation
-- =====================================================

-- 1. branding_settings (single-row, DEC-088)
-- =====================================================
-- Single-row enforcement an App-Level (Server-Action UPSERT auf erste Row).
-- Multi-Branding-Erweiterung in V7+ via additivem ALTER TABLE (z.B. tenant_id).

CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT NULL,
  primary_color TEXT NULL,
  secondary_color TEXT NULL,
  font_family TEXT NULL DEFAULT 'system',
  footer_markdown TEXT NULL,
  contact_block JSONB NULL,
  updated_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS + Policies + Grants
-- =====================================================

ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'branding_settings' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON branding_settings
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON branding_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON branding_settings TO service_role;

-- 3. Initiale Empty-Row (single-row enforcement an App-Level)
-- =====================================================
-- Idempotent: WHERE NOT EXISTS verhindert zweite Row bei Re-Run.

INSERT INTO branding_settings (logo_url, primary_color, secondary_color, font_family, footer_markdown, contact_block)
SELECT NULL, NULL, NULL, 'system', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM branding_settings);

-- 4. Storage Bucket "branding" (DEC-089)
-- =====================================================
-- Public-Read: Logo-URL muss in versendeten Mails ohne Auth ladbar sein.
-- Authenticated-Write geht ohnehin nur ueber Server Actions mit service_role
-- (BYPASSRLS). Keine eigenen storage.objects-Policies (siehe MIG-021 +
-- meeting-recordings/call-recordings Pattern).
--
-- Limits: 2 MB pro Datei, MIME-Type-Check zusaetzlich an App-Level (Server Action).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Teil 2 — SLC-532 Email-Templates Schema + Systemvorlagen-Seed
-- =====================================================
-- Wird in SLC-532 ergaenzt (email_templates-Erweiterung um is_system,
-- category, language, layout + INSERT ON CONFLICT fuer 6+ DE-Systemvorlagen).
-- Bewusst leer in SLC-531 — additive Aenderung, keine Auswirkung auf
-- bestehende email_templates-Rows.

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- \d branding_settings
-- SELECT count(*) FROM branding_settings;                            -- erwartet: 1
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'branding';
-- SELECT polname FROM pg_policies WHERE tablename = 'branding_settings';
