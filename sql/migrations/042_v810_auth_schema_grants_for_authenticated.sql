-- =====================================================
-- MIG-042 — V8.10 SLC-893 MT-6 auth-Schema-GRANTs fuer authenticated
-- =====================================================
-- Discovery 2026-06-03 (BS V8.10 SLC-893 MT-6 Live-Smoke):
--   `authenticated` Role hatte auf BS Live-DB KEINE USAGE-Permission auf das
--   `auth`-Schema und KEINE EXECUTE-Permission auf `auth.uid()`. Das ist
--   ein latenter Bug aus frueherer DB-Initialisierung (Standard-Supabase
--   setzt diese GRANTs in `init/00-initial-schema.sql` -> bei BS war das
--   offenbar nicht der Fall).
--
-- Konsequenz ohne Fix:
--   Jede RLS-Policy auf Storage- oder public-Tabellen, die `auth.uid()`
--   ruft, schlaegt fuer `authenticated`-Role permission-denied fehl. Das
--   passt zu der Beobachtung dass `proposal-pdfs`-Bucket seit 2026-05-04
--   nichts neues mehr hochgeladen bekommen hat (8 alte Files aus Mai 2026).
--
-- Fix: idempotent GRANT.
-- Auch fuer anon-Role weil RLS-Policies "TO authenticated, anon" pattern haben.

GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated, anon;

-- =====================================================
-- Verifikation
-- =====================================================
-- SELECT has_schema_privilege('authenticated', 'auth', 'USAGE');
--   -- Erwartet: t
-- SELECT has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE');
--   -- Erwartet: t
