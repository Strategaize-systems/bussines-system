-- ============================================================
-- Row Level Security — V1 (Single User)
-- ============================================================
-- V1: Authenticated user has full access to everything.
-- V2+: Replace with team/tenant-based policies.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- Profiles: user can read/update own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- All other tables: authenticated user has full access (V1)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['companies', 'contacts', 'pipelines', 'pipeline_stages', 'deals', 'activities', 'documents', 'content_calendar']
  LOOP
    EXECUTE format('CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
