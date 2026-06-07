-- ============================================================================
-- MIG-047a — V8.11 SLC-903 RLS-Sweep Klasse C Block 1 (Standard-Parent-FK, 8 Tabellen)
-- ============================================================================
-- Datum: 2026-06-05 (Apply via SLC-903 MT-2 NACH MIG-046)
-- Idempotent: ja (DROP POLICY IF EXISTS + CREATE; CREATE INDEX IF NOT EXISTS).
-- Verhalten-aendernd: nach Apply gilt Multi-Parent OR-EXISTS-Pattern auf 8 Tabellen.
--   - Pro Op (SELECT/INSERT/UPDATE/DELETE): EXISTS(parent) AND can_see_owner(parent.owner_user_id)
--     OR (NULL-Parent UND created_by=auth.uid()) — falls created_by-Spalte existiert
--     OR is_admin() (Admin-Bypass)
--
-- Pattern-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse C + DEC-272
--                + sql/migrations/035_v7_rls_switch.sql (V7-can_see_owner-Pattern)
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Block-1-Tabellen (8 statt 5 — 3 Spec-Drifts mit Multi-Parent statt Single-Parent):
--   1. tasks            (deal_id, contact_id, company_id, created_by)  — Multi-Parent OR
--   2. signals          (deal_id, contact_id, company_id, activity_id, created_by) — Multi-Parent OR
--   3. calendar_events  (deal_id, contact_id, company_id, meeting_id, created_by) — Multi-Parent OR
--   4. email_threads    (deal_id, contact_id, company_id)              — Multi-Parent OR, kein created_by
--   5. handoffs         (deal_id, company_id, created_by)              — Multi-Parent OR
--   6. deal_products    (deal_id)                                       — Single-Parent EXISTS
--   7. auto_winloss_runs(deal_id)                                       — Single-Parent EXISTS
--   8. referrals        (deal_id, referrer_id, referred_company_id, referred_contact_id) — Multi-Parent OR
--
-- Performance-Mitigation (R-903-1 High):
--   16 fehlende Parent-FK-Indizes werden in dieser Migration ergaenzt (CREATE INDEX IF NOT EXISTS).
--   Multi-Parent OR mit nicht-indizierten FKs = Seq-Scan-Risiko bei Tabellenwachstum.
--
-- Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access): 26 Rows
-- Post-Apply Done-Gate Erwartung:                                       18 Rows (-8)
-- ============================================================================

-- ============================================================================
-- 1) Helper-Existenz-Guard (V7-Functions + can_see_owner Pflicht)
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
    RAISE EXCEPTION 'MIG-047a: V7-Helper-Functions fehlen (gefunden %, erwarte 2 — is_admin + can_see_owner). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) Performance-Mitigation: 16 fehlende Parent-FK-Indizes
-- ============================================================================
-- Idempotent via CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_tasks_deal              ON public.tasks (deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company           ON public.tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by        ON public.tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_signals_company         ON public.signals (company_id);
CREATE INDEX IF NOT EXISTS idx_signals_activity        ON public.signals (activity_id);
CREATE INDEX IF NOT EXISTS idx_signals_created_by      ON public.signals (created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_deal    ON public.calendar_events (deal_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON public.calendar_events (contact_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON public.calendar_events (company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_meeting ON public.calendar_events (meeting_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_deal      ON public.email_threads (deal_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_company   ON public.email_threads (company_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_company        ON public.handoffs (company_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_created_by     ON public.handoffs (created_by);
CREATE INDEX IF NOT EXISTS idx_referrals_deal          ON public.referrals (deal_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_company ON public.referrals (referred_company_id);


-- ============================================================================
-- 3) DROP alte UND neue Policies (idempotent — alle moeglichen Naming-Varianten)
-- ============================================================================
-- Pre-V8.11 Naming-Varianten:
DROP POLICY IF EXISTS authenticated_full_access ON public.tasks;
DROP POLICY IF EXISTS tasks_full_access ON public.tasks;
DROP POLICY IF EXISTS authenticated_full_access ON public.signals;
DROP POLICY IF EXISTS signals_full_access ON public.signals;
DROP POLICY IF EXISTS authenticated_full_access ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_full_access ON public.calendar_events;
DROP POLICY IF EXISTS authenticated_full_access ON public.email_threads;
DROP POLICY IF EXISTS email_threads_full_access ON public.email_threads;
DROP POLICY IF EXISTS authenticated_full_access ON public.handoffs;
DROP POLICY IF EXISTS handoffs_full_access ON public.handoffs;
DROP POLICY IF EXISTS authenticated_full_access ON public.deal_products;
DROP POLICY IF EXISTS deal_products_full_access ON public.deal_products;
DROP POLICY IF EXISTS authenticated_full_access ON public.auto_winloss_runs;
DROP POLICY IF EXISTS auto_winloss_runs_full_access ON public.auto_winloss_runs;
DROP POLICY IF EXISTS authenticated_full_access ON public.referrals;
DROP POLICY IF EXISTS referrals_full_access ON public.referrals;

-- Neue Klasse-C-Naming-Varianten (Re-Apply-Idempotenz):
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
DROP POLICY IF EXISTS signals_select ON public.signals;
DROP POLICY IF EXISTS signals_insert ON public.signals;
DROP POLICY IF EXISTS signals_update ON public.signals;
DROP POLICY IF EXISTS signals_delete ON public.signals;
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;
DROP POLICY IF EXISTS email_threads_select ON public.email_threads;
DROP POLICY IF EXISTS email_threads_insert ON public.email_threads;
DROP POLICY IF EXISTS email_threads_update ON public.email_threads;
DROP POLICY IF EXISTS email_threads_delete ON public.email_threads;
DROP POLICY IF EXISTS handoffs_select ON public.handoffs;
DROP POLICY IF EXISTS handoffs_insert ON public.handoffs;
DROP POLICY IF EXISTS handoffs_update ON public.handoffs;
DROP POLICY IF EXISTS handoffs_delete ON public.handoffs;
DROP POLICY IF EXISTS deal_products_select ON public.deal_products;
DROP POLICY IF EXISTS deal_products_insert ON public.deal_products;
DROP POLICY IF EXISTS deal_products_update ON public.deal_products;
DROP POLICY IF EXISTS deal_products_delete ON public.deal_products;
DROP POLICY IF EXISTS auto_winloss_runs_select ON public.auto_winloss_runs;
DROP POLICY IF EXISTS auto_winloss_runs_insert ON public.auto_winloss_runs;
DROP POLICY IF EXISTS auto_winloss_runs_update ON public.auto_winloss_runs;
DROP POLICY IF EXISTS auto_winloss_runs_delete ON public.auto_winloss_runs;
DROP POLICY IF EXISTS referrals_select ON public.referrals;
DROP POLICY IF EXISTS referrals_insert ON public.referrals;
DROP POLICY IF EXISTS referrals_update ON public.referrals;
DROP POLICY IF EXISTS referrals_delete ON public.referrals;


-- ============================================================================
-- 4) tasks — Multi-Parent OR (deal_id, contact_id, company_id) + created_by + admin
-- ============================================================================
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id  AND can_see_owner(co.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.contact_id IS NULL AND tasks.company_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id  AND can_see_owner(co.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.contact_id IS NULL AND tasks.company_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  );

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

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id  AND can_see_owner(co.owner_user_id))
    OR (tasks.deal_id IS NULL AND tasks.contact_id IS NULL AND tasks.company_id IS NULL AND tasks.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 5) signals — Multi-Parent OR (deal/contact/company/activity) + created_by + admin
-- ============================================================================
CREATE POLICY signals_select ON public.signals
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.deal_id IS NULL AND signals.contact_id IS NULL AND signals.company_id IS NULL AND signals.activity_id IS NULL AND signals.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY signals_insert ON public.signals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.deal_id IS NULL AND signals.contact_id IS NULL AND signals.company_id IS NULL AND signals.activity_id IS NULL AND signals.created_by = auth.uid())
    OR is_admin()
  );

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

CREATE POLICY signals_delete ON public.signals
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id))
    OR (signals.deal_id IS NULL AND signals.contact_id IS NULL AND signals.company_id IS NULL AND signals.activity_id IS NULL AND signals.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 6) calendar_events — Multi-Parent OR (deal/contact/company/meeting) + created_by + admin
-- ============================================================================
CREATE POLICY calendar_events_select ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id  AND can_see_owner(m.owner_user_id))
    OR (calendar_events.deal_id IS NULL AND calendar_events.contact_id IS NULL AND calendar_events.company_id IS NULL AND calendar_events.meeting_id IS NULL AND calendar_events.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id  AND can_see_owner(m.owner_user_id))
    OR (calendar_events.deal_id IS NULL AND calendar_events.contact_id IS NULL AND calendar_events.company_id IS NULL AND calendar_events.meeting_id IS NULL AND calendar_events.created_by = auth.uid())
    OR is_admin()
  );

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

CREATE POLICY calendar_events_delete ON public.calendar_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id     AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id  AND can_see_owner(m.owner_user_id))
    OR (calendar_events.deal_id IS NULL AND calendar_events.contact_id IS NULL AND calendar_events.company_id IS NULL AND calendar_events.meeting_id IS NULL AND calendar_events.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 7) email_threads — Multi-Parent OR (deal/contact/company) + admin (KEIN created_by)
-- ============================================================================
-- Edge-case: 1 Pre-existing Row OHNE jeden Parent-FK ist nur ueber is_admin() sichtbar (orphan).
CREATE POLICY email_threads_select ON public.email_threads
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_threads_insert ON public.email_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id))
    OR is_admin()
  );

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

CREATE POLICY email_threads_delete ON public.email_threads
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 8) handoffs — Multi-Parent OR (deal/company) + created_by + admin
-- ============================================================================
CREATE POLICY handoffs_select ON public.handoffs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id))
    OR (handoffs.deal_id IS NULL AND handoffs.company_id IS NULL AND handoffs.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY handoffs_insert ON public.handoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id))
    OR (handoffs.deal_id IS NULL AND handoffs.company_id IS NULL AND handoffs.created_by = auth.uid())
    OR is_admin()
  );

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

CREATE POLICY handoffs_delete ON public.handoffs
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id))
    OR (handoffs.deal_id IS NULL AND handoffs.company_id IS NULL AND handoffs.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 9) deal_products — Single-Parent EXISTS deals + admin (KEIN created_by, KEIN NULL-Fallback)
-- ============================================================================
CREATE POLICY deal_products_select ON public.deal_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_products.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY deal_products_insert ON public.deal_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_products.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY deal_products_update ON public.deal_products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_products.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_products.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY deal_products_delete ON public.deal_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_products.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 10) auto_winloss_runs — Single-Parent EXISTS deals + admin (KEIN created_by)
-- ============================================================================
CREATE POLICY auto_winloss_runs_select ON public.auto_winloss_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = auto_winloss_runs.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY auto_winloss_runs_insert ON public.auto_winloss_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = auto_winloss_runs.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY auto_winloss_runs_update ON public.auto_winloss_runs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = auto_winloss_runs.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = auto_winloss_runs.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );

CREATE POLICY auto_winloss_runs_delete ON public.auto_winloss_runs
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals d WHERE d.id = auto_winloss_runs.deal_id AND can_see_owner(d.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 11) referrals — Multi-Parent OR (deal/referrer/referred_company/referred_contact) + admin
-- ============================================================================
-- Live-Schema-Drift: referrals hat 4 FKs (Spec sagte 3): referrer_id + referred_company_id + referred_contact_id + deal_id.
CREATE POLICY referrals_select ON public.referrals
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id              AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id          AND can_see_owner(cr.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id  AND can_see_owner(rc.owner_user_id))
    OR is_admin()
  );

CREATE POLICY referrals_insert ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id              AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id          AND can_see_owner(cr.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id  AND can_see_owner(rc.owner_user_id))
    OR is_admin()
  );

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

CREATE POLICY referrals_delete ON public.referrals
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id              AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id          AND can_see_owner(cr.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id  AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id  AND can_see_owner(rc.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 12) Post-Apply Verifikation (Done-Gate per Sec-Audit-Helper-Function)
-- ============================================================================
-- Erwartung: 18 Rows (26 Pre - 8 Block-1).
-- Live-Verify nach Apply per:
--   SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
-- Sub-Sweep-Verify (nur Block 1):
--   SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('tasks','signals','calendar_events','email_threads','handoffs',
--                        'deal_products','auto_winloss_runs','referrals')
--    ORDER BY tablename, policyname;
-- Erwartung: 32 Rows (8 Tabellen x 4 Policies = select/insert/update/delete).

NOTIFY pgrst, 'reload schema';
