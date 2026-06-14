-- MIG-053 — V8.15 SLC-913 MT-7: Per-Tenant Export-API-Keys (ISSUE-116 Medium:
--   Export-/winloss-/performance-Read-APIs dumpen alle Owner-Rows via service_role
--   mit EINEM geteilten EXPORT_API_KEY, kein Tenant-/Ownership-Scope).
--
-- Entscheidung DEC-302: per-Tenant-Keys gemappt auf owner_user_id (team-expandiert
--   ueber profiles.team_id), statt des einen globalen EXPORT_API_KEY. Die Read-APIs
--   filtern dann auf die Identitaet des Keys (.in(owner_user_id/created_by/
--   decided_by, teamMemberIds)). Begruendung gegen RLS-gebundene Identitaet
--   (Alternative): die Routen nutzen bereits createAdminClient; ein Key->owner-
--   Mapping + expliziter Filter ist der kleinere, testbarere Eingriff und haelt
--   die Service-Layer-Persistenz konsistent (Pattern wie lib/export/auth.ts).
--
-- Tabelle: export_api_keys. Der ROH-Key wird NIE persistiert — nur sein SHA-256-
--   Hash (key_hash). Aufloesung: hashExportKey(bearer) == key_hash AND revoked_at
--   IS NULL. Provisionierung out-of-band (kein Secret in der Migration):
--     RAW=$(openssl rand -hex 32)
--     INSERT INTO export_api_keys(key_hash, owner_user_id, label)
--       VALUES (encode(digest('<RAW>','sha256'),'hex'), '<founder-user-id>', 'system-4');
--   (System 4 sendet danach `Authorization: Bearer <RAW>`.)
--
-- Sicherheits-Hygiene fuer neue public-Objekte (strategaize-pattern-reuse.md Row
--   "Public-View-Exposure-Hardening" / Supabase-Self-hosted-Default-Grants):
--   REVOKE ALL FROM anon, authenticated + GRANT nur an service_role. Sonst waere
--   die Key-Tabelle anonym ueber PostgREST /rest/v1/export_api_keys lesbar.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS-Indizes + REVOKE/GRANT.
-- Rollback: DROP TABLE IF EXISTS public.export_api_keys; und EXPORT_API_KEY-ENV
--   in den Routen reaktivieren (vorherige verifyExportApiKey-Variante).

CREATE TABLE IF NOT EXISTS public.export_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash      text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         text,
  scope         text NOT NULL DEFAULT 'read' CHECK (scope IN ('read')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz
);

-- Aktiv-Lookup (revoked_at IS NULL) — der Hot-Path der Auth-Aufloesung.
CREATE INDEX IF NOT EXISTS idx_export_api_keys_active
  ON public.export_api_keys (key_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_export_api_keys_owner
  ON public.export_api_keys (owner_user_id);

ALTER TABLE public.export_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_api_keys FORCE ROW LEVEL SECURITY;

-- Kein anon/authenticated-Zugriff: service_role-only (Admin-verwaltet). Ohne
-- Policy + nach REVOKE = Default-Deny fuer alle anderen Rollen.
REVOKE ALL ON public.export_api_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_api_keys TO service_role;

NOTIFY pgrst, 'reload schema';
