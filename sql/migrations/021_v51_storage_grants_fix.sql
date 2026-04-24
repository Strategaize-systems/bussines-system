-- =====================================================
-- MIG-021 — V5.1 Storage Grants + Role Delegation Fix
-- =====================================================
-- Discovered while verifying SLC-514 Call-Recording-Pipeline E2E
-- on 2026-04-24 (ISSUE-040).
--
-- Root cause:
--   supabase_storage_admin (connection user for storage-api) could not
--   execute `set_config('role', 'service_role', ...)` because role
--   membership grants were missing. Every storage upload failed with:
--     "new row violates row-level security policy"
--   which mapped to PostgreSQL error 42501 in call_string_check_hook.
--
--   Secondary issue: the `service_role`, `anon`, and `authenticated` roles
--   did not have USAGE on the `storage` schema or the proper search_path,
--   so queries like `select from buckets` failed with "relation does not
--   exist" once set_config succeeded.
--
-- Impact:
--   - SLC-514 Call-Recording pipeline blocked (detected, fixed here)
--   - Meeting-Recording upload (V4.1) silently broken since last Supabase
--     upgrade — no meeting recording had been uploaded since, so it was
--     masked. Same root cause, same fix.
--
-- This migration is idempotent: safe to run on fresh DBs and on existing
-- environments. `GRANT ... ON SCHEMA` and `ALTER ROLE ... SET search_path`
-- are natively idempotent; role membership grants are no-ops if already set.
--
-- =====================================================

-- 1. Role membership — let supabase_storage_admin impersonate the
--    Supabase request roles (service_role, authenticated, anon)
--    so that set_config('role', ...) succeeds inside storage queries.

GRANT anon, authenticated, service_role TO supabase_storage_admin;

-- 2. Schema usage on `storage` for the Supabase request roles.
--    Without USAGE, even a role with BYPASSRLS cannot reach the tables.

GRANT USAGE ON SCHEMA storage TO service_role, anon, authenticated;

-- 3. Table-level grants inside the storage schema.
--    service_role gets full CRUD (needed by the storage-api's nested
--    set_config('role', 'service_role', ...) path). anon and
--    authenticated get read-only (for public-bucket reads).

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage
  TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA storage
  TO anon, authenticated;

-- 4. search_path so that storage-api queries like `select from buckets`
--    (without schema prefix) still resolve after the role swap.

ALTER ROLE service_role   SET search_path TO storage, public;
ALTER ROLE anon           SET search_path TO storage, public;
ALTER ROLE authenticated  SET search_path TO storage, public;

-- 5. Remove the call-recordings RLS policies from MIG-020.
--    They were mis-specified (FOR ALL USING without WITH CHECK blocks
--    INSERT by design). We now rely on BYPASSRLS via service_role, same
--    pattern as the meeting-recordings bucket which works without any
--    object-level policies.

DROP POLICY IF EXISTS "call_recordings_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "call_recordings_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "call_recordings_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "call_recordings_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "call_recordings_service_all" ON storage.objects;
