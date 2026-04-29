-- =====================================================
-- MIG-026 — V5.5 Angebot-Erstellung Schema
-- =====================================================
-- DEC-105..114 (V5.5 Architecture)
-- DEC-107 proposal_items Snapshot inkl. snapshot_unit_price_at_creation
-- DEC-108 email_attachments source_type-Diskriminator (proposal vs upload)
-- DEC-109 Versionierung via parent_proposal_id (V1-Status bleibt unangetastet)
-- DEC-111 Storage-Bucket-Pfad: {user_id}/{proposal_id}/v{version}.pdf
--
-- Bestandteile (4 Aenderungen + Bucket + Policies):
--   1. proposals erweitert um 11 nullable Spalten + 3 Indizes
--   2. Neue Tabelle proposal_items (DEC-107) + RLS + Grants + 2 Indizes
--   3. email_attachments erweitert um source_type + proposal_id + CHECK
--   4. Storage-Bucket "proposal-pdfs" (privat) + 4 RLS-Policies
--
-- Idempotent: IF NOT EXISTS / DO $$ BEGIN ... / DROP POLICY IF EXISTS / ON CONFLICT.
-- Anwenden via SSH analog .claude/rules/sql-migration-hetzner.md (postgres-User).

-- =====================================================
-- 1. proposals — 11 neue Spalten + 3 Indizes
-- =====================================================
-- Alle Spalten nullable (rein additiv). tax_rate hat DEFAULT 19.00 (DE-Standard).
-- V2-Stub-Rows bleiben unveraendert lesbar — neue Spalten = NULL.
-- parent_proposal_id ON DELETE SET NULL: Versions-Audit bleibt erhalten,
-- selbst wenn der Vorgaenger geloescht wird (DEC-109).

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS subtotal_net NUMERIC(12,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS total_gross NUMERIC(12,2);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS parent_proposal_id UUID
  REFERENCES proposals(id) ON DELETE SET NULL;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_proposals_parent
  ON proposals(parent_proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposals_valid_until
  ON proposals(valid_until);

-- Partial Index fuer Auto-Expire-Cron + aktive Listings (DEC-110).
CREATE INDEX IF NOT EXISTS idx_proposals_status_active
  ON proposals(status)
  WHERE status IN ('draft', 'sent');

-- =====================================================
-- 2. proposal_items — neue Tabelle (DEC-107)
-- =====================================================
-- Snapshot-Felder (snapshot_name/description/unit_price_at_creation) erhalten
-- die Audit-Wahrheit auch wenn das Produkt spaeter geloescht/preislich
-- veraendert wird (FK ON DELETE SET NULL auf products).

CREATE TABLE IF NOT EXISTS proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  position_order INT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price_net NUMERIC(12,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  snapshot_name TEXT NOT NULL,
  snapshot_description TEXT,
  snapshot_unit_price_at_creation NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal
  ON proposal_items(proposal_id);

-- Partial Index: nur Items mit verlinktem Produkt (Snapshot-Items haben
-- product_id=NULL nach Produkt-Loeschung).
CREATE INDEX IF NOT EXISTS idx_proposal_items_product
  ON proposal_items(product_id)
  WHERE product_id IS NOT NULL;

ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proposal_items' AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON proposal_items
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- service_role Grants (BYPASSRLS != table permissions, Pattern aus MIG-021/023/025).
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposal_items TO service_role;

-- =====================================================
-- 3. email_attachments — source_type + proposal_id + CHECK
-- =====================================================
-- DEC-108 Diskriminator-Pattern: source_type='upload' (V5.4-Bestand) ODER
-- source_type='proposal' (FEAT-555 Composing-Hookup). proposal_id NULL fuer
-- Uploads, NOT NULL fuer Proposals — CHECK-Constraint enforced.
-- ON DELETE SET NULL: Wenn ein Proposal geloescht wird, bleibt die
-- email_attachments-Junction (Mail-History) — Proposal-Link wird NULL.

ALTER TABLE email_attachments
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload';

ALTER TABLE email_attachments
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

-- Partial Index fuer Proposal-Attachment-Lookup (vor allem fuer SLC-555).
CREATE INDEX IF NOT EXISTS idx_email_attachments_proposal
  ON email_attachments(proposal_id)
  WHERE proposal_id IS NOT NULL;

-- CHECK-Constraint: Daten-Konsistenz zwischen source_type und proposal_id.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'email_attachments_source_type_check'
      AND conrelid = 'email_attachments'::regclass
  ) THEN
    ALTER TABLE email_attachments
      ADD CONSTRAINT email_attachments_source_type_check
      CHECK (
        (source_type = 'upload' AND proposal_id IS NULL) OR
        (source_type = 'proposal' AND proposal_id IS NOT NULL)
      );
  END IF;
END $$;

-- =====================================================
-- 4. Storage-Bucket "proposal-pdfs" (privat) + 4 RLS-Policies
-- =====================================================
-- DEC-111 Pfad: {user_id}/{proposal_id}/v{version}.pdf bzw. .testmode.pdf
-- Private Bucket: keine Public-URL, alle Reads laufen ueber Server Actions
-- mit Service-Role-Client (Pattern aus email-attachments). Das User-Scope
-- via storage.foldername(name)[1] = auth.uid() verhindert Cross-User-Access
-- ueber Direct-Storage-Queries — auch wenn die Proposal-Tabelle selbst
-- authenticated_full_access hat (Single-User V5-Aera).

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-pdfs', 'proposal-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 4 Policies: SELECT/INSERT/UPDATE/DELETE jeweils mit User-Scope auf erstem
-- Path-Segment. DROP IF EXISTS + CREATE = idempotent.

DROP POLICY IF EXISTS "proposal_pdfs_user_select" ON storage.objects;
CREATE POLICY "proposal_pdfs_user_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposal-pdfs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "proposal_pdfs_user_insert" ON storage.objects;
CREATE POLICY "proposal_pdfs_user_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposal-pdfs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "proposal_pdfs_user_update" ON storage.objects;
CREATE POLICY "proposal_pdfs_user_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proposal-pdfs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'proposal-pdfs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "proposal_pdfs_user_delete" ON storage.objects;
CREATE POLICY "proposal_pdfs_user_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposal-pdfs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- Verifikations-Queries (manuell, nach Deploy)
-- =====================================================
-- \d proposals
-- \d proposal_items
-- \d email_attachments
-- SELECT id, name, public FROM storage.buckets WHERE id='proposal-pdfs';
-- SELECT polname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
--   AND polname LIKE 'proposal_pdfs_%';
-- SELECT count(*) FROM proposals;          -- V2-Stubs unveraendert
-- SELECT id, title, tax_rate, subtotal_net FROM proposals LIMIT 5;
--   (alte Rows: tax_rate=19.00 default, subtotal_net=NULL)
