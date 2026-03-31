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

-- V1: ALL tables get simple authenticated full access (including profiles)
-- auth.uid() is not available during DB init (GoTrue creates it later)
-- V2+: Replace profiles policy with auth.uid() check after GoTrue is running
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'companies', 'contacts', 'pipelines', 'pipeline_stages', 'deals', 'activities', 'documents', 'content_calendar']
  LOOP
    EXECUTE format('CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- ============================================================
-- Storage Bucket for Documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload/download/delete in documents bucket
CREATE POLICY "authenticated_upload_documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "authenticated_read_documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "authenticated_delete_documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
