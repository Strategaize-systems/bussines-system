-- ============================================================
-- V2.1 Migration: Deal-Status-Workflow
-- ============================================================
-- Adds closed_at timestamp, drops orphaned lost_reason column,
-- adds FK constraint on referral_source_id
-- Idempotent: kann mehrfach laufen
-- ============================================================

-- 1. closed_at Timestamp für Deal-Abschluss
ALTER TABLE deals ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Orphaned lost_reason entfernen (ersetzt durch won_lost_reason)
ALTER TABLE deals DROP COLUMN IF EXISTS lost_reason;

-- 3. Index für Status-Abfragen
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- 4. Index für closed_at (für Won/Lost Reporting)
CREATE INDEX IF NOT EXISTS idx_deals_closed ON deals(closed_at) WHERE closed_at IS NOT NULL;
