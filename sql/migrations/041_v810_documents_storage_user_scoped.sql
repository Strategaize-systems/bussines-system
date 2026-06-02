-- =====================================================
-- MIG-041 — V8.10 SLC-893 documents-Storage user-scoped
-- =====================================================
-- DEC-262..264 (V8.10 Security Sprint 2)
-- Pattern-Reuse 1:1 aus MIG-026 (V5.5 proposal_pdfs_user_select).
-- Audit-Quelle: docs/SECURITY_AUDIT_2026-05-30.md SEC-008.
--
-- Problem heute (sql/02_rls.sql:47-57):
--   3 Storage-Policies (INSERT, SELECT, DELETE) auf documents-Bucket pruefen
--   nur bucket_id='documents' und KEIN first-path-segment. Folge: jeder
--   authenticated User kann alle Objects in diesem Bucket lesen,
--   ueberschreiben und loeschen. Bei 2. User sofort Cross-Tenant-Exfiltration.
--
-- Fix:
--   1. DROP der 3 alten Policies (idempotent via IF EXISTS).
--   2. CREATE 4 neue Policies (SELECT, INSERT, UPDATE, DELETE) mit
--      first-path-segment-Filter (auth.uid())::text = (storage.foldername(name))[1].
--
-- Vorbedingung:
--   - Backfill-Script `cockpit/scripts/backfill-documents-user-scope.mjs`
--     muss VOR diesem Policy-Apply laufen, sonst werden bestehende
--     Files (Pfad `documents/...`) fuer alle User unsichtbar.
--   - Alternativ: Apply diese Migration in Production-Pause-Window
--     (DEC-263) zusammen mit Backfill --apply.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY (eindeutige Namen).
-- Anwenden via SSH analog .claude/rules/sql-migration-hetzner.md (postgres-User).

-- =====================================================
-- 1. Alte Policies droppen (idempotent)
-- =====================================================
DROP POLICY IF EXISTS "authenticated_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_documents" ON storage.objects;

-- =====================================================
-- 2. Neue user-scoped Policies (4 Operationen)
-- =====================================================
-- Pattern: (auth.uid())::text = (storage.foldername(name))[1]
-- foldername() teilt den Pfad an "/" und gibt das Array zurueck. Erstes
-- Element ist somit das oberste Verzeichnis im Bucket. Nur Files unter
-- "<eigenes-uuid>/..." sind fuer den User sichtbar.
--
-- service_role bleibt unberuehrt (BYPASSRLS auf Storage Policies).

-- SELECT --------------------------------------------------------------
DROP POLICY IF EXISTS "documents_user_select" ON storage.objects;
CREATE POLICY "documents_user_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- INSERT --------------------------------------------------------------
DROP POLICY IF EXISTS "documents_user_insert" ON storage.objects;
CREATE POLICY "documents_user_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- UPDATE --------------------------------------------------------------
DROP POLICY IF EXISTS "documents_user_update" ON storage.objects;
CREATE POLICY "documents_user_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- DELETE --------------------------------------------------------------
DROP POLICY IF EXISTS "documents_user_delete" ON storage.objects;
CREATE POLICY "documents_user_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- Verifikations-Queries (manuell, nach Apply)
-- =====================================================
-- SELECT polname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
--   AND polname LIKE 'documents_user_%' ORDER BY polname;
--   -- Erwartet: 4 Rows (documents_user_delete, _insert, _select, _update)
--
-- SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'storage.objects'::regclass
--   AND polname LIKE 'documents_%';
--   -- Erwartet: polcmd r (SELECT), a (INSERT), w (UPDATE), d (DELETE)
--
-- -- Sanity: keine alten Policies mehr aktiv
-- SELECT polname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
--   AND polname LIKE 'authenticated_%_documents';
--   -- Erwartet: 0 Rows.
