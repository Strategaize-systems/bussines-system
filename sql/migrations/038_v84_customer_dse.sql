-- =============================================================
-- MIG-038 — V8.4 SLC-841 legal_documents + teams.slug (Phase 1-4)
-- =============================================================
--
-- Foundation-Schema fuer V8.4 Customer-DSE (FEAT-824 / BL-488):
--   Phase 1: legal_documents (RLS auf team_id-Scope, 2 Policies, GRANTs)
--   Phase 2: teams.slug ADD COLUMN + Backfill (Umlaut-safe Slugify)
--   Phase 3: teams.slug SET NOT NULL + UNIQUE-Index auf lower(slug)
--   Phase 4: teams.slug SET DEFAULT ('t-' + uuid-hex)
--
-- Phase 5 (Default-Seed INSERT in legal_documents) wird in SLC-842
-- nachgezogen, nachdem das Default-Markdown-File erstellt wurde.
--
-- Idempotent applizierbar (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- Apply-Procedure: .claude/rules/sql-migration-hetzner.md
--   ssh root@91.98.20.191
--   docker ps --format "{{.Names}}" | grep supabase-db
--   echo '<base64>' | base64 -d > /tmp/038_v84_customer_dse.sql
--   docker exec -i <container> psql -U postgres -d postgres < /tmp/038_v84_customer_dse.sql
--
-- Pflicht-Reuse:
--   - GRANTs auf authenticated + service_role per feedback_migration_rls_needs_grants
--   - NOTIFY pgrst als letzte Anweisung per reference_postgrest_schema_reload
--   - V7-Helper is_admin() + get_my_team_id() aus MIG-035
--
-- Slugify-Anmerkung: translate() in der urspruenglichen Spec konnte
-- 1→2-Char-Umlaut-Mappings nicht abbilden (ä→ae). Hier per chained
-- replace() ersetzt. Best-Effort-Defense fuer kuenftige Umlaut-Teams;
-- kanonische Slug-Quelle wird in SLC-842 lib/team/slug.ts.

-- ---------------- Phase 1: legal_documents -------------------

CREATE TABLE IF NOT EXISTS legal_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('customer-dse')),
  content_md      TEXT NOT NULL,
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_team_id, kind)
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_documents_select_team ON legal_documents;
CREATE POLICY legal_documents_select_team ON legal_documents
  FOR SELECT TO authenticated
  USING (is_admin() OR tenant_team_id = get_my_team_id());

DROP POLICY IF EXISTS legal_documents_admin_mutate ON legal_documents;
CREATE POLICY legal_documents_admin_mutate ON legal_documents
  FOR ALL TO authenticated
  USING (is_admin() AND tenant_team_id = get_my_team_id())
  WITH CHECK (is_admin() AND tenant_team_id = get_my_team_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO service_role;

-- ---------------- Phase 2: teams.slug + Backfill -------------

ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  r          record;
  base_slug  text;
  candidate  text;
  suffix     int;
BEGIN
  FOR r IN SELECT id, name FROM teams WHERE slug IS NULL ORDER BY created_at LOOP
    -- Umlaut-Expansion (1→2 chars): replace() pro Pair
    base_slug := r.name;
    base_slug := replace(base_slug, 'ä', 'ae');
    base_slug := replace(base_slug, 'ö', 'oe');
    base_slug := replace(base_slug, 'ü', 'ue');
    base_slug := replace(base_slug, 'Ä', 'Ae');
    base_slug := replace(base_slug, 'Ö', 'Oe');
    base_slug := replace(base_slug, 'Ü', 'Ue');
    base_slug := replace(base_slug, 'ß', 'ss');
    -- Normalisierung: lower, non-slug-chars → '-', collapse, trim, max 60
    base_slug := lower(base_slug);
    base_slug := regexp_replace(base_slug, '[^a-z0-9-]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    base_slug := left(base_slug, 60);
    -- Empty-Fallback: Sonderzeichen-only-Names → 't-<uuid8>'
    IF base_slug = '' THEN
      base_slug := 't-' || substring(r.id::text, 1, 8);
    END IF;
    -- Konflikt-Loop: -2, -3, ...
    candidate := base_slug;
    suffix    := 2;
    WHILE EXISTS (SELECT 1 FROM teams WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || suffix;
      suffix    := suffix + 1;
    END LOOP;
    UPDATE teams SET slug = candidate WHERE id = r.id;
  END LOOP;
END$$;

-- ---------------- Phase 3: NOT NULL + UNIQUE -----------------

ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_lower_unique
  ON teams (lower(slug));

-- ---------------- Phase 4: DEFAULT-Patch ---------------------

ALTER TABLE teams
  ALTER COLUMN slug
  SET DEFAULT ('t-' || replace(gen_random_uuid()::text, '-', ''));

-- ---------------- Schema-Reload ------------------------------

NOTIFY pgrst, 'reload schema';
