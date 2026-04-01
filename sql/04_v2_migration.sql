-- ============================================================
-- V2 Migration: Revenue & Relationship System
-- ============================================================
-- Erweitert bestehende Tabellen, erstellt neue, entfernt content_calendar
-- Idempotent: kann mehrfach laufen (IF NOT EXISTS / IF EXISTS)
-- KEINE auth.users Referenzen (Playbook Problem 9)
-- ============================================================

-- ============================================================
-- 1. BESTEHENDE TABELLEN ERWEITERN
-- ============================================================

-- contacts: +15 Beziehungs-/Qualitätsfelder
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role_in_process TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'de';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_capability TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS access_to_targets TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS thematic_relevance TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trust_level TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_multiplier BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS multiplier_type TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_rhythm TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cooperation_feedback TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_interaction_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- companies: +12 Eignungsfelder
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exit_relevance TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_readiness TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ownership_structure TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS decision_maker_access BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS budget_potential TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS complexity_fit BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS willingness BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS champion_potential BOOLEAN;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS strategic_relevance TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS blueprint_fit TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_range TEXT;

-- deals: +4 Felder
ALTER TABLE deals ADD COLUMN IF NOT EXISTS opportunity_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_lost_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS won_lost_details TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS referral_source_id UUID;

-- activities: +8 strukturierte Gesprächsfelder
ALTER TABLE activities ADD COLUMN IF NOT EXISTS conversation_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS participants TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS objections TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS opportunities TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS next_steps TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS qualification_signals TEXT;

-- ============================================================
-- 2. NEUE TABELLEN
-- ============================================================

-- E-Mails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft',
  follow_up_status TEXT DEFAULT 'none',
  follow_up_date DATE,
  template_used TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proposals (Angebote)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft',
  scope_notes TEXT,
  price_range TEXT,
  objections TEXT,
  negotiation_notes TEXT,
  won_lost_reason TEXT,
  won_lost_details TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fit Assessments (Qualifizierung)
CREATE TABLE IF NOT EXISTS fit_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  exit_relevance_score INT,
  ai_readiness_score INT,
  decision_maker_score INT,
  budget_score INT,
  complexity_score INT,
  willingness_score INT,
  champion_score INT,
  strategic_score INT,
  target_access_score INT,
  trust_score INT,
  professionalism_score INT,
  referral_quality_score INT,
  cooperation_score INT,
  conflict_score INT,
  brand_fit_score INT,
  overall_score INT,
  traffic_light TEXT,
  verdict TEXT,
  reason TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  assessed_by UUID
);

-- Tasks (eigenständige Aufgaben)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Handoffs (Übergabe an System 1)
CREATE TABLE IF NOT EXISTS handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  entry_track TEXT,
  contacts_transferring TEXT,
  pre_information TEXT,
  conversation_insights TEXT,
  expectations TEXT,
  documents_included TEXT,
  status TEXT DEFAULT 'pending',
  handed_off_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referrals (Empfehlungs-Tracking)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  referral_date DATE,
  quality TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Signals (markierte Signale)
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. CONTENT_CALENDAR ENTFERNEN
-- ============================================================

DROP TABLE IF EXISTS content_calendar;

-- ============================================================
-- 4. INDEXES FÜR NEUE TABELLEN
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_emails_contact ON emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_deal ON emails(deal_id);
CREATE INDEX IF NOT EXISTS idx_emails_follow_up ON emails(follow_up_status) WHERE follow_up_status != 'none';
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals(deal_id);
CREATE INDEX IF NOT EXISTS idx_fit_entity ON fit_assessments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_deal ON handoffs(deal_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_signals_contact ON signals(contact_id);
CREATE INDEX IF NOT EXISTS idx_signals_deal ON signals(deal_id);
CREATE INDEX IF NOT EXISTS idx_contacts_multiplier ON contacts(is_multiplier) WHERE is_multiplier = true;
CREATE INDEX IF NOT EXISTS idx_companies_blueprint_fit ON companies(blueprint_fit);

-- ============================================================
-- 5. RLS + GRANTS FÜR NEUE TABELLEN
-- ============================================================

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- V1: authenticated full access (gleich wie bestehende Tabellen)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['emails', 'proposals', 'fit_assessments', 'tasks', 'handoffs', 'referrals', 'signals']
  LOOP
    EXECUTE format('CREATE POLICY IF NOT EXISTS "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- Table-level grants (Playbook Problem 9: BYPASSRLS != table permissions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================
-- 6. PIPELINE SEEDS (alte löschen, neue einfügen)
-- ============================================================

-- Alte Pipeline-Daten löschen (Cascade löscht Stages + Deals)
DELETE FROM pipeline_stages;
DELETE FROM deals;
DELETE FROM pipelines;

-- Pipeline: Multiplikatoren (10 Stufen)
INSERT INTO pipelines (id, name, description, sort_order)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Multiplikatoren', 'Beziehungsaufbau + Empfehlungen', 1);

INSERT INTO pipeline_stages (pipeline_id, name, color, sort_order, probability) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Identifiziert', '#94a3b8', 1, 5),
  ('b0000000-0000-0000-0000-000000000001', 'Recherchiert', '#6366f1', 2, 10),
  ('b0000000-0000-0000-0000-000000000001', 'Erstansprache geplant', '#8b5cf6', 3, 15),
  ('b0000000-0000-0000-0000-000000000001', 'Erstkontakt erfolgt', '#a855f7', 4, 25),
  ('b0000000-0000-0000-0000-000000000001', 'Gespräch geführt', '#d946ef', 5, 35),
  ('b0000000-0000-0000-0000-000000000001', 'Potenzial vorhanden', '#f59e0b', 6, 50),
  ('b0000000-0000-0000-0000-000000000001', 'Aktiv in Beziehungspflege', '#f97316', 7, 65),
  ('b0000000-0000-0000-0000-000000000001', 'Erste Empfehlung erhalten', '#22c55e', 8, 80),
  ('b0000000-0000-0000-0000-000000000001', 'Strategischer Multiplikator', '#10b981', 9, 95),
  ('b0000000-0000-0000-0000-000000000001', 'Inaktiv / disqualifiziert', '#ef4444', 10, 0);

-- Pipeline: Unternehmer-Chancen (12 Stufen)
INSERT INTO pipelines (id, name, description, sort_order)
VALUES ('b0000000-0000-0000-0000-000000000002', 'Unternehmer-Chancen', 'Deal-Pipeline: Signal bis Übergabe', 2);

INSERT INTO pipeline_stages (pipeline_id, name, color, sort_order, probability) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Signal eingegangen', '#94a3b8', 1, 5),
  ('b0000000-0000-0000-0000-000000000002', 'Erste Einordnung', '#6366f1', 2, 10),
  ('b0000000-0000-0000-0000-000000000002', 'Qualifikation geplant', '#8b5cf6', 3, 15),
  ('b0000000-0000-0000-0000-000000000002', 'Erstgespräch geführt', '#a855f7', 4, 25),
  ('b0000000-0000-0000-0000-000000000002', 'Fit wahrscheinlich', '#d946ef', 5, 40),
  ('b0000000-0000-0000-0000-000000000002', 'Vertiefung / Bedarfsschärfung', '#f59e0b', 6, 55),
  ('b0000000-0000-0000-0000-000000000002', 'Angebot vorbereitet', '#f97316', 7, 65),
  ('b0000000-0000-0000-0000-000000000002', 'Angebot offen', '#fb923c', 8, 75),
  ('b0000000-0000-0000-0000-000000000002', 'Verhandlung / Einwände', '#fbbf24', 9, 85),
  ('b0000000-0000-0000-0000-000000000002', 'Gewonnen', '#22c55e', 10, 100),
  ('b0000000-0000-0000-0000-000000000002', 'Verloren', '#ef4444', 11, 0),
  ('b0000000-0000-0000-0000-000000000002', 'Geparkt', '#94a3b8', 12, 0);

-- Alte Seed-Firmen/-Kontakte löschen (V2 startet frisch)
DELETE FROM activities;
DELETE FROM documents;
DELETE FROM contacts;
DELETE FROM companies;
