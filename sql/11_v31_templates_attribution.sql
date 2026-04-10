-- V3.1 Migration: Email Templates + Source/Attribution
-- SLC-318: Templates, Duplikate, Attribution

-- Email Templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_de TEXT,
  subject_nl TEXT,
  subject_en TEXT,
  body_de TEXT,
  body_nl TEXT,
  body_en TEXT,
  placeholders JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS authenticated_full_access ON email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON email_templates TO authenticated;

-- Source/Attribution for companies (contacts already has source TEXT)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_detail TEXT;

-- Convert contacts.source from freetext to structured (backward compatible)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_detail TEXT;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_companies_name_lower ON companies(LOWER(name));
