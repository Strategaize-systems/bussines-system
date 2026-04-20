-- ============================================================
-- MIG-018 — V6 Activity KPI Targets
-- Date: 2026-04-20
-- Scope: 1 neue Tabelle, rein additiv
-- ============================================================

CREATE TABLE activity_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  kpi_key TEXT NOT NULL,
  daily_target INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_activity_kpi_targets_unique ON activity_kpi_targets(user_id, kpi_key);
CREATE INDEX idx_activity_kpi_targets_user ON activity_kpi_targets(user_id) WHERE active = true;

ALTER TABLE activity_kpi_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON activity_kpi_targets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON activity_kpi_targets TO authenticated;
GRANT ALL ON activity_kpi_targets TO service_role;
