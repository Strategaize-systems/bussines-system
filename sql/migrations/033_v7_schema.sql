-- ============================================================================
-- MIG-033 — V7 Multi-User Schema (Phase A)
-- ============================================================================
-- Datum: 2026-05-12 (Apply via SLC-701 MT-2 vor MIG-034 Backfill)
-- Idempotent: ja (alle CREATE/ALTER mit IF NOT EXISTS / DO-Block-Guards).
-- Strikt additiv — kein Daten-Touch, V6.6-Verhalten bleibt nach Apply funktional
-- weil Code die neuen Spalten noch nicht nutzt (siehe SLC-704).
-- ============================================================================

-- ============================================================================
-- 1) teams-Tabelle (DEC-181)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teams_name_unique UNIQUE (name)
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- V7 Pre-Switch: alle Authenticated duerfen Team-Liste sehen (Verwaltungs-UI).
-- MIG-035 ersetzt das durch admin-only Mutate-Policies, SELECT bleibt offen.
DROP POLICY IF EXISTS teams_authenticated_full_access ON teams;
CREATE POLICY teams_authenticated_full_access
  ON teams
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON teams TO authenticated, service_role;


-- ============================================================================
-- 2) profiles erweitern (role-CHECK + team_id-FK)  (DEC-181)
-- ============================================================================

-- Defense-in-Depth: bestehende Roles validieren (V6.6 = nur 'admin').
DO $$
DECLARE
  rogue_count INT;
BEGIN
  SELECT COUNT(*) INTO rogue_count
    FROM profiles
   WHERE role IS NOT NULL
     AND role NOT IN ('admin', 'teamlead', 'member');
  IF rogue_count > 0 THEN
    RAISE EXCEPTION 'profiles.role enthaelt % unbekannte Werte — Backfill noetig vor CHECK-Constraint', rogue_count;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'teamlead', 'member'));
  END IF;
END$$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);

-- Hinweis: profiles.team TEXT (V3 MIG-005) bleibt deprecated. Drop kommt in
-- spaeterer V7.x-Cleanup-Migration nach Code-Migration auf team_id.


-- ============================================================================
-- 3) 8 Kerntabellen + owner_user_id (DEC-182)
-- ============================================================================
-- Pro Tabelle: ADD COLUMN nullable (Backfill in MIG-034) + Index.
-- NULL bleibt erlaubt fuer System-Records (Cron-Inserts ohne User-Context).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_owner_user_id ON companies(owner_user_id);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_owner_user_id ON contacts(owner_user_id);

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deals_owner_user_id ON deals(owner_user_id);

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activities_owner_user_id ON activities(owner_user_id);

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_owner_user_id ON meetings(owner_user_id);

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_owner_user_id ON proposals(owner_user_id);

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_owner_user_id ON email_messages(owner_user_id);

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_owner_user_id ON calls(owner_user_id);


-- ============================================================================
-- 4) audit_log erweitern um Drilldown-Audit-Spalte (DEC-188)
-- ============================================================================

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS view_as_target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_view_as
  ON audit_log(view_as_target_user_id)
  WHERE view_as_target_user_id IS NOT NULL;


-- ============================================================================
-- 5) Verifikation (rein lesend, Apply-Telemetrie via RAISE NOTICE)
-- ============================================================================

DO $$
DECLARE
  v_team_count   INT;
  v_owner_cols   INT;
  v_indexes      INT;
BEGIN
  SELECT COUNT(*) INTO v_team_count FROM teams;

  SELECT COUNT(*) INTO v_owner_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND column_name  = 'owner_user_id'
     AND table_name IN ('companies','contacts','deals','activities',
                        'meetings','proposals','email_messages','calls');

  SELECT COUNT(*) INTO v_indexes
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname LIKE 'idx_%_owner_user_id';

  RAISE NOTICE 'MIG-033 verify: teams=% rows, owner_user_id-Spalten=% / 8, owner-Indizes=% / 8',
    v_team_count, v_owner_cols, v_indexes;

  IF v_owner_cols <> 8 THEN
    RAISE EXCEPTION 'MIG-033: owner_user_id fehlt auf % von 8 Kerntabellen', 8 - v_owner_cols;
  END IF;
  IF v_indexes < 8 THEN
    RAISE EXCEPTION 'MIG-033: nur % von 8 owner-Indizes existieren', v_indexes;
  END IF;
END$$;
