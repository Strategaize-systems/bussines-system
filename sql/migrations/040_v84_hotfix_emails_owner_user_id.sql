-- =============================================================
-- MIG-040 (V8.4 Hotfix) — emails.owner_user_id nachtraeglich
-- =============================================================
-- Root Cause: MIG-033 (V7 SLC-704) hat owner_user_id auf 8 Tabellen ergaenzt
-- (companies, contacts, deals, activities, meetings, proposals, email_messages,
-- calls) — ABER die outgoing-Mail-Tabelle `emails` wurde vergessen.
-- Code in cockpit/src/lib/email/send.ts Zeilen 133+232 inserted aber
-- owner_user_id wenn params.ownerUserId truthy ist.
--
-- Vor V8.4 SLC-846: sendComposedEmail-Caller setzte ownerUserId NICHT →
-- INSERT-Spread-Operator liess die Spalte weg → kein DB-Error.
--
-- Mit V8.4 SLC-846: SLC-846 ergaenzte sendComposedEmail um ownerUserId
-- (fuer den tenantSlug-Lookup im DSE-Footer-Render) → ab V8.4-Deploy
-- (2026-05-23 09:18 UTC) failt jeder Mail-Send aus dem Composing-Studio mit:
--   "Could not find the 'owner_user_id' column of 'emails' in the schema cache"
--
-- Discovery: User-Browser-Smoke 2026-05-23 ~14:05 UTC (siehe RPT-532).
-- Fix: ADD COLUMN IF NOT EXISTS + INDEX + NOTIFY pgrst.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.

-- Phase 1: Spalte ergaenzen
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS owner_user_id UUID
    REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emails_owner_user_id
  ON emails(owner_user_id);

-- Phase 2: PostgREST Schema-Cache reload (sonst HTTP 400 bis ~5min Auto-Reload)
NOTIFY pgrst, 'reload schema';

-- Verify
DO $$
DECLARE
  v_col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'emails'
       AND column_name  = 'owner_user_id'
  ) INTO v_col_exists;

  IF NOT v_col_exists THEN
    RAISE EXCEPTION 'MIG-040: emails.owner_user_id existiert nicht nach ALTER';
  END IF;

  RAISE NOTICE 'MIG-040: emails.owner_user_id existiert ✓';
END $$;
