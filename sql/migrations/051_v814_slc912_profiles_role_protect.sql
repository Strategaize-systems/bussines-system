-- MIG-051 — V8.14 SLC-912 MT-1: profiles.role Column-Level-Protection (ISSUE-098 Blocker).
--
-- Strategaize Cross-Repo-Origin-Pattern: "profiles.role Privilege-Escalation-Block".
-- BS V8.14 SLC-912 ist die kanonische Origin-Quelle. Reuse-Ziel: OP / IS / immoscheckheft
-- (jedes Repo mit profiles.role + Multi-User). Siehe .claude/rules/strategaize-pattern-reuse.md.
--
-- Problem: Postgres-RLS schuetzt NICHT column-level innerhalb einer erlaubten Row.
--   `profiles_admin_update USING (is_admin() OR id = auth.uid())` erlaubt einem
--   authenticated User, die EIGENE Profil-Row zu updaten — inkl. role. Ein
--   `PATCH /rest/v1/profiles?id=eq.<uid> {"role":"admin"}` ist Self-Promotion zu
--   Tenant-Admin (ISSUE-098).
--
-- Fix: BEFORE-UPDATE-Trigger, der jede role-Aenderung blockt, AUSSER der Aufrufer
--   ist `service_role`. Der legitime Admin-Role-Change (changeRole) laeuft via
--   createAdminClient() (service_role) und bleibt funktional (R-912-1):
--     - PostgREST authenticated request  -> current_user = 'authenticated' -> BLOCK
--     - createAdminClient() service_role  -> current_user = 'service_role'  -> ALLOW
--     - direkter postgres-Superuser       -> current_user = 'postgres'      -> BLOCK
--       (Wartung via `SET ROLE service_role` oder Trigger temporaer disablen.)
--
-- WICHTIG (R-912-1): Ein naiver `NOT is_admin()`-Trigger wuerde changeRole BRECHEN,
--   weil is_admin() im service_role-Kontext (kein auth.uid()/Profil) zu false
--   evaluiert. Die Bedingung MUSS auf `current_user <> 'service_role'` pruefen.
--
-- Cross-Repo-Template: Tabelle `profiles` + Spalte `role` ggf. anpassen; der
--   `current_user <> 'service_role'`-Guard bleibt fix.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- Rollback: DROP TRIGGER profiles_role_change_guard ON profiles;
--           DROP FUNCTION profiles_role_change_guard();

CREATE OR REPLACE FUNCTION profiles_role_change_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION
      'profiles.role change denied for role "%" (service_role required)', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_change_guard ON profiles;

CREATE TRIGGER profiles_role_change_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_role_change_guard();

-- Trigger aendert kein PostgREST-exponiertes Schema-Objekt (keine Spalte/Tabelle/
-- Function-Signatur), aber Schema-Cache-Reload als Hygiene-Schritt (R-912-5).
NOTIFY pgrst, 'reload schema';
