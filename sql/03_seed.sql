-- ============================================================
-- Seed Data — V1 Development
-- ============================================================

-- Pipeline: Endkunden
INSERT INTO pipelines (id, name, description, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Endkunden', 'Direkte Kundenakquise', 1);

INSERT INTO pipeline_stages (pipeline_id, name, color, sort_order, probability) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Neu', '#6366f1', 1, 10),
  ('a0000000-0000-0000-0000-000000000001', 'Kontaktiert', '#8b5cf6', 2, 20),
  ('a0000000-0000-0000-0000-000000000001', 'Qualifiziert', '#a855f7', 3, 40),
  ('a0000000-0000-0000-0000-000000000001', 'Proposal', '#f59e0b', 4, 60),
  ('a0000000-0000-0000-0000-000000000001', 'Verhandlung', '#f97316', 5, 80),
  ('a0000000-0000-0000-0000-000000000001', 'Gewonnen', '#22c55e', 6, 100),
  ('a0000000-0000-0000-0000-000000000001', 'Verloren', '#ef4444', 7, 0);

-- Pipeline: Multiplikatoren
INSERT INTO pipelines (id, name, description, sort_order)
VALUES ('a0000000-0000-0000-0000-000000000002', 'Multiplikatoren', 'Steuerberater, Verbände, Partner', 2);

INSERT INTO pipeline_stages (pipeline_id, name, color, sort_order, probability) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Identifiziert', '#6366f1', 1, 10),
  ('a0000000-0000-0000-0000-000000000002', 'Erstkontakt', '#8b5cf6', 2, 20),
  ('a0000000-0000-0000-0000-000000000002', 'Im Gespräch', '#a855f7', 3, 40),
  ('a0000000-0000-0000-0000-000000000002', 'Kooperation aktiv', '#22c55e', 4, 80),
  ('a0000000-0000-0000-0000-000000000002', 'Inaktiv', '#94a3b8', 5, 0);

-- Sample Companies
INSERT INTO companies (name, industry, website, email, tags) VALUES
  ('Mustermann GmbH', 'Beratung', 'https://mustermann.de', 'info@mustermann.de', ARRAY['prospect', 'kmu']),
  ('Schmidt & Partner', 'Steuerberatung', 'https://schmidt-partner.de', 'kontakt@schmidt-partner.de', ARRAY['multiplikator', 'steuerberater']),
  ('TechStart AG', 'IT / Software', 'https://techstart.de', 'hello@techstart.de', ARRAY['prospect', 'tech']);

-- Sample Contacts
INSERT INTO contacts (first_name, last_name, email, position, company_id, tags) VALUES
  ('Max', 'Mustermann', 'max@mustermann.de', 'Geschäftsführer',
    (SELECT id FROM companies WHERE name = 'Mustermann GmbH'), ARRAY['entscheider']),
  ('Anna', 'Schmidt', 'anna@schmidt-partner.de', 'Partnerin',
    (SELECT id FROM companies WHERE name = 'Schmidt & Partner'), ARRAY['multiplikator', 'steuerberater']),
  ('Lukas', 'Weber', 'lukas@techstart.de', 'CTO',
    (SELECT id FROM companies WHERE name = 'TechStart AG'), ARRAY['tech', 'entscheider']);
