-- MIG-030 V6.5 — VIES-Cache Tabelle (FEAT-652 / SLC-655 / BL-420)
-- Date: 2026-05-08
-- Reason: Cache-Layer fuer EU-VIES-Online-Lookup mit 24h-TTL (DEC-157).
--   UNIQUE(country, number) schuetzt vor Duplikaten; expires_at-Index erlaubt
--   schnelle Cache-Pruefung. RLS-Pattern konsistent zu V5.7 vat-id-Schema.
-- Risk: Niedrig — additive, idempotent.
-- Rollback: DROP TABLE vat_id_validations CASCADE;

CREATE TABLE IF NOT EXISTS vat_id_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(2) NOT NULL,
  number VARCHAR(50) NOT NULL,
  is_valid BOOLEAN NOT NULL,
  vies_response JSONB,
  source TEXT NOT NULL CHECK (source IN ('vies', 'vies_unavailable', 'format_only')),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(country, number)
);

CREATE INDEX IF NOT EXISTS idx_vat_id_validations_lookup
  ON vat_id_validations(country, number, expires_at);

ALTER TABLE vat_id_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_full_access ON vat_id_validations;
CREATE POLICY authenticated_full_access ON vat_id_validations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON vat_id_validations TO authenticated;
GRANT ALL ON vat_id_validations TO service_role;
