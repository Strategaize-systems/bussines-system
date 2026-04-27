-- =====================================================
-- MIG-024 — V5.3 SLC-531 Branding Storage Public-Read Fix
-- =====================================================
-- Discovered while running SLC-531 Browser-Smoke 2026-04-27 (RPT-224 Folge):
--   Logo-Upload klappt, "Logo aktualisiert."-Meldung erscheint, aber das
--   <img>-Tag im Browser zeigt broken-image. Zwei Ursachen:
--   1. admin.storage.getPublicUrl() baut die URL aus SUPABASE_URL
--      (= http://supabase-kong:8000, intern). Browser kann den Hostname
--      nicht aufloesen. Fix in cockpit/src/app/(app)/settings/branding/actions.ts:
--      manuelles URL-Bauen aus NEXT_PUBLIC_SUPABASE_URL.
--   2. Bucket war zwar `public=true`, aber `storage.objects` hatte 0 Policies.
--      Bei Self-Hosted Supabase reicht `public=true` allein nicht — anonymous
--      Read braucht eine explizite SELECT-Policy. Bisher hat kein Bucket eine
--      Public-Read-Policy gehabt (alle bisherigen Buckets sind private +
--      service_role-only via BYPASSRLS). `branding` ist der erste Public-Bucket.
--
-- Diese Migration:
--   1. SELECT-Policy "branding_public_read" fuer anon + authenticated
--   2. UPDATE bestehende branding_settings.logo_url die noch die interne
--      Docker-URL enthaelt -> auf NULL setzen, damit der User das Logo neu
--      hochlaedt und die korrigierte externe URL gespeichert wird.
--      (String-Replace ist fragil, weil der NEXT_PUBLIC_SUPABASE_URL-Wert
--      in der Migration nicht bekannt ist; Re-Upload ist sauberer.)
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY; UPDATE mit WHERE-Filter.
-- =====================================================

-- 1. SELECT-Policy fuer Public-Read auf branding-Bucket
-- =====================================================

DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;

CREATE POLICY "branding_public_read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'branding');

-- 2. Bestehende interne Docker-URLs auf NULL — User laedt nach Code-Fix neu hoch
-- =====================================================

UPDATE branding_settings
   SET logo_url = NULL,
       updated_at = now()
 WHERE logo_url LIKE 'http://supabase-kong:%';

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- SELECT policyname, roles::text, cmd FROM pg_policies
--   WHERE schemaname='storage' AND tablename='objects' AND policyname='branding_public_read';
-- SELECT logo_url FROM branding_settings;
-- curl -I https://business.strategaizetransition.com/supabase/storage/v1/object/public/branding/<datei>
--   (erwartet: 200 OK nach erneutem Upload mit gefixtem actions.ts-Code)
