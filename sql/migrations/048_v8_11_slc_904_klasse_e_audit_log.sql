-- ============================================================================
-- MIG-048 — V8.11 SLC-904 RLS-Sweep Klasse E (audit_log, Admin-all + Actor-own DSGVO-Art-15)
-- ============================================================================
-- Datum: 2026-06-05 (Apply via SLC-904 MT-2-Live NACH Code-Refactor MT-4a + MT-4b)
-- Idempotent: ja (DROP POLICY IF EXISTS auf alte UND neue Naming-Varianten + CREATE INDEX IF NOT EXISTS).
--
-- Klasse-E-Tabelle (1):
--   1. audit_log — Admin-all + Actor-own SELECT (DSGVO-Art-15 Self-Service Right-of-Access)
--                  INSERT/UPDATE/DELETE: WITH CHECK (false) / USING (false) — Service-Role-only.
--                  Auch Admin via User-Session darf NICHT mutieren/loeschen (Forensik-Schutz).
--
-- DECISION D-MT1-Composite-Actor (qa/SLC-904-perf-baseline.md Index-Audit):
--   Pre-MIG Baseline Q1 'actor=$1 ORDER BY created_at DESC LIMIT 50' nutzt aktuell idx_audit_log_created
--   und filtert dann actor_id mit 'Rows Removed by Filter: 7771'. Bei groesserem Dataset wird das
--   linear langsamer. Composite-Index (actor_id, created_at DESC) verhindert Filter-Overhead und
--   erlaubt direct Index-Range-Scan.
--   GEWAEHLT: CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created.
--
-- DECISION D-MT1-Composite-Entity (Verzicht):
--   Bestehender idx_audit_log_entity (entity_type, entity_id) matcht Q2 (entity-Lookup) exakt.
--   Sort auf 1-3 returned Rows ist sub-ms (Baseline Q2 = 0.622ms).
--   NICHT GEWAEHLT: composite (entity_type, entity_id, created_at DESC) waere overkill.
--
-- DECISION D-MT1-Founder-Refactor (R-904-1 Eskalation Medium -> High):
--   Spec L18: 'INSERT/UPDATE/DELETE: Service-Role-only via WITH CHECK (false). User darf NIE
--   eigene Audit-Eintraege manipulieren.'
--   Code-Audit zeigt 11 direct + 33 transitive User-Session-Inserts, davon 5 UI-Break-Pfade.
--   Schwellwert >>3 Caller-Fixes. Founder-Decision 2026-06-05 = Option A: Spec wie geschrieben +
--   In-Slice Code-Refactor (audit.ts zentral + 11 direct sites zu createAdminClient).
--
-- Pattern-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse E + DEC-272 + Slice-Spec L30-53
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access):  2 Rows
-- Post-Apply Done-Gate Erwartung:                                        1 Row
--                                                                       (knowledge_chunks SLC-905 verbleibend)
-- ============================================================================

-- ============================================================================
-- 1) Helper-Existenz-Guard (is_admin Pflicht)
-- ============================================================================
DO $$
DECLARE
  v_helper_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('is_admin');

  IF v_helper_count < 1 THEN
    RAISE EXCEPTION 'MIG-048: V7-Helper-Function is_admin fehlt (gefunden %, erwarte 1). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) Performance-Mitigation: Composite-Index (actor_id, created_at DESC)
-- ============================================================================
-- R-904-2 Mitigation. Beschleunigt Q1 'actor=$1 ORDER BY created_at DESC LIMIT 50'.
-- Idempotent via CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON public.audit_log (actor_id, created_at DESC);


-- ============================================================================
-- 3) DROP alte UND neue Policies (idempotent — alle moeglichen Naming-Varianten)
-- ============================================================================
-- Pre-V8.11 Naming-Varianten:
DROP POLICY IF EXISTS authenticated_full_access ON public.audit_log;
DROP POLICY IF EXISTS audit_log_full_access ON public.audit_log;

-- Neue Klasse-E-Naming-Varianten (Re-Apply-Idempotenz):
DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
DROP POLICY IF EXISTS audit_log_insert ON public.audit_log;
DROP POLICY IF EXISTS audit_log_update ON public.audit_log;
DROP POLICY IF EXISTS audit_log_delete ON public.audit_log;


-- ============================================================================
-- 4) audit_log — Admin-all + Actor-own SELECT (DSGVO-Art-15)
-- ============================================================================
-- Admin sieht alles (Forensik/Support). User sieht nur eigene actor_id-Eintraege
-- (DSGVO-Art-15 Self-Service Right-of-Access).
-- NULL-actor_id (Cron/Service-Role) ist nur fuer Admin sichtbar.
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (is_admin() OR audit_log.actor_id = auth.uid());


-- ============================================================================
-- 5) audit_log — INSERT Service-Role-only (Forensik-Integritaet)
-- ============================================================================
-- authenticated bekommt WITH CHECK (false). service_role bypassed RLS via BYPASSRLS=true.
-- Cron + Server-Actions schreiben via createAdminClient() (DEC-269).
-- Begruendung: Niemand (auch nicht Admin via User-Session) darf Audit-Eintraege erzeugen
-- ohne service_role-Pfad. Damit ist die Audit-Kette nicht manipulierbar.
CREATE POLICY audit_log_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);


-- ============================================================================
-- 6) audit_log — UPDATE blockiert (Forensik-Integritaet)
-- ============================================================================
-- Audit-Eintraege sind immutable per Design. Auch Admin via User-Session darf NICHT
-- mutieren. Mutation via service_role ist moeglich (bypass), aber kein normaler Pfad.
CREATE POLICY audit_log_update ON public.audit_log
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);


-- ============================================================================
-- 7) audit_log — DELETE blockiert (Forensik-Schutz, auch Admin)
-- ============================================================================
-- Bewusst auf false gesetzt (Slice-Spec L57). Wenn Admin Audit-Eintraege loeschen muss
-- (z.B. DSGVO-Loeschung eines Users), dann via service_role-Skript mit explizitem
-- Audit-Log-Entry 'audit_log_deleted_by_admin', nicht ueber User-Session.
CREATE POLICY audit_log_delete ON public.audit_log
  FOR DELETE TO authenticated
  USING (false);


-- ============================================================================
-- 8) Post-Apply Verifikation (Done-Gate per Sec-Audit-Helper-Function)
-- ============================================================================
-- Erwartung: 1 Row (2 Pre - 1 audit_log).
-- Verbleibend: knowledge_chunks (SLC-905).
-- Live-Verify nach Apply per:
--   SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
-- Sub-Sweep-Verify (nur audit_log):
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename='audit_log'
--    ORDER BY policyname;
-- Erwartung: 4 Rows (SELECT/INSERT/UPDATE/DELETE).

NOTIFY pgrst, 'reload schema';
