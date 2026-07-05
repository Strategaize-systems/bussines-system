-- ============================================================================
-- MIG-054 — V8.16 SLC-914 MT-2: Multi-Parent-Class-C WITH-CHECK-Härtung (ISSUE-132)
-- ============================================================================
-- Datum: 2026-07-05 (Apply via SLC-914 /deploy NACH MIG-053, Precedent MIG-051/052/053)
-- Idempotent: ja (DROP POLICY IF EXISTS + CREATE). 2x Apply -> gleicher Zustand.
-- Verhalten-aendernd: NUR die INSERT- und UPDATE-`WITH CHECK` der 9 genuin
--   Multi-Parent-Klasse-C-Tabellen wird von OR-über-FK-Zweige auf AND-Conjunction
--   umgestellt. SELECT/UPDATE-USING/DELETE-USING bleiben unveraendert OR-Logik
--   (Read ist nicht bypassbar; nur die Write-WITH-CHECK hatte den Injection-Gap).
--
-- Gap (ISSUE-132, Fable-5 Re-Audit RPT-659): Die V8.11-Klasse-C-INSERT/UPDATE-
--   `WITH CHECK` (MIG-047a/b/c) ist ein OR über alle Parent-FK-EXISTS-Zweige. Es
--   genügt, dass GENAU EIN Parent via can_see_owner() sichtbar ist — die übrigen
--   FK-Spalten dürfen frei auf fremde Tenant-Objekte zeigen. Beispiel:
--     POST /rest/v1/signals {deal_id:<eigen>, contact_id:<fremd>}
--   besteht WITH CHECK über den deal-Zweig und wird via signals_select
--   (contact-Zweig) in der fremden Tenant-View sichtbar = stored cross-tenant
--   Row-Injection. KEINE Read-Exfiltration, KEIN Privesc.
--
-- Fix (DEC-305): jeder GESETZTE (non-NULL) Parent-FK muss sichtbar sein —
--   pro FK: `(<col> IS NULL OR EXISTS(...can_see_owner...))`, alle mit AND
--   verknüpft, plus `(mind. 1 FK non-NULL OR (alle FK NULL AND created_by=auth.uid()))`.
--   Tabellen OHNE created_by (email_threads, referrals, email_attachments): kein
--   all-NULL-Zweig -> all-NULL-Row nur via is_admin() (Orphan-Semantik wie Bestand).
--
-- Pattern-weiter Satz (Schritt 0, live aus pg_policies abgeleitet 2026-07-05,
-- ≥2 unabhaengige Parent-FK-EXISTS-OR-Zweige im WITH CHECK):
--   1. tasks               (deal_id, contact_id, company_id;                       + created_by)
--   2. signals             (deal_id, contact_id, company_id, activity_id;          + created_by)
--   3. calendar_events     (deal_id, contact_id, company_id, meeting_id;           + created_by)
--   4. handoffs            (deal_id, company_id;                                   + created_by)
--   5. cadence_enrollments (deal_id, contact_id;                                   + created_by)
--   6. documents           (contact_id, company_id, deal_id;                       + created_by)  [documents_table_*]
--   7. email_threads       (deal_id, contact_id, company_id;                       KEIN created_by)
--   8. referrals           (deal_id, referrer_id, referred_company_id, referred_contact_id; KEIN created_by)
--   9. email_attachments   (email_id, proposal_id;                                 KEIN created_by)
--
-- Ausgeschlossen (kein Multi-FK-Gap, Schritt-0-live-bestätigt):
--   - deal_products, auto_winloss_runs, proposal_items, proposal_payment_milestones,
--     email_tracking_events, cadence_executions  -> Single-Parent (genau EINE FK-Spalte
--     auf der Tabelle; cadence_executions.enrollment_id ist transitiv, nur EINE FK).
--   - ai_action_queue, ai_feedback  -> polymorph über EINE entity_id/action_queue_id-Spalte
--     (entity_type-Diskriminator), keine 2 unabhaengigen FK-Spalten -> kein Injection-Gap.
--   - emails (WITH CHECK = owner_user_id=auth.uid()), fit_assessments (assessed_by=auth.uid())
--     -> Direct-Owner, kein FK-Zweig.
--
-- Pattern-Quelle: sql/migrations/047a/b/c (V8.11 Klasse C) + DEC-305.
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Done-Gate (im /deploy): list_tables_with_authenticated_full_access() bleibt 0;
--   DB-Verify (negativ+positiv, node:20-Sidecar SAVEPOINT) AC-914-2.
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
    RAISE EXCEPTION 'MIG-054: V7-Helper-Functions fehlen (gefunden %, erwarte 2 — is_admin + can_see_owner). MIG-035/047a muessen vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) tasks — deal_id, contact_id, company_id (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (tasks.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (tasks.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id AND can_see_owner(c.owner_user_id)))
      AND (tasks.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id AND can_see_owner(co.owner_user_id)))
      AND (
        tasks.deal_id IS NOT NULL OR tasks.contact_id IS NOT NULL OR tasks.company_id IS NOT NULL
        OR tasks.created_by = auth.uid()
      )
    )
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
    (
      (tasks.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = tasks.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (tasks.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = tasks.contact_id AND can_see_owner(c.owner_user_id)))
      AND (tasks.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = tasks.company_id AND can_see_owner(co.owner_user_id)))
      AND (
        tasks.deal_id IS NOT NULL OR tasks.contact_id IS NOT NULL OR tasks.company_id IS NOT NULL
        OR tasks.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 3) signals — deal_id, contact_id, company_id, activity_id (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS signals_insert ON public.signals;
DROP POLICY IF EXISTS signals_update ON public.signals;

CREATE POLICY signals_insert ON public.signals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (signals.deal_id     IS NULL OR EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id)))
      AND (signals.contact_id  IS NULL OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id)))
      AND (signals.company_id  IS NULL OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id)))
      AND (signals.activity_id IS NULL OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id)))
      AND (
        signals.deal_id IS NOT NULL OR signals.contact_id IS NOT NULL OR signals.company_id IS NOT NULL OR signals.activity_id IS NOT NULL
        OR signals.created_by = auth.uid()
      )
    )
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
    (
      (signals.deal_id     IS NULL OR EXISTS (SELECT 1 FROM public.deals      d  WHERE d.id  = signals.deal_id     AND can_see_owner(d.owner_user_id)))
      AND (signals.contact_id  IS NULL OR EXISTS (SELECT 1 FROM public.contacts   c  WHERE c.id  = signals.contact_id  AND can_see_owner(c.owner_user_id)))
      AND (signals.company_id  IS NULL OR EXISTS (SELECT 1 FROM public.companies  co WHERE co.id = signals.company_id  AND can_see_owner(co.owner_user_id)))
      AND (signals.activity_id IS NULL OR EXISTS (SELECT 1 FROM public.activities a  WHERE a.id  = signals.activity_id AND can_see_owner(a.owner_user_id)))
      AND (
        signals.deal_id IS NOT NULL OR signals.contact_id IS NOT NULL OR signals.company_id IS NOT NULL OR signals.activity_id IS NOT NULL
        OR signals.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 4) calendar_events — deal_id, contact_id, company_id, meeting_id (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;

CREATE POLICY calendar_events_insert ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (calendar_events.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (calendar_events.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id AND can_see_owner(c.owner_user_id)))
      AND (calendar_events.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id AND can_see_owner(co.owner_user_id)))
      AND (calendar_events.meeting_id IS NULL OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id AND can_see_owner(m.owner_user_id)))
      AND (
        calendar_events.deal_id IS NOT NULL OR calendar_events.contact_id IS NOT NULL OR calendar_events.company_id IS NOT NULL OR calendar_events.meeting_id IS NOT NULL
        OR calendar_events.created_by = auth.uid()
      )
    )
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
    (
      (calendar_events.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = calendar_events.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (calendar_events.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = calendar_events.contact_id AND can_see_owner(c.owner_user_id)))
      AND (calendar_events.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = calendar_events.company_id AND can_see_owner(co.owner_user_id)))
      AND (calendar_events.meeting_id IS NULL OR EXISTS (SELECT 1 FROM public.meetings  m  WHERE m.id  = calendar_events.meeting_id AND can_see_owner(m.owner_user_id)))
      AND (
        calendar_events.deal_id IS NOT NULL OR calendar_events.contact_id IS NOT NULL OR calendar_events.company_id IS NOT NULL OR calendar_events.meeting_id IS NOT NULL
        OR calendar_events.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 5) handoffs — deal_id, company_id (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS handoffs_insert ON public.handoffs;
DROP POLICY IF EXISTS handoffs_update ON public.handoffs;

CREATE POLICY handoffs_insert ON public.handoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (handoffs.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (handoffs.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id)))
      AND (
        handoffs.deal_id IS NOT NULL OR handoffs.company_id IS NOT NULL
        OR handoffs.created_by = auth.uid()
      )
    )
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
    (
      (handoffs.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = handoffs.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (handoffs.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = handoffs.company_id AND can_see_owner(co.owner_user_id)))
      AND (
        handoffs.deal_id IS NOT NULL OR handoffs.company_id IS NOT NULL
        OR handoffs.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 6) cadence_enrollments — deal_id, contact_id (+ created_by)
-- ============================================================================
DROP POLICY IF EXISTS cadence_enrollments_insert ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_enrollments_update ON public.cadence_enrollments;

CREATE POLICY cadence_enrollments_insert ON public.cadence_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (cadence_enrollments.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (cadence_enrollments.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id)))
      AND (
        cadence_enrollments.deal_id IS NOT NULL OR cadence_enrollments.contact_id IS NOT NULL
        OR cadence_enrollments.created_by = auth.uid()
      )
    )
    OR is_admin()
  );

CREATE POLICY cadence_enrollments_update ON public.cadence_enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    (
      (cadence_enrollments.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (cadence_enrollments.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id)))
      AND (
        cadence_enrollments.deal_id IS NOT NULL OR cadence_enrollments.contact_id IS NOT NULL
        OR cadence_enrollments.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 7) documents — contact_id, company_id, deal_id (+ created_by)  [documents_table_*]
-- ============================================================================
DROP POLICY IF EXISTS documents_table_insert ON public.documents;
DROP POLICY IF EXISTS documents_table_update ON public.documents;

CREATE POLICY documents_table_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (documents.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id AND can_see_owner(c.owner_user_id)))
      AND (documents.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id)))
      AND (documents.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (
        documents.contact_id IS NOT NULL OR documents.company_id IS NOT NULL OR documents.deal_id IS NOT NULL
        OR documents.created_by = auth.uid()
      )
    )
    OR is_admin()
  );

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
    (
      (documents.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id AND can_see_owner(c.owner_user_id)))
      AND (documents.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id)))
      AND (documents.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (
        documents.contact_id IS NOT NULL OR documents.company_id IS NOT NULL OR documents.deal_id IS NOT NULL
        OR documents.created_by = auth.uid()
      )
    )
    OR is_admin()
  );


-- ============================================================================
-- 8) email_threads — deal_id, contact_id, company_id (KEIN created_by; Orphan nur via is_admin)
-- ============================================================================
DROP POLICY IF EXISTS email_threads_insert ON public.email_threads;
DROP POLICY IF EXISTS email_threads_update ON public.email_threads;

CREATE POLICY email_threads_insert ON public.email_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (email_threads.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (email_threads.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id)))
      AND (email_threads.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id)))
      AND (email_threads.deal_id IS NOT NULL OR email_threads.contact_id IS NOT NULL OR email_threads.company_id IS NOT NULL)
    )
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
    (
      (email_threads.deal_id    IS NULL OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = email_threads.deal_id    AND can_see_owner(d.owner_user_id)))
      AND (email_threads.contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = email_threads.contact_id AND can_see_owner(c.owner_user_id)))
      AND (email_threads.company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = email_threads.company_id AND can_see_owner(co.owner_user_id)))
      AND (email_threads.deal_id IS NOT NULL OR email_threads.contact_id IS NOT NULL OR email_threads.company_id IS NOT NULL)
    )
    OR is_admin()
  );


-- ============================================================================
-- 9) referrals — deal_id, referrer_id, referred_company_id, referred_contact_id (KEIN created_by)
-- ============================================================================
DROP POLICY IF EXISTS referrals_insert ON public.referrals;
DROP POLICY IF EXISTS referrals_update ON public.referrals;

CREATE POLICY referrals_insert ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (referrals.deal_id             IS NULL OR EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id             AND can_see_owner(d.owner_user_id)))
      AND (referrals.referrer_id         IS NULL OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id         AND can_see_owner(cr.owner_user_id)))
      AND (referrals.referred_company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id AND can_see_owner(co.owner_user_id)))
      AND (referrals.referred_contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id AND can_see_owner(rc.owner_user_id)))
      AND (referrals.deal_id IS NOT NULL OR referrals.referrer_id IS NOT NULL OR referrals.referred_company_id IS NOT NULL OR referrals.referred_contact_id IS NOT NULL)
    )
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
    (
      (referrals.deal_id             IS NULL OR EXISTS (SELECT 1 FROM public.deals     d   WHERE d.id   = referrals.deal_id             AND can_see_owner(d.owner_user_id)))
      AND (referrals.referrer_id         IS NULL OR EXISTS (SELECT 1 FROM public.contacts  cr  WHERE cr.id  = referrals.referrer_id         AND can_see_owner(cr.owner_user_id)))
      AND (referrals.referred_company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies co  WHERE co.id  = referrals.referred_company_id AND can_see_owner(co.owner_user_id)))
      AND (referrals.referred_contact_id IS NULL OR EXISTS (SELECT 1 FROM public.contacts  rc  WHERE rc.id  = referrals.referred_contact_id AND can_see_owner(rc.owner_user_id)))
      AND (referrals.deal_id IS NOT NULL OR referrals.referrer_id IS NOT NULL OR referrals.referred_company_id IS NOT NULL OR referrals.referred_contact_id IS NOT NULL)
    )
    OR is_admin()
  );


-- ============================================================================
-- 10) email_attachments — email_id, proposal_id (KEIN created_by; Orphan nur via is_admin)
-- ============================================================================
DROP POLICY IF EXISTS email_attachments_insert ON public.email_attachments;
DROP POLICY IF EXISTS email_attachments_update ON public.email_attachments;

CREATE POLICY email_attachments_insert ON public.email_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (email_attachments.email_id    IS NULL OR EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id)))
      AND (email_attachments.proposal_id IS NULL OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id)))
      AND (email_attachments.email_id IS NOT NULL OR email_attachments.proposal_id IS NOT NULL)
    )
    OR is_admin()
  );

CREATE POLICY email_attachments_update ON public.email_attachments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    (
      (email_attachments.email_id    IS NULL OR EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id)))
      AND (email_attachments.proposal_id IS NULL OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id)))
      AND (email_attachments.email_id IS NOT NULL OR email_attachments.proposal_id IS NOT NULL)
    )
    OR is_admin()
  );


-- ============================================================================
-- 11) Post-Apply Verifikation (Done-Gate)
-- ============================================================================
-- Erwartung: list_tables_with_authenticated_full_access() bleibt 0 (keine full-access-Policy addiert).
-- Sub-Verify (18 Policies = 9 Tabellen x 2 Ops insert/update, neue Conjunction-Shape):
--   SELECT tablename, policyname, cmd,
--          (with_check LIKE '%IS NULL) OR (EXISTS%') AS has_conjunction
--     FROM pg_policies
--    WHERE schemaname='public'
--      AND cmd IN ('INSERT','UPDATE')
--      AND tablename IN ('tasks','signals','calendar_events','handoffs','cadence_enrollments',
--                        'documents','email_threads','referrals','email_attachments')
--    ORDER BY tablename, cmd;
-- Erwartung: 18 Rows, has_conjunction = true fuer alle.
-- DB-Verify (negativ+positiv): cockpit/__tests__/migrations/054-v816-class-c-withcheck.test.ts

NOTIFY pgrst, 'reload schema';
