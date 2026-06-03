-- =====================================================
-- MIG-043 — V8.13 Storage-Schema GRANTs Hotfix (ISSUE-088 Root-Fix)
-- =====================================================
-- Slice: SLC-894 (BS V8.13 Storage+Auth Hotfix-Slice)
-- Audit-Quelle: RPT-573 (V8.13 Investigation 2026-06-03)
-- Pre-Apply-Audit: slices/SLC-894-pre-apply-audit.md
--
-- Problem heute (Pre-Apply-Audit auf BS Production 2026-06-03):
--   Rolle `authenticated` und `anon` haben NUR `SELECT` auf alle 5 Tables
--   im storage-Schema (buckets, migrations, objects, s3_multipart_uploads,
--   s3_multipart_uploads_parts). Folge: jeder Storage-INSERT via Supabase-JS
--   mit GoTrue-Cookie-Session scheitert mit:
--
--     {"code":"42501","file":"aclchk.c","line":"3650",
--      "routine":"aclcheck_error",
--      "message":"new row violates row-level security policy"}
--
--   `aclchk.c:3650` ist die PostgreSQL Access-Control-Layer (GRANT-Check).
--   Storage v1.11.13 castet ALLE 42501-Errors zu "row-level security policy"
--   Message → diagnostische Verwirrung. Echte Ursache: fehlende
--   table-level INSERT/UPDATE/DELETE-GRANT.
--
-- Cross-Repo-Versions-Matrix (RPT-573):
--   BS (heute) : GoTrue v2.160.0 + Storage v1.11.13 → nur SELECT
--   OP (heute) : GoTrue v2.160.0 + Storage v1.11.13 → KEINE GRANTs
--   IS         : GoTrue v2.186.0 + Storage v1.44.2  → volle CRUD (Default)
--   ImSch      : GoTrue v2.186.0 + Storage v1.44.2  → volle CRUD (Default)
--
--   IS + ImSch laufen Versionen die die Default-GRANTs Init-Script-seitig
--   setzen. BS + OP auf alten Versionen tun das nicht. Diese Migration
--   bringt BS + OP auf den Standard-Supabase-Default-State.
--
-- Fix:
--   1. GRANT SELECT, INSERT, UPDATE, DELETE auf alle bestehenden Tables
--      im storage-Schema fuer `authenticated` + `anon`.
--   2. GRANT USAGE, SELECT auf alle Sequences (aktuell 0 Sequences, aber
--      defensive No-Op fuer Future-Proofness bei Storage-Container-Upgrades).
--   3. ALTER DEFAULT PRIVILEGES, damit zukuenftige Tables/Sequences (z.B.
--      bei Container-Upgrade auf v1.44+) automatisch die richtigen GRANTs
--      bekommen.
--   4. NOTIFY pgrst, 'reload schema' damit PostgREST den GRANT-Cache flusht.
--
-- Was die Migration NICHT macht:
--   - KEIN REVOKE (additiv only).
--   - KEINE Aenderung an service_role-GRANTs.
--   - KEINE Aenderung an Schema-USAGE (`storage`-USAGE bereits aus MIG-021
--     V5.1 fuer alle drei Rollen gesetzt).
--   - KEINE Aenderung an RLS-Policies. RLS-Defense aus MIG-041 V8.10
--     (4 documents_user_* Policies mit first-path-segment-Filter) bleibt
--     aktiv und greift weiterhin (AC-894-4).
--
-- Idempotent: GRANT-Statements sind in PostgreSQL nativ idempotent (No-Op
-- bei bereits gewaehrten Privileges). ALTER DEFAULT PRIVILEGES ueberschreibt
-- bestehende Eintraege fuer die gleiche (role_for, schema, obj_type)-Tupel.
--
-- Anwenden via SSH+base64+psql analog .claude/rules/sql-migration-hetzner.md
-- (als `postgres` Superuser im Container).

-- =====================================================
-- 1. Table-level GRANTs (idempotent additive)
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA storage
  TO authenticated, anon;

-- =====================================================
-- 2. Sequence-level GRANTs (idempotent, defensive)
-- =====================================================
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA storage
  TO authenticated, anon;

-- =====================================================
-- 3. ALTER DEFAULT PRIVILEGES (Future-Proofness fuer Container-Upgrades)
-- =====================================================
-- Default-Privileges greifen nur fuer Objekte, die von der ausfuehrenden
-- Rolle (hier: `postgres`) erstellt werden. Bei Storage-Container-Upgrades
-- legt das Storage-Init-Script die neuen Tables/Sequences typischerweise
-- als `supabase_storage_admin` an — fuer dessen-Erstellungen muessen wir
-- separate Default-Privileges definieren.
ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT USAGE, SELECT
  ON SEQUENCES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO authenticated, anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT USAGE, SELECT
  ON SEQUENCES
  TO authenticated, anon;

-- =====================================================
-- 4. PostgREST Schema-Cache-Flush
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verifikations-Queries (manuell, nach Apply)
-- =====================================================
-- SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema='storage'
--    AND grantee IN ('authenticated','anon')
--    AND privilege_type IN ('INSERT','UPDATE','DELETE')
--  ORDER BY table_name, grantee, privilege_type;
--   -- Erwartet: 30 Rows (5 Tables * 2 Roles * 3 Privileges).
--
-- SELECT polname FROM pg_policies
--  WHERE schemaname='storage' AND tablename='objects'
--    AND polname LIKE 'documents_user_%'
--  ORDER BY polname;
--   -- Erwartet: 4 Rows (RLS-Defense bleibt aktiv, AC-894-4).
