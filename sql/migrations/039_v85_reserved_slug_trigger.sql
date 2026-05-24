-- =============================================================
-- MIG-039 — V8.5 SLC-851 Reserved-Slug-Trigger (Defense-in-Depth)
-- =============================================================
--
-- Schliesst V8.4 ISSUE-080 auf DB-Layer: Reserved-Slug-Defense ist bisher
-- nur in der TS-Application-Layer (`cockpit/src/lib/team/reserved-slugs.ts`
-- + `generateUniqueSlug` + Public-Route `isReservedSlug`-Check). Der
-- SQL-Backfill-Pfad aus MIG-038 Phase 2 + kuenftige direkte SQL-Updates
-- auf `teams.slug` umgehen die Reserved-Liste.
--
-- MIG-039 schliesst die Luecke:
--   - Function `is_reserved_slug(text) RETURNS boolean` mit Case-Insensitive
--     Compare gegen 38-String-Reserved-Liste (Stand 2026-05-24).
--   - Trigger `teams_reserved_slug_guard BEFORE INSERT OR UPDATE OF slug ON teams`
--     wirft `RAISE EXCEPTION '... reserved' USING ERRCODE='23514'` bei Treffer.
--
-- Idempotent applizierbar (CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS).
--
-- Apply-Procedure: .claude/rules/sql-migration-hetzner.md
--   ssh root@91.98.20.191
--   docker ps --format "{{.Names}}" | grep supabase-db
--   echo '<base64>' | base64 -d > /tmp/039_v85_reserved_slug_trigger.sql
--   docker exec -i <container> psql -U postgres -d postgres < /tmp/039_v85_reserved_slug_trigger.sql
--
-- Sync-Pflicht: Reserved-Liste lebt an 2 Stellen — `reserved-slugs.ts` (TS)
-- + `is_reserved_slug()` (PL/pgSQL hier). Bei Aenderungen BEIDE Stellen
-- synchron halten (Memory: feedback_reserved_slug_sst_pattern.md).
-- Build-Time-Codegen TS→SQL ist V9+ Discovery.

-- Vorbedingungs-Check: teams.slug muss existieren (MIG-038 Phase 2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='teams' AND column_name='slug'
  ) THEN
    RAISE EXCEPTION 'MIG-039 requires teams.slug column (MIG-038 not applied)';
  END IF;
END $$;

-- ---------------- Function is_reserved_slug ----------------

CREATE OR REPLACE FUNCTION public.is_reserved_slug(candidate text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(candidate) IN (
    -- Strategaize-Common (cross-Repo)
    'admin', 'api', 'public', 'p', 'partner', 'strategaize',
    'auth', 'assets', '_next', 'favicon.ico',
    -- BS-App-Top-Level — cockpit/src/app root
    'actions', 'consent', 'datenschutz', 'impressum', 'r', 'login',
    -- BS-App-Top-Level — cockpit/src/app/(app)
    'audit-log', 'aufgaben', 'cadences', 'calls', 'campaigns',
    'companies', 'contacts', 'dashboard', 'deals', 'emails',
    'fit-assessment', 'focus', 'handoffs', 'help', 'kalender',
    'calendar', 'meetings', 'mein-tag', 'multiplikatoren', 'pipeline',
    'proposals', 'referrals', 'settings', 'team', 'termine'
  );
$$;

COMMENT ON FUNCTION public.is_reserved_slug(text) IS
  'V8.5 SLC-851: Returns true if slug is on Reserved-Liste. Mirror of cockpit/src/lib/team/reserved-slugs.ts (38 strings, stand 2026-05-24). Sync per memory feedback_reserved_slug_sst_pattern.md.';

-- ---------------- Trigger teams_reserved_slug_guard ----------------

CREATE OR REPLACE FUNCTION public.teams_reserved_slug_guard_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_reserved_slug(NEW.slug) THEN
    RAISE EXCEPTION 'slug "%" is reserved (V8.5 MIG-039)', NEW.slug
      USING ERRCODE = '23514';  -- CHECK_VIOLATION
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teams_reserved_slug_guard ON public.teams;

CREATE TRIGGER teams_reserved_slug_guard
BEFORE INSERT OR UPDATE OF slug ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.teams_reserved_slug_guard_fn();

-- ---------------- Verify ----------------

DO $$
BEGIN
  -- Positive Probe: ein non-reserved slug muss FALSE liefern
  IF public.is_reserved_slug('strategaize-transition-bv') THEN
    RAISE EXCEPTION 'MIG-039 self-test failed: strategaize-transition-bv should not be reserved';
  END IF;
  -- Negative Probe: ein reserved slug muss TRUE liefern
  IF NOT public.is_reserved_slug('admin') THEN
    RAISE EXCEPTION 'MIG-039 self-test failed: admin should be reserved';
  END IF;
  -- Case-Insensitive
  IF NOT public.is_reserved_slug('ADMIN') THEN
    RAISE EXCEPTION 'MIG-039 self-test failed: case-insensitive check broken';
  END IF;
END $$;

-- PostgREST-Schema-Cache reload (Function ist via PostgREST nicht direkt sichtbar,
-- aber Trigger-Effekte sind es — Reload nur Best-Practice).
NOTIFY pgrst, 'reload schema';
