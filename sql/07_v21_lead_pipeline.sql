-- ============================================================
-- V2.1 Migration: Lead-Management-Pipeline
-- ============================================================
-- Adds third pipeline for marketing outreach / lead qualification
-- Idempotent: kann mehrfach laufen
-- ============================================================

-- Pipeline: Lead-Management
INSERT INTO pipelines (id, name, description, sort_order)
VALUES ('b0000000-0000-0000-0000-000000000003', 'Lead-Management', 'Marketing-Outreach und Lead-Qualifizierung', 3)
ON CONFLICT (id) DO NOTHING;

-- 7 Stages für Lead-Management
INSERT INTO pipeline_stages (pipeline_id, name, color, sort_order, probability) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'Identifiziert', '#94a3b8', 1, 5),
  ('b0000000-0000-0000-0000-000000000003', 'Angeschrieben', '#6366f1', 2, 10),
  ('b0000000-0000-0000-0000-000000000003', 'Follow-up 1', '#8b5cf6', 3, 15),
  ('b0000000-0000-0000-0000-000000000003', 'Follow-up 2', '#a855f7', 4, 20),
  ('b0000000-0000-0000-0000-000000000003', 'Follow-up 3', '#d946ef', 5, 25),
  ('b0000000-0000-0000-0000-000000000003', 'Reagiert', '#f59e0b', 6, 40),
  ('b0000000-0000-0000-0000-000000000003', 'Qualifiziert', '#22c55e', 7, 60)
ON CONFLICT DO NOTHING;
