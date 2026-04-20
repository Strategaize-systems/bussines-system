-- ============================================================
-- MIG-017 — V6 Schema: Produkte, Deal-Produkte, Ziele, KPI-Snapshots
-- Date: 2026-04-20
-- Scope: 4 neue Tabellen, rein additiv, keine bestehende Tabelle wird geaendert
-- ============================================================

-- 1. products (DEC-055)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  standard_price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category) WHERE category IS NOT NULL;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- 2. deal_products (DEC-057)
CREATE TABLE deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price NUMERIC(12,2),
  quantity INT DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deal_products_deal ON deal_products(deal_id);
CREATE INDEX idx_deal_products_product ON deal_products(product_id);
CREATE UNIQUE INDEX idx_deal_products_unique ON deal_products(deal_id, product_id);

ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON deal_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON deal_products TO authenticated;
GRANT ALL ON deal_products TO service_role;

-- 3. goals (DEC-058)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start DATE NOT NULL,
  target_value NUMERIC(12,2) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goals_user_period ON goals(user_id, period_start);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_status ON goals(status) WHERE status = 'active';
CREATE INDEX idx_goals_product ON goals(product_id) WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX idx_goals_unique ON goals(
  user_id, type, period, period_start,
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON goals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goals TO service_role;

-- 4. kpi_snapshots (DEC-059)
CREATE TABLE kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  kpi_type TEXT NOT NULL,
  kpi_value NUMERIC(14,4) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  period TEXT NOT NULL DEFAULT 'day',
  calculation_basis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_kpi_snapshots_unique ON kpi_snapshots(
  snapshot_date, user_id, kpi_type, period,
  COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

CREATE INDEX idx_kpi_snapshots_lookup ON kpi_snapshots(user_id, kpi_type, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(snapshot_date DESC);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON kpi_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON kpi_snapshots TO authenticated;
GRANT ALL ON kpi_snapshots TO service_role;
