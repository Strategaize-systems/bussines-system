-- =====================================================
-- MIG-028 — V5.7 NL+DE-VAT + Reverse-Charge Schema
-- =====================================================
-- DEC-122 superseded durch DEC-128 (Country-Switch DE+NL global)
-- DEC-123 Reverse-Charge BOOLEAN-Flag + Konsistenz-CHECK
-- DEC-124 VAT-ID Format-only-Validation + Felder auf branding_settings + companies
-- DEC-125 Reverse-Charge-PDF-Block bilingual (NL-only in V5.7)
-- DEC-128 business_country als globaler Switch in branding_settings, Whitelist {0,7,9,19,21}
--
-- Bestandteile (5 additive Aenderungen):
--   1. branding_settings: vat_id TEXT NULL (Strategaize-eigene Steuernummer)
--   2. branding_settings: business_country TEXT NOT NULL DEFAULT 'NL' CHECK ('DE','NL')
--   3. companies: vat_id TEXT NULL (Empfaenger-Steuernummer EU-General)
--   4. proposals: tax_rate-Whitelist auf {0, 7, 9, 19, 21} erweitert
--   5. proposals: reverse_charge BOOLEAN NOT NULL DEFAULT false + Konsistenz-CHECK
--
-- Pre-Apply-Audit (2026-05-04): proposals enthaelt tax_rate IN {7.00, 19.00} — beide
-- in der neuen Whitelist enthalten. Snapshot-Prinzip (DEC-107) bleibt fuer alle
-- Legacy-Rows aktiv (keine Daten-Migration).
--
-- Idempotent: IF NOT EXISTS / DO $$ / DROP CONSTRAINT IF EXISTS.
-- Anwenden via SSH analog .claude/rules/sql-migration-hetzner.md (postgres-User).

-- =====================================================
-- 1. branding_settings — vat_id (DEC-124)
-- =====================================================

ALTER TABLE branding_settings
  ADD COLUMN IF NOT EXISTS vat_id TEXT;

-- =====================================================
-- 2. branding_settings — business_country (DEC-128)
-- =====================================================

ALTER TABLE branding_settings
  ADD COLUMN IF NOT EXISTS business_country TEXT NOT NULL DEFAULT 'NL';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'branding_settings_business_country_whitelist'
      AND conrelid = 'branding_settings'::regclass
  ) THEN
    ALTER TABLE branding_settings
      ADD CONSTRAINT branding_settings_business_country_whitelist
      CHECK (business_country IN ('DE', 'NL'));
  END IF;
END $$;

-- =====================================================
-- 3. companies — vat_id (DEC-124)
-- =====================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS vat_id TEXT;

-- =====================================================
-- 4. proposals — tax_rate Whitelist {0, 7, 9, 19, 21} (DEC-128)
-- =====================================================
-- Pre-Apply-Audit zeigte 7.00 + 19.00 in Live-DB. Beide sind in der neuen
-- Whitelist enthalten — keine Daten-Migration noetig (DEC-107 Snapshot).
-- DROP CONSTRAINT IF EXISTS macht das Re-Apply idempotent, falls eine
-- Vorgaenger-Variante (z.B. nur {0,9,19,21}) bereits angelegt war.

ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS proposals_tax_rate_whitelist;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_tax_rate_whitelist
  CHECK (tax_rate IN (0.00, 7.00, 9.00, 19.00, 21.00));

-- =====================================================
-- 5. proposals — reverse_charge BOOLEAN + Konsistenz-CHECK (DEC-123)
-- =====================================================
-- reverse_charge=true erzwingt tax_rate=0.00.
-- Bei false: tax_rate frei waehlbar im Whitelist-Rahmen aus 4.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_reverse_charge_consistency'
      AND conrelid = 'proposals'::regclass
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_reverse_charge_consistency
      CHECK (reverse_charge = false OR tax_rate = 0.00);
  END IF;
END $$;

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- \d branding_settings   -- vat_id TEXT NULL, business_country TEXT NOT NULL DEFAULT 'NL'
-- \d companies            -- vat_id TEXT NULL
-- \d proposals            -- reverse_charge BOOLEAN NOT NULL DEFAULT false, neuer Whitelist-CHECK + Konsistenz-CHECK
-- SELECT business_country FROM branding_settings;     -- 'NL' nach Apply (Default)
-- SELECT DISTINCT tax_rate FROM proposals;            -- 7, 19 (Pre-Apply-Audit), beide weiterhin valid
-- INSERT INTO proposals (..., tax_rate) VALUES (..., 21.00);  -- OK
-- INSERT INTO proposals (..., tax_rate) VALUES (..., 20.00);  -- CHECK-Reject (nicht in Whitelist)
-- INSERT INTO proposals (..., reverse_charge, tax_rate) VALUES (..., true, 21.00);  -- CHECK-Reject
-- INSERT INTO proposals (..., reverse_charge, tax_rate) VALUES (..., true, 0.00);   -- OK
