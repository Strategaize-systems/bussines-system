-- ============================================================
-- Fix fehlende RLS-Policies auf V2/V3-Tabellen (MIG-012)
-- ============================================================
-- 6 Tabellen haben RLS enabled, aber keine Policy definiert.
-- Postgres-Verhalten: RLS an + keine Policy = alles implizit verboten.
--
-- Symptom: "new row violates row-level security policy for the table 'X'"
-- bei jedem Insert/Update/Delete durch authenticated User (nicht service_role).
--
-- Betroffen: emails, fit_assessments, handoffs, proposals, referrals, signals
--
-- Fix: Gleiche Policy wie die V1-Tabellen bekommen (authenticated_full_access).
-- Idempotent via DROP POLICY IF EXISTS + CREATE POLICY.
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'emails',
    'fit_assessments',
    'handoffs',
    'proposals',
    'referrals',
    'signals'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_full_access" ON %I',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- Grants (sollten durch 02_rls.sql GRANT ALL ON ALL TABLES bereits gesetzt sein,
-- aber sicherheitshalber explizit fuer service_role).
GRANT ALL ON emails TO authenticated, service_role;
GRANT ALL ON fit_assessments TO authenticated, service_role;
GRANT ALL ON handoffs TO authenticated, service_role;
GRANT ALL ON proposals TO authenticated, service_role;
GRANT ALL ON referrals TO authenticated, service_role;
GRANT ALL ON signals TO authenticated, service_role;
