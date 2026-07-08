-- ============================================================================
-- MIG-055 — V8.17 SLC-915 MT-4: Class-C changed-FK-only BEFORE-UPDATE-Trigger
--            + UPDATE-`WITH CHECK` von MIG-054-AND zurueck auf USING-konsistentes OR
--            (ISSUE-140 — legitime mixed-owner-Status-Updates entsperren, Cross-Tenant-
--             FK-Injection auf dem UPDATE-Pfad voll erhalten)
-- ============================================================================
-- Datum: 2026-07-08 (Apply via SLC-915 /deploy NACH MIG-054, Precedent MIG-051/052/053/054)
-- Idempotent: ja (DROP POLICY/TRIGGER IF EXISTS + CREATE OR REPLACE FUNCTION). 2x Apply -> gleicher Zustand.
-- Additiv: keine Spalten/Tabellen; nur UPDATE-Policy-Shape + 9 Guard-Trigger.
--
-- Problem (ISSUE-140, Regression aus MIG-054): MIG-054 stellte INSERT- UND UPDATE-
--   `WITH CHECK` der 9 Multi-Parent-Klasse-C-Tabellen von OR-ueber-FK-Zweige auf
--   AND-Conjunction (jeder gesetzte FK muss sichtbar sein). Postgres prueft
--   `WITH CHECK` gegen die volle NEUE Row inkl. UNVERAENDERTER FKs. In einem
--   Multi-User-Tenant kann eine legitime Row FKs auf Objekte tragen, die fuer
--   verschiedene Nutzer unterschiedlich sichtbar sind (mixed-owner). Ein reiner
--   Status-Update (kein FK geaendert) auf so einer Row scheitert fuer Non-Admins
--   mit 42501 — False-Positive-Freeze legitimer Alltags-Updates.
--
-- Warum nicht einfach UPDATE-WITH-CHECK global auf OR (DEC-307 Variante b, verworfen):
--   reines RLS-OR kann "FK wurde geaendert" nicht erkennen (Postgres-RLS-`WITH CHECK`
--   kann `OLD` nicht referenzieren) -> der ISSUE-132-Injection-Gap auf dem UPDATE-Pfad
--   (POST/PATCH setzt einen FK auf ein fremdes Tenant-Objekt) waere wieder offen.
--
-- Fix (DEC-307, Variante a): zwei-teilig, pro der 9 Tabellen:
--   (1) UPDATE-`WITH CHECK` zurueck auf USING-konsistentes OR (unveraenderte
--       mixed-owner-Rows passieren wieder). INSERT-`WITH CHECK` bleibt MIG-054-AND
--       (strikt — Insert-Injection weiter zu, unangetastet).
--   (2) `BEFORE UPDATE`-Trigger (SECURITY INVOKER = plpgsql-Default, service_role-
--       Bypass): prueft NUR die tatsaechlich GEAENDERTEN FK-Spalten. Pro FK:
--         NEW.<fk> IS DISTINCT FROM OLD.<fk>   (nur geaenderte FK)
--         AND NEW.<fk> IS NOT NULL             (FK-auf-NULL ist kein Injection)
--         AND NOT EXISTS(SELECT 1 FROM <parent> p WHERE p.id=NEW.<fk>
--                        AND can_see_owner(p.owner_user_id))
--         -> RAISE insufficient_privilege
--       Der service_role-Bypass laeuft als `current_user <> 'service_role'`-Guard
--       (Cron/Admin-Client/Sync unberuehrt). Admin-Bypass ist implizit: can_see_owner()
--       enthaelt is_admin() (MIG-035:62) -> fuer Admins ist NOT EXISTS(...) stets false
--       -> kein RAISE (identisch zur MIG-054-`OR is_admin()`-Semantik).
--   Netto: identischer Cross-Tenant-Injection-Schutz wie MIG-054, aber ohne den
--   False-Positive-Freeze legitimer Status-Updates.
--
-- SECURITY INVOKER (OQ-A1): Der Trigger laeuft im Caller-Kontext (authenticated).
--   Die Parent-Subquery `SELECT 1 FROM public.<parent> p ...` unterliegt damit der
--   Parent-RLS des Callers UND `can_see_owner()` (SECURITY DEFINER, MIG-035) — beide
--   konsistent (Parent-SELECT-Policy nutzt selbst can_see_owner). Belt-and-suspenders,
--   spiegelt die MIG-054-WITH-CHECK-Subquery-Semantik. Live gegen Coolify-DB
--   verifiziert (positiv + negativ + mixed-owner + service_role), node:20-Sidecar
--   in-tx BEGIN/ROLLBACK-Probe (Dev-IMP-1694), Precedent MIG-054.
--
-- FK->Parent-Map: ARCHITECTURE.md V8.17-Addendum "MIG-055 FK->Parent-Map"
--   (live aus MIG-054-Policies abgeleitet). Alle Parents tragen owner_user_id.
-- Pattern-Quelle: sql/migrations/051_v814_slc912_profiles_role_protect.sql
--   (profiles_role_change_guard, service_role-aware, P-080) — kanonisches
--   changed-column-Guard-Scaffolding. Neuer Origin-Pattern-Kandidat fuer die
--   Pattern Library ("changed-FK-only BEFORE-UPDATE-Trigger").
--   (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Rollback (vollstaendig):
--   -- Trigger + Guard-Functions weg:
--   DROP TRIGGER IF EXISTS tasks_changed_fk_guard ON public.tasks;
--   DROP FUNCTION IF EXISTS tasks_changed_fk_guard();
--   (analog fuer signals, calendar_events, handoffs, cadence_enrollments,
--    documents, email_threads, referrals, email_attachments)
--   -- UPDATE-WITH-CHECK zurueck auf MIG-054-AND: MIG-054 erneut applyen
--   --   (die _update-Policies dort sind AND-Conjunction, idempotent).
--
-- Done-Gate (im /deploy): DB-Verify (positiv + negativ + mixed-owner + service_role,
--   node:20-Sidecar SAVEPOINT) AC-915-5. Struktur-Verify: 9 <table>_changed_fk_guard-
--   Trigger existieren, 9 _update-Policies WITH CHECK = OR-Shape, 9 _insert-Policies
--   WITH CHECK = AND-Conjunction (unveraendert).
-- ============================================================================

-- ============================================================================
-- 1) Helper-Existenz-Guard (is_admin + can_see_owner Pflicht)
-- ============================================================================
DO $$
DECLARE
  v_helper_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('is_admin','can_see_owner');

  IF v_helper_count < 2 THEN
    RAISE EXCEPTION 'MIG-055: V7-Helper-Functions fehlen (gefunden %, erwarte 2 — is_admin + can_see_owner). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) tasks — deal_id->deals, contact_id->contacts, company_id->companies (+ created_by)
-- ============================================================================
-- UPDATE-WITH-CHECK zurueck auf OR (== USING). INSERT-Policy unangetastet (MIG-054-AND).
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id  AND can_see_owner(co.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.contact_id IS NULL AND tasks.company_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id  AND can_see_owner(co.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.contact_id IS NULL AND tasks.company_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION tasks_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'tasks.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'tasks.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'tasks.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tasks_changed_fk_guard ON public.tasks;
CREATE TRIGGER tasks_changed_fk_guard BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION tasks_changed_fk_guard();


-- ============================================================================
-- 3) signals — deal_id->deals, contact_id->contacts, company_id->companies, activity_id->activities (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS signals_update ON public.signals;
CREATE POLICY signals_update ON public.signals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.deal_id IS NULL AND signals.contact_id IS NULL AND signals.company_id IS NULL AND signals.activity_id IS NULL AND signals.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.deal_id IS NULL AND signals.contact_id IS NULL AND signals.company_id IS NULL AND signals.activity_id IS NULL AND signals.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION signals_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'signals.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'signals.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'signals.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.activity_id IS DISTINCT FROM OLD.activity_id AND NEW.activity_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.activities p WHERE p.id = NEW.activity_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'signals.activity_id change to non-visible activity denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS signals_changed_fk_guard ON public.signals;
CREATE TRIGGER signals_changed_fk_guard BEFORE UPDATE ON public.signals FOR EACH ROW EXECUTE FUNCTION signals_changed_fk_guard();


-- ============================================================================
-- 4) calendar_events — deal_id->deals, contact_id->contacts, company_id->companies, meeting_id->meetings (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
CREATE POLICY calendar_events_update ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id  AND can_see_owner(m.owner_user_id))
    OR (calendar_events.deal_id IS NULL AND calendar_events.contact_id IS NULL AND calendar_events.company_id IS NULL AND calendar_events.meeting_id IS NULL AND calendar_events.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id  AND can_see_owner(m.owner_user_id))
    OR (calendar_events.deal_id IS NULL AND calendar_events.contact_id IS NULL AND calendar_events.company_id IS NULL AND calendar_events.meeting_id IS NULL AND calendar_events.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION calendar_events_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'calendar_events.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'calendar_events.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'calendar_events.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.meeting_id IS DISTINCT FROM OLD.meeting_id AND NEW.meeting_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.meetings p WHERE p.id = NEW.meeting_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'calendar_events.meeting_id change to non-visible meeting denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS calendar_events_changed_fk_guard ON public.calendar_events;
CREATE TRIGGER calendar_events_changed_fk_guard BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION calendar_events_changed_fk_guard();


-- ============================================================================
-- 5) handoffs — deal_id->deals, company_id->companies (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS handoffs_update ON public.handoffs;
CREATE POLICY handoffs_update ON public.handoffs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id))
    OR (handoffs.deal_id IS NULL AND handoffs.company_id IS NULL AND handoffs.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id))
    OR (handoffs.deal_id IS NULL AND handoffs.company_id IS NULL AND handoffs.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION handoffs_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'handoffs.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'handoffs.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS handoffs_changed_fk_guard ON public.handoffs;
CREATE TRIGGER handoffs_changed_fk_guard BEFORE UPDATE ON public.handoffs FOR EACH ROW EXECUTE FUNCTION handoffs_changed_fk_guard();


-- ============================================================================
-- 6) cadence_enrollments — deal_id->deals, contact_id->contacts (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS cadence_enrollments_update ON public.cadence_enrollments;
CREATE POLICY cadence_enrollments_update ON public.cadence_enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION cadence_enrollments_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'cadence_enrollments.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'cadence_enrollments.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS cadence_enrollments_changed_fk_guard ON public.cadence_enrollments;
CREATE TRIGGER cadence_enrollments_changed_fk_guard BEFORE UPDATE ON public.cadence_enrollments FOR EACH ROW EXECUTE FUNCTION cadence_enrollments_changed_fk_guard();


-- ============================================================================
-- 7) documents — contact_id->contacts, company_id->companies, deal_id->deals (+ created_by) [documents_table_*]
-- ============================================================================
DROP POLICY IF EXISTS documents_table_update ON public.documents;
CREATE POLICY documents_table_update ON public.documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION documents_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'documents.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'documents.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'documents.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS documents_changed_fk_guard ON public.documents;
CREATE TRIGGER documents_changed_fk_guard BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION documents_changed_fk_guard();


-- ============================================================================
-- 8) email_threads — deal_id->deals, contact_id->contacts, company_id->companies (KEIN created_by; Orphan nur via is_admin)
-- ============================================================================
DROP POLICY IF EXISTS email_threads_update ON public.email_threads;
CREATE POLICY email_threads_update ON public.email_threads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id))
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION email_threads_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'email_threads.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.contact_id IS DISTINCT FROM OLD.contact_id AND NEW.contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'email_threads.contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id AND NEW.company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'email_threads.company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS email_threads_changed_fk_guard ON public.email_threads;
CREATE TRIGGER email_threads_changed_fk_guard BEFORE UPDATE ON public.email_threads FOR EACH ROW EXECUTE FUNCTION email_threads_changed_fk_guard();


-- ============================================================================
-- 9) referrals — deal_id->deals, referrer_id->contacts, referred_company_id->companies, referred_contact_id->contacts (KEIN created_by)
-- ============================================================================
DROP POLICY IF EXISTS referrals_update ON public.referrals;
CREATE POLICY referrals_update ON public.referrals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id              AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id          AND can_see_owner(cr.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id  AND can_see_owner(rc.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id              AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id          AND can_see_owner(cr.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id  AND can_see_owner(rc.owner_user_id))
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION referrals_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.deal_id IS DISTINCT FROM OLD.deal_id AND NEW.deal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.deals p WHERE p.id = NEW.deal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'referrals.deal_id change to non-visible deal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.referrer_id IS DISTINCT FROM OLD.referrer_id AND NEW.referrer_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.referrer_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'referrals.referrer_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.referred_company_id IS DISTINCT FROM OLD.referred_company_id AND NEW.referred_company_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.companies p WHERE p.id = NEW.referred_company_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'referrals.referred_company_id change to non-visible company denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.referred_contact_id IS DISTINCT FROM OLD.referred_contact_id AND NEW.referred_contact_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.contacts p WHERE p.id = NEW.referred_contact_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'referrals.referred_contact_id change to non-visible contact denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS referrals_changed_fk_guard ON public.referrals;
CREATE TRIGGER referrals_changed_fk_guard BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION referrals_changed_fk_guard();


-- ============================================================================
-- 10) email_attachments — email_id->emails, proposal_id->proposals (KEIN created_by; Orphan nur via is_admin)
-- ============================================================================
DROP POLICY IF EXISTS email_attachments_update ON public.email_attachments;
CREATE POLICY email_attachments_update ON public.email_attachments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE OR REPLACE FUNCTION email_attachments_changed_fk_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    IF NEW.email_id IS DISTINCT FROM OLD.email_id AND NEW.email_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.emails p WHERE p.id = NEW.email_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'email_attachments.email_id change to non-visible email denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.proposal_id IS DISTINCT FROM OLD.proposal_id AND NEW.proposal_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = NEW.proposal_id AND can_see_owner(p.owner_user_id)) THEN
      RAISE EXCEPTION 'email_attachments.proposal_id change to non-visible proposal denied (cross-tenant FK injection block)' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS email_attachments_changed_fk_guard ON public.email_attachments;
CREATE TRIGGER email_attachments_changed_fk_guard BEFORE UPDATE ON public.email_attachments FOR EACH ROW EXECUTE FUNCTION email_attachments_changed_fk_guard();


-- ============================================================================
-- 11) Post-Apply Verifikation (Done-Gate)
-- ============================================================================
-- (a) 9 changed-FK-Guard-Trigger existieren:
--   SELECT c.relname AS tbl, t.tgname
--     FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
--    WHERE t.tgname LIKE '%_changed_fk_guard' AND NOT t.tgisinternal
--    ORDER BY c.relname;
--   Erwartung: 9 Rows (tasks, signals, calendar_events, handoffs, cadence_enrollments,
--              documents, email_threads, referrals, email_attachments).
--
-- (b) 9 _update-Policies WITH CHECK = OR-Shape (NICHT mehr die MIG-054-Conjunction),
--     9 _insert-Policies WITH CHECK = AND-Conjunction (unveraendert):
--   SELECT tablename, policyname, cmd,
--          (with_check LIKE '%IS NULL) OR (EXISTS%') AS has_conjunction
--     FROM pg_policies
--    WHERE schemaname='public' AND cmd IN ('INSERT','UPDATE')
--      AND tablename IN ('tasks','signals','calendar_events','handoffs','cadence_enrollments',
--                        'documents','email_threads','referrals','email_attachments')
--    ORDER BY tablename, cmd;
--   Erwartung: UPDATE-Rows has_conjunction = false; INSERT-Rows has_conjunction = true.
--
-- (c) DB-Verify (positiv + negativ + mixed-owner + service_role, node:20-Sidecar SAVEPOINT):
--     cockpit/__tests__/migrations/055-v817-class-c-changed-fk-trigger.test.ts (AC-915-5).

NOTIFY pgrst, 'reload schema';
