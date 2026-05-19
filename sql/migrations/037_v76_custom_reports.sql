-- =============================================================
-- MIG-037 — V7.6 SLC-762 custom_reports
-- =============================================================
--
-- Owner-scoped Custom-Reports table fuer FEAT-762 (KI-Workspace
-- User-eigene Berichts-Vorlagen). Idempotent applizierbar (IF NOT
-- EXISTS / DROP POLICY IF EXISTS / etc.).
--
-- Apply-Procedure: .claude/rules/sql-migration-hetzner.md
--   ssh root@91.98.20.191
--   docker ps --format "{{.Names}}" | grep supabase-db
--   echo '<base64>' | base64 -d > /tmp/037_v76_custom_reports.sql
--   docker exec -i <container> psql -U postgres -d postgres < /tmp/037_v76_custom_reports.sql
--
-- Pflicht: GRANTs auf authenticated + service_role per
-- feedback_migration_rls_needs_grants (sonst PostgREST 401/500).
-- NOTIFY pgrst als letzte Anweisung per reference_postgrest_schema_reload.

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('mein-tag', 'cockpit')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  prompt_template TEXT NOT NULL CHECK (char_length(prompt_template) BETWEEN 10 AND 2000),
  description TEXT,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_owner_ctx
  ON custom_reports(owner_user_id, context_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_reports_owner_name
  ON custom_reports(owner_user_id, name);

ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_reports_owner_select ON custom_reports;
CREATE POLICY custom_reports_owner_select ON custom_reports
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_insert ON custom_reports;
CREATE POLICY custom_reports_owner_insert ON custom_reports
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_update ON custom_reports;
CREATE POLICY custom_reports_owner_update ON custom_reports
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS custom_reports_owner_delete ON custom_reports;
CREATE POLICY custom_reports_owner_delete ON custom_reports
  FOR DELETE USING (owner_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_reports TO service_role;

NOTIFY pgrst, 'reload schema';
