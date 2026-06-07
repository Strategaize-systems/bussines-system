-- ============================================================================
-- MIG-047b — V8.11 SLC-903 RLS-Sweep Klasse C Block 2 (Proposal/Email/Cadence-FK, 7 Tabellen)
-- ============================================================================
-- Datum: 2026-06-05 (Apply via SLC-903 Sub-Session 2 MT-3 NACH MIG-047a)
-- Idempotent: ja (DROP POLICY IF EXISTS auf alte UND neue Naming-Varianten + CREATE INDEX IF NOT EXISTS).
--
-- Block-2-Tabellen (7 statt 8 — ai_feedback deferred Block 3):
--   1. proposal_items              (proposal_id)                    — Single-Parent EXISTS proposals
--   2. proposal_payment_milestones (proposal_id)                    — Single-Parent EXISTS proposals
--   3. email_attachments           (email_id, proposal_id)          — Multi-Parent OR
--   4. emails                      (owner_user_id direkt + deal/contact/company/created_by) — V7-Direct-Pattern (analog companies/contacts/deals MIG-035)
--   5. cadence_enrollments         (deal_id, contact_id, created_by)— Multi-Parent OR + created_by (OQ-arch-5 a)
--   6. cadence_executions          (enrollment_id transitiv)        — Transitive-Parent via cadence_enrollments
--   7. email_tracking_events       (email_id mittelbar)             — OQ-arch-5 (a) via emails.owner_user_id
--
-- DECISION D-MT3-AiFeedback-Defer (Block-2 -> Block-3):
--   ai_feedback hat NUR (id, action_queue_id) — kein created_by, kein owner. Da ai_action_queue
--   (Block-3-Tabelle) noch unmigriert ist (authenticated_full_access), waere ai_feedback's
--   transitive EXISTS-Pattern unsicher (ai_action_queue oeffnet alles fuer authenticated).
--   Stattdessen: ai_feedback gemeinsam mit ai_action_queue in MIG-047c (Block 3) migriert.
--   Wirkung: Block-2 = 7 statt 8 Tabellen. Block-3 = 9 statt 8 Tabellen. Net unveraendert.
--
-- Performance-Mitigation (R-903-1):
--   4 fehlende Parent-FK-Indizes werden ergaenzt (CREATE INDEX IF NOT EXISTS).
--   emails.owner_user_id ist bereits indexiert (idx_emails_owner_user_id) -> V7-Pattern effizient.
--
-- Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access): 18 Rows
-- Post-Apply Done-Gate Erwartung:                                       11 Rows (-7)
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
    RAISE EXCEPTION 'MIG-047b: V7-Helper-Functions fehlen (gefunden %, erwarte 2 — is_admin + can_see_owner). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) Performance-Mitigation: 4 fehlende Parent-FK-Indizes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_company             ON public.emails (company_id);
CREATE INDEX IF NOT EXISTS idx_emails_created_by          ON public.emails (created_by);
CREATE INDEX IF NOT EXISTS idx_cadence_enrollments_created_by ON public.cadence_enrollments (created_by);
CREATE INDEX IF NOT EXISTS idx_cadence_executions_email  ON public.cadence_executions (email_id);


-- ============================================================================
-- 3) DROP alte UND neue Policies (idempotent — alle moeglichen Naming-Varianten)
-- ============================================================================
-- Pre-V8.11 Naming-Varianten:
DROP POLICY IF EXISTS authenticated_full_access ON public.proposal_items;
DROP POLICY IF EXISTS proposal_items_full_access ON public.proposal_items;
DROP POLICY IF EXISTS authenticated_full_access ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS proposal_payment_milestones_full_access ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS authenticated_full_access ON public.email_attachments;
DROP POLICY IF EXISTS email_attachments_full_access ON public.email_attachments;
DROP POLICY IF EXISTS authenticated_full_access ON public.emails;
DROP POLICY IF EXISTS emails_full_access ON public.emails;
DROP POLICY IF EXISTS authenticated_full_access ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_enrollments_full_access ON public.cadence_enrollments;
DROP POLICY IF EXISTS authenticated_full_access ON public.cadence_executions;
DROP POLICY IF EXISTS cadence_executions_full_access ON public.cadence_executions;
DROP POLICY IF EXISTS authenticated_full_access ON public.email_tracking_events;
DROP POLICY IF EXISTS email_tracking_events_full_access ON public.email_tracking_events;

-- Neue Klasse-C-Naming-Varianten (Re-Apply-Idempotenz):
DROP POLICY IF EXISTS proposal_items_select ON public.proposal_items;
DROP POLICY IF EXISTS proposal_items_insert ON public.proposal_items;
DROP POLICY IF EXISTS proposal_items_update ON public.proposal_items;
DROP POLICY IF EXISTS proposal_items_delete ON public.proposal_items;
DROP POLICY IF EXISTS proposal_payment_milestones_select ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS proposal_payment_milestones_insert ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS proposal_payment_milestones_update ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS proposal_payment_milestones_delete ON public.proposal_payment_milestones;
DROP POLICY IF EXISTS email_attachments_select ON public.email_attachments;
DROP POLICY IF EXISTS email_attachments_insert ON public.email_attachments;
DROP POLICY IF EXISTS email_attachments_update ON public.email_attachments;
DROP POLICY IF EXISTS email_attachments_delete ON public.email_attachments;
DROP POLICY IF EXISTS emails_select ON public.emails;
DROP POLICY IF EXISTS emails_insert ON public.emails;
DROP POLICY IF EXISTS emails_update ON public.emails;
DROP POLICY IF EXISTS emails_delete ON public.emails;
DROP POLICY IF EXISTS cadence_enrollments_select ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_enrollments_insert ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_enrollments_update ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_enrollments_delete ON public.cadence_enrollments;
DROP POLICY IF EXISTS cadence_executions_select ON public.cadence_executions;
DROP POLICY IF EXISTS cadence_executions_insert ON public.cadence_executions;
DROP POLICY IF EXISTS cadence_executions_update ON public.cadence_executions;
DROP POLICY IF EXISTS cadence_executions_delete ON public.cadence_executions;
DROP POLICY IF EXISTS email_tracking_events_select ON public.email_tracking_events;
DROP POLICY IF EXISTS email_tracking_events_insert ON public.email_tracking_events;
DROP POLICY IF EXISTS email_tracking_events_update ON public.email_tracking_events;
DROP POLICY IF EXISTS email_tracking_events_delete ON public.email_tracking_events;


-- ============================================================================
-- 4) proposal_items — Single-Parent EXISTS proposals + admin
-- ============================================================================
CREATE POLICY proposal_items_select ON public.proposal_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_items_insert ON public.proposal_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_items_update ON public.proposal_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_items_delete ON public.proposal_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_items.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 5) proposal_payment_milestones — Single-Parent EXISTS proposals + admin
-- ============================================================================
CREATE POLICY proposal_payment_milestones_select ON public.proposal_payment_milestones
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_payment_milestones.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_payment_milestones_insert ON public.proposal_payment_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_payment_milestones.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_payment_milestones_update ON public.proposal_payment_milestones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_payment_milestones.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_payment_milestones.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY proposal_payment_milestones_delete ON public.proposal_payment_milestones
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_payment_milestones.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 6) email_attachments — Multi-Parent OR (email_id, proposal_id) + admin
-- ============================================================================
CREATE POLICY email_attachments_select ON public.email_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_attachments_insert ON public.email_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
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
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_attachments_delete ON public.email_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails    e WHERE e.id = email_attachments.email_id    AND can_see_owner(e.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = email_attachments.proposal_id AND can_see_owner(p.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 7) emails — V7-Direct (owner_user_id) — analog companies/contacts/deals MIG-035
-- ============================================================================
-- SELECT/UPDATE per can_see_owner (team-share), INSERT/DELETE per direct owner_user_id (own).
CREATE POLICY emails_select ON public.emails
  FOR SELECT TO authenticated
  USING (can_see_owner(owner_user_id));

CREATE POLICY emails_insert ON public.emails
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR is_admin());

CREATE POLICY emails_update ON public.emails
  FOR UPDATE TO authenticated
  USING (can_see_owner(owner_user_id))
  WITH CHECK (owner_user_id = auth.uid() OR is_admin());

CREATE POLICY emails_delete ON public.emails
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR is_admin());


-- ============================================================================
-- 8) cadence_enrollments — Multi-Parent OR (deal_id, contact_id) + created_by + admin (OQ-arch-5 a)
-- ============================================================================
CREATE POLICY cadence_enrollments_select ON public.cadence_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY cadence_enrollments_insert ON public.cadence_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
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
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY cadence_enrollments_delete ON public.cadence_enrollments
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = cadence_enrollments.deal_id    AND can_see_owner(d.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = cadence_enrollments.contact_id AND can_see_owner(c.owner_user_id))
    OR (cadence_enrollments.deal_id IS NULL AND cadence_enrollments.contact_id IS NULL AND cadence_enrollments.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 9) cadence_executions — Transitive-Parent via cadence_enrollments + admin
-- ============================================================================
CREATE POLICY cadence_executions_select ON public.cadence_executions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = ce.deal_id    AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR (ce.deal_id IS NULL AND ce.contact_id IS NULL AND ce.created_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY cadence_executions_insert ON public.cadence_executions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = ce.deal_id    AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR (ce.deal_id IS NULL AND ce.contact_id IS NULL AND ce.created_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY cadence_executions_update ON public.cadence_executions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = ce.deal_id    AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR (ce.deal_id IS NULL AND ce.contact_id IS NULL AND ce.created_by = auth.uid())
         )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = ce.deal_id    AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR (ce.deal_id IS NULL AND ce.contact_id IS NULL AND ce.created_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY cadence_executions_delete ON public.cadence_executions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cadence_enrollments ce
       WHERE ce.id = cadence_executions.enrollment_id
         AND (
              EXISTS (SELECT 1 FROM public.deals    d WHERE d.id = ce.deal_id    AND can_see_owner(d.owner_user_id))
           OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ce.contact_id AND can_see_owner(c.owner_user_id))
           OR (ce.deal_id IS NULL AND ce.contact_id IS NULL AND ce.created_by = auth.uid())
         )
    )
    OR is_admin()
  );


-- ============================================================================
-- 10) email_tracking_events — Mittelbar via emails.owner_user_id (OQ-arch-5 a)
-- ============================================================================
CREATE POLICY email_tracking_events_select ON public.email_tracking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_tracking_events.email_id AND can_see_owner(e.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_tracking_events_insert ON public.email_tracking_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_tracking_events.email_id AND can_see_owner(e.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_tracking_events_update ON public.email_tracking_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_tracking_events.email_id AND can_see_owner(e.owner_user_id))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_tracking_events.email_id AND can_see_owner(e.owner_user_id))
    OR is_admin()
  );

CREATE POLICY email_tracking_events_delete ON public.email_tracking_events
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.emails e WHERE e.id = email_tracking_events.email_id AND can_see_owner(e.owner_user_id))
    OR is_admin()
  );


-- ============================================================================
-- 11) Post-Apply Verifikation (Done-Gate per Sec-Audit-Helper-Function)
-- ============================================================================
-- Erwartung: 11 Rows (18 Pre - 7 Block-2 ohne ai_feedback).
-- ai_feedback bleibt mit authenticated_full_access bis MIG-047c (Block 3).
-- Live-Verify nach Apply per:
--   SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
-- Sub-Sweep-Verify (nur Block 2):
--   SELECT tablename, COUNT(policyname) FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('proposal_items','proposal_payment_milestones','email_attachments',
--                        'emails','cadence_enrollments','cadence_executions','email_tracking_events')
--    GROUP BY tablename ORDER BY tablename;
-- Erwartung: 7 Tabellen x 4 Policies = 28 Rows.

NOTIFY pgrst, 'reload schema';
