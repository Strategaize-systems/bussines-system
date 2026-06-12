-- MIG-052 — V8.15 SLC-913 MT-1: profiles authz-Spalten Column-Level-Protection
--   (ISSUE-109 High: team_id selbst-mutierbar + ISSUE-122 Low: kein INSERT-Coverage).
--
-- Erweitert MIG-051 (profiles.role-Guard). Zentrale Lektion IMP-1237: Ein
-- Column-Level-Fix muss ALLE authz-tragenden Spalten abdecken. Live-Inspektion
-- `\d profiles` + Helper-Functions 2026-06-12 bestaetigt: authz-tragend sind
-- genau `role` (is_admin/is_teamlead, profiles_role_check) und `team_id`
-- (get_my_team_id/can_see_owner, profiles_select_team). Die Text-Spalte `team`
-- ist Legacy ohne Policy-/Helper-Bezug und bleibt ungeschuetzt.
--
-- Problem (ISSUE-109): `profiles_admin_update USING/CHECK (is_admin() OR
--   id = auth.uid())` erlaubt einem authenticated User das UPDATE der eigenen
--   Row inkl. team_id. `get_my_team_id()`/`can_see_owner()` haengen an team_id
--   -> Self-Service-Team-Wechsel = Team-Isolation-Bypass (Member liest fremde
--   Team-Daten via profiles_select_team + can_see_owner-Policies).
--
-- Problem (ISSUE-122): MIG-051-Trigger feuert nur BEFORE UPDATE. Ein INSERT
--   mit privilegierten Werten (role='admin', beliebige team_id) war ungedeckt.
--   profiles.role hat zudem DEFAULT 'admin' — ein nackter INSERT waere
--   Self-Promotion. (Heute kein Exploit-Pfad: profiles_admin_insert verlangt
--   is_admin(), kein auth.users-Trigger legt profiles an. Defense-in-Depth.)
--
-- Fix: Bestehende Guard-Function per CREATE OR REPLACE erweitern (gleicher
--   Function-/Trigger-Name wie MIG-051 — DB-Verify-Test 051 bleibt unveraendert
--   gueltig, per-Spalte-Fehlermeldungen identisch zum MIG-051-Wortlaut):
--     - UPDATE: role-Aenderung ODER team_id-Aenderung -> RAISE, ausser
--       current_user = 'service_role'.
--     - INSERT (neu): non-service_role darf nur unprivilegierte Profile anlegen
--       (role='member' explizit + team_id IS NULL). Privilegierte Werte nur via
--       service_role (Invite-Pfad lib/auth/invite.ts laeuft via createAdminClient).
--   Trigger auf BEFORE INSERT OR UPDATE umgestellt.
--
-- WICHTIG (R-913-1, analog R-912-1): Gate ist `current_user <> 'service_role'`,
--   NICHT `NOT is_admin()` — die legitimen Admin-Pfade (changeRole in
--   lib/team/actions.ts:163, Invite-Insert in lib/auth/invite.ts:73) laufen via
--   createAdminClient() (service_role), wo is_admin() zu false evaluiert.
--   Code-verifiziert 2026-06-12: kein App-Pfad schreibt profiles.team_id oder
--   profiles.role ausserhalb service_role.
--     - PostgREST authenticated request  -> current_user = 'authenticated' -> BLOCK
--     - createAdminClient() service_role  -> current_user = 'service_role'  -> ALLOW
--     - direkter postgres-Superuser       -> current_user = 'postgres'      -> BLOCK
--       (Wartung/Seeds via `SET ROLE service_role` oder Trigger temporaer disablen.)
--
-- Cross-Repo-Template (strategaize-pattern-reuse.md, Row "profiles.role
--   Column-Level-Protection"): authz-Spalten-Liste pro Repo via `\d profiles` +
--   Policy-/Helper-Inventar bestimmen — NICHT nur role kopieren (IMP-1237).
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- Rollback: Re-Apply von 051_v814_slc912_profiles_role_protect.sql (stellt
--   role-only-Guard + BEFORE-UPDATE-Trigger wieder her).

CREATE OR REPLACE FUNCTION profiles_role_change_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- OLD existiert bei INSERT nicht: privilegierte Initial-Werte blocken.
    -- role muss explizit 'member' sein (Spalten-DEFAULT ist 'admin'!),
    -- team_id muss NULL sein. Alles andere nur via service_role.
    IF NEW.role IS DISTINCT FROM 'member' OR NEW.team_id IS NOT NULL THEN
      RAISE EXCEPTION
        'profiles insert with privileged role/team_id denied for role "%" (service_role required)', current_user
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE-Pfad: Meldungen pro Spalte, role-Wortlaut identisch zu MIG-051.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION
      'profiles.role change denied for role "%" (service_role required)', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION
      'profiles.team_id change denied for role "%" (service_role required)', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_change_guard ON profiles;

CREATE TRIGGER profiles_role_change_guard
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_role_change_guard();

-- Trigger aendert kein PostgREST-exponiertes Schema-Objekt; Schema-Cache-Reload
-- als Hygiene-Schritt (analog MIG-051 / R-912-5).
NOTIFY pgrst, 'reload schema';
