-- ============================================================================
-- MIG-047c — V8.11 SLC-903 RLS-Sweep Klasse C Block 3 (Polymorph/Special-Cases, 9 Tabellen)
-- ============================================================================
-- Datum: 2026-06-05 (Apply via SLC-903 Sub-Session 3 MT-4 NACH MIG-047b)
-- Idempotent: ja (DROP POLICY IF EXISTS auf alte UND neue Naming-Varianten + CREATE INDEX IF NOT EXISTS).
--
-- Block-3-Tabellen (9 statt 8 — ai_feedback aus Block 2 deferred per DEC-275):
--   1. ai_action_queue       — Polymorph 5-Wege CASE (deal/email_message/contact/company/proposal)
--                              + decided_by-Fallback + admin. **Sub-Decision MT-4 (siehe unten).**
--   2. campaigns             — Klasse-A-Stil: created_by = auth.uid() OR is_admin()
--   3. campaign_links        — Transitive via campaigns (created_by-Pfad)
--   4. campaign_link_clicks  — OQ-arch-5 (c) Admin-only SELECT + service_role mutate; Admin-DELETE (DSGVO)
--   5. automation_runs       — OQ-arch-5 (c) Admin-only SELECT + service_role mutate (kein Owner)
--   6. fit_assessments       — OQ-arch-5 (a) Special: assessed_by = auth.uid() OR is_admin()
--   7. documents             — Multi-Parent OR (contact/company/deal) + created_by + admin
--                              **Policy-Naming `documents_table_*`** (OQ-arch-6 konfliktfrei zu Storage `documents_user_*`)
--   8. email_sync_state      — Admin-only (kein FK, kein Owner)
--   9. ai_feedback           — Transitive via ai_action_queue (DEC-275 — gemeinsam mit Parent migriert)
--
-- DECISION D-MT4-AiActionQueue-Polymorph (Slice-Spec L225 Adaption):
--   Live-Schema-Befund 2026-06-05: ai_action_queue hat KEINE created_by-Spalte (Spec L225 Default unmoeglich).
--   Vorhandene Spalten: entity_type (NOT NULL text), entity_id (NOT NULL uuid), decided_by (nullable uuid).
--   Live-Daten zeigen entity_type-Werte: 'deal' (18 Rows) + 'email_message' (2 Rows). Future-safe: contact/company/proposal.
--   GEWAEHLT: polymorph 5-Wege EXISTS-Pattern (deal/email_message/contact/company/proposal) + decided_by + admin.
--   Begruendung: ai_action_queue ist Hauptqueue fuer Signal-Erkennung ueber alle Entity-Typen.
--   Eingrenzung auf nur 'deal'+'proposal' (Spec L225 Default) wuerde 'email_message' (real-data 2 Rows) blockieren.
--
-- DECISION D-MT4-AiFeedback-Transitive (gemeinsam mit ai_action_queue migriert):
--   ai_feedback hat NUR (id, action_queue_id, feedback_type, reason, created_at). action_queue_id NULLABLE.
--   Transitive Policy dupliziert die polymorph 5-Wege-Logik (PostgreSQL erlaubt kein Policy-Inheritance).
--   NULL-action_queue_id: orphan, nur Admin-sichtbar.
--
-- DECISION D-MT4-Documents-Naming (OQ-arch-6 Live-Verify 2026-06-05):
--   storage.objects hat `documents_user_select/insert/update/delete` (Bucket-Policies V8.10 MIG-041).
--   public.documents bekommt `documents_table_select/insert/update/delete`-Praefix → konflikt-frei.
--
-- Pattern-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse C + DEC-272 + MIG-047a/b
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Performance-Mitigation (R-903-1):
--   5 fehlende Parent-FK-Indizes ergaenzt (CREATE INDEX IF NOT EXISTS):
--     idx_documents_company, idx_documents_deal, idx_documents_created_by,
--     idx_campaigns_created_by, idx_fit_assessments_assessed_by.
--
-- Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access): 11 Rows
-- Post-Apply Done-Gate Erwartung:                                        2 Rows (-9)
--                                                                       (audit_log SLC-904 + knowledge_chunks SLC-905 verbleibend)
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
    RAISE EXCEPTION 'MIG-047c: V7-Helper-Functions fehlen (gefunden %, erwarte 2 — is_admin + can_see_owner). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) Performance-Mitigation: 5 fehlende Parent-FK-Indizes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_company           ON public.documents (company_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal              ON public.documents (deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by        ON public.documents (created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by        ON public.campaigns (created_by);
CREATE INDEX IF NOT EXISTS idx_fit_assessments_assessed_by ON public.fit_assessments (assessed_by);


-- ============================================================================
-- 3) DROP alte UND neue Policies (idempotent — alle moeglichen Naming-Varianten)
-- ============================================================================
-- Pre-V8.11 Naming-Varianten (Pre-MIG-047c):
DROP POLICY IF EXISTS authenticated_full_access ON public.ai_action_queue;
DROP POLICY IF EXISTS ai_action_queue_full_access ON public.ai_action_queue;
DROP POLICY IF EXISTS authenticated_full_access ON public.ai_feedback;
DROP POLICY IF EXISTS ai_feedback_full_access ON public.ai_feedback;
DROP POLICY IF EXISTS authenticated_full_access ON public.campaigns;
DROP POLICY IF EXISTS campaigns_full_access ON public.campaigns;
DROP POLICY IF EXISTS authenticated_full_access ON public.campaign_links;
DROP POLICY IF EXISTS campaign_links_full_access ON public.campaign_links;
DROP POLICY IF EXISTS authenticated_full_access ON public.campaign_link_clicks;
DROP POLICY IF EXISTS campaign_link_clicks_full_access ON public.campaign_link_clicks;
DROP POLICY IF EXISTS authenticated_full_access ON public.automation_runs;
DROP POLICY IF EXISTS automation_runs_full_access ON public.automation_runs;
DROP POLICY IF EXISTS authenticated_full_access ON public.fit_assessments;
DROP POLICY IF EXISTS fit_assessments_full_access ON public.fit_assessments;
DROP POLICY IF EXISTS authenticated_full_access ON public.documents;
DROP POLICY IF EXISTS documents_full_access ON public.documents;
DROP POLICY IF EXISTS authenticated_full_access ON public.email_sync_state;
DROP POLICY IF EXISTS email_sync_state_full_access ON public.email_sync_state;

-- Neue Klasse-C-Naming-Varianten (Re-Apply-Idempotenz):
DROP POLICY IF EXISTS ai_action_queue_select ON public.ai_action_queue;
DROP POLICY IF EXISTS ai_action_queue_insert ON public.ai_action_queue;
DROP POLICY IF EXISTS ai_action_queue_update ON public.ai_action_queue;
DROP POLICY IF EXISTS ai_action_queue_delete ON public.ai_action_queue;
DROP POLICY IF EXISTS ai_feedback_select ON public.ai_feedback;
DROP POLICY IF EXISTS ai_feedback_insert ON public.ai_feedback;
DROP POLICY IF EXISTS ai_feedback_update ON public.ai_feedback;
DROP POLICY IF EXISTS ai_feedback_delete ON public.ai_feedback;
DROP POLICY IF EXISTS campaigns_select ON public.campaigns;
DROP POLICY IF EXISTS campaigns_insert ON public.campaigns;
DROP POLICY IF EXISTS campaigns_update ON public.campaigns;
DROP POLICY IF EXISTS campaigns_delete ON public.campaigns;
DROP POLICY IF EXISTS campaign_links_select ON public.campaign_links;
DROP POLICY IF EXISTS campaign_links_insert ON public.campaign_links;
DROP POLICY IF EXISTS campaign_links_update ON public.campaign_links;
DROP POLICY IF EXISTS campaign_links_delete ON public.campaign_links;
DROP POLICY IF EXISTS campaign_link_clicks_select ON public.campaign_link_clicks;
DROP POLICY IF EXISTS campaign_link_clicks_insert ON public.campaign_link_clicks;
DROP POLICY IF EXISTS campaign_link_clicks_update ON public.campaign_link_clicks;
DROP POLICY IF EXISTS campaign_link_clicks_delete ON public.campaign_link_clicks;
DROP POLICY IF EXISTS automation_runs_select ON public.automation_runs;
DROP POLICY IF EXISTS automation_runs_insert ON public.automation_runs;
DROP POLICY IF EXISTS automation_runs_update ON public.automation_runs;
DROP POLICY IF EXISTS automation_runs_delete ON public.automation_runs;
DROP POLICY IF EXISTS fit_assessments_select ON public.fit_assessments;
DROP POLICY IF EXISTS fit_assessments_insert ON public.fit_assessments;
DROP POLICY IF EXISTS fit_assessments_update ON public.fit_assessments;
DROP POLICY IF EXISTS fit_assessments_delete ON public.fit_assessments;
DROP POLICY IF EXISTS documents_table_select ON public.documents;
DROP POLICY IF EXISTS documents_table_insert ON public.documents;
DROP POLICY IF EXISTS documents_table_update ON public.documents;
DROP POLICY IF EXISTS documents_table_delete ON public.documents;
DROP POLICY IF EXISTS email_sync_state_select ON public.email_sync_state;
DROP POLICY IF EXISTS email_sync_state_insert ON public.email_sync_state;
DROP POLICY IF EXISTS email_sync_state_update ON public.email_sync_state;
DROP POLICY IF EXISTS email_sync_state_delete ON public.email_sync_state;


-- ============================================================================
-- 4) ai_action_queue — Polymorph 5-Wege CASE + decided_by-Fallback + admin
-- ============================================================================
-- entity_type-Pfade: deal -> deals, email_message -> emails, contact -> contacts, company -> companies, proposal -> proposals.
-- decided_by-Fallback: User der bereits decided hat (own decision) bleibt sichtbar.
-- Pre-decision (decided_by IS NULL): nur via entity_type-Parent oder admin.
CREATE POLICY ai_action_queue_select ON public.ai_action_queue
  FOR SELECT TO authenticated
  USING (
    (ai_action_queue.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = ai_action_queue.entity_id AND can_see_owner(d.owner_user_id)))
    OR (ai_action_queue.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = ai_action_queue.entity_id AND can_see_owner(e.owner_user_id)))
    OR (ai_action_queue.entity_type = 'contact'    AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = ai_action_queue.entity_id AND can_see_owner(c.owner_user_id)))
    OR (ai_action_queue.entity_type = 'company'    AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = ai_action_queue.entity_id AND can_see_owner(co.owner_user_id)))
    OR (ai_action_queue.entity_type = 'proposal'   AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = ai_action_queue.entity_id AND can_see_owner(p.owner_user_id)))
    OR (ai_action_queue.decided_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY ai_action_queue_insert ON public.ai_action_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    (ai_action_queue.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = ai_action_queue.entity_id AND can_see_owner(d.owner_user_id)))
    OR (ai_action_queue.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = ai_action_queue.entity_id AND can_see_owner(e.owner_user_id)))
    OR (ai_action_queue.entity_type = 'contact'    AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = ai_action_queue.entity_id AND can_see_owner(c.owner_user_id)))
    OR (ai_action_queue.entity_type = 'company'    AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = ai_action_queue.entity_id AND can_see_owner(co.owner_user_id)))
    OR (ai_action_queue.entity_type = 'proposal'   AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = ai_action_queue.entity_id AND can_see_owner(p.owner_user_id)))
    OR is_admin()
  );

CREATE POLICY ai_action_queue_update ON public.ai_action_queue
  FOR UPDATE TO authenticated
  USING (
    (ai_action_queue.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = ai_action_queue.entity_id AND can_see_owner(d.owner_user_id)))
    OR (ai_action_queue.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = ai_action_queue.entity_id AND can_see_owner(e.owner_user_id)))
    OR (ai_action_queue.entity_type = 'contact'    AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = ai_action_queue.entity_id AND can_see_owner(c.owner_user_id)))
    OR (ai_action_queue.entity_type = 'company'    AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = ai_action_queue.entity_id AND can_see_owner(co.owner_user_id)))
    OR (ai_action_queue.entity_type = 'proposal'   AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = ai_action_queue.entity_id AND can_see_owner(p.owner_user_id)))
    OR (ai_action_queue.decided_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    (ai_action_queue.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = ai_action_queue.entity_id AND can_see_owner(d.owner_user_id)))
    OR (ai_action_queue.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = ai_action_queue.entity_id AND can_see_owner(e.owner_user_id)))
    OR (ai_action_queue.entity_type = 'contact'    AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = ai_action_queue.entity_id AND can_see_owner(c.owner_user_id)))
    OR (ai_action_queue.entity_type = 'company'    AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = ai_action_queue.entity_id AND can_see_owner(co.owner_user_id)))
    OR (ai_action_queue.entity_type = 'proposal'   AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = ai_action_queue.entity_id AND can_see_owner(p.owner_user_id)))
    OR (ai_action_queue.decided_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY ai_action_queue_delete ON public.ai_action_queue
  FOR DELETE TO authenticated
  USING (
    (ai_action_queue.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = ai_action_queue.entity_id AND can_see_owner(d.owner_user_id)))
    OR (ai_action_queue.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = ai_action_queue.entity_id AND can_see_owner(e.owner_user_id)))
    OR (ai_action_queue.entity_type = 'contact'    AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = ai_action_queue.entity_id AND can_see_owner(c.owner_user_id)))
    OR (ai_action_queue.entity_type = 'company'    AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = ai_action_queue.entity_id AND can_see_owner(co.owner_user_id)))
    OR (ai_action_queue.entity_type = 'proposal'   AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = ai_action_queue.entity_id AND can_see_owner(p.owner_user_id)))
    OR (ai_action_queue.decided_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 5) ai_feedback — Transitive via ai_action_queue (DEC-275)
-- ============================================================================
-- Dupliziert die polymorph 5-Wege-Logik via subquery (PostgreSQL hat kein Policy-Inheritance).
-- NULL-action_queue_id: orphan, nur Admin-sichtbar.
CREATE POLICY ai_feedback_select ON public.ai_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_action_queue q
       WHERE q.id = ai_feedback.action_queue_id
         AND (
              (q.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = q.entity_id AND can_see_owner(d.owner_user_id)))
           OR (q.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = q.entity_id AND can_see_owner(e.owner_user_id)))
           OR (q.entity_type = 'contact'       AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = q.entity_id AND can_see_owner(c.owner_user_id)))
           OR (q.entity_type = 'company'       AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = q.entity_id AND can_see_owner(co.owner_user_id)))
           OR (q.entity_type = 'proposal'      AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = q.entity_id AND can_see_owner(p.owner_user_id)))
           OR (q.decided_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY ai_feedback_insert ON public.ai_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_action_queue q
       WHERE q.id = ai_feedback.action_queue_id
         AND (
              (q.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = q.entity_id AND can_see_owner(d.owner_user_id)))
           OR (q.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = q.entity_id AND can_see_owner(e.owner_user_id)))
           OR (q.entity_type = 'contact'       AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = q.entity_id AND can_see_owner(c.owner_user_id)))
           OR (q.entity_type = 'company'       AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = q.entity_id AND can_see_owner(co.owner_user_id)))
           OR (q.entity_type = 'proposal'      AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = q.entity_id AND can_see_owner(p.owner_user_id)))
           OR (q.decided_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY ai_feedback_update ON public.ai_feedback
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_action_queue q
       WHERE q.id = ai_feedback.action_queue_id
         AND (
              (q.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = q.entity_id AND can_see_owner(d.owner_user_id)))
           OR (q.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = q.entity_id AND can_see_owner(e.owner_user_id)))
           OR (q.entity_type = 'contact'       AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = q.entity_id AND can_see_owner(c.owner_user_id)))
           OR (q.entity_type = 'company'       AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = q.entity_id AND can_see_owner(co.owner_user_id)))
           OR (q.entity_type = 'proposal'      AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = q.entity_id AND can_see_owner(p.owner_user_id)))
           OR (q.decided_by = auth.uid())
         )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_action_queue q
       WHERE q.id = ai_feedback.action_queue_id
         AND (
              (q.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = q.entity_id AND can_see_owner(d.owner_user_id)))
           OR (q.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = q.entity_id AND can_see_owner(e.owner_user_id)))
           OR (q.entity_type = 'contact'       AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = q.entity_id AND can_see_owner(c.owner_user_id)))
           OR (q.entity_type = 'company'       AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = q.entity_id AND can_see_owner(co.owner_user_id)))
           OR (q.entity_type = 'proposal'      AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = q.entity_id AND can_see_owner(p.owner_user_id)))
           OR (q.decided_by = auth.uid())
         )
    )
    OR is_admin()
  );

CREATE POLICY ai_feedback_delete ON public.ai_feedback
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_action_queue q
       WHERE q.id = ai_feedback.action_queue_id
         AND (
              (q.entity_type = 'deal'          AND EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = q.entity_id AND can_see_owner(d.owner_user_id)))
           OR (q.entity_type = 'email_message' AND EXISTS (SELECT 1 FROM public.emails    e  WHERE e.id  = q.entity_id AND can_see_owner(e.owner_user_id)))
           OR (q.entity_type = 'contact'       AND EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = q.entity_id AND can_see_owner(c.owner_user_id)))
           OR (q.entity_type = 'company'       AND EXISTS (SELECT 1 FROM public.companies co WHERE co.id = q.entity_id AND can_see_owner(co.owner_user_id)))
           OR (q.entity_type = 'proposal'      AND EXISTS (SELECT 1 FROM public.proposals p  WHERE p.id  = q.entity_id AND can_see_owner(p.owner_user_id)))
           OR (q.decided_by = auth.uid())
         )
    )
    OR is_admin()
  );


-- ============================================================================
-- 6) campaigns — Klasse-A-Stil: created_by = auth.uid() OR is_admin()
-- ============================================================================
CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (campaigns.created_by = auth.uid() OR is_admin());

CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (campaigns.created_by = auth.uid() OR is_admin());

CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (campaigns.created_by = auth.uid() OR is_admin())
  WITH CHECK (campaigns.created_by = auth.uid() OR is_admin());

CREATE POLICY campaigns_delete ON public.campaigns
  FOR DELETE TO authenticated
  USING (campaigns.created_by = auth.uid() OR is_admin());


-- ============================================================================
-- 7) campaign_links — Transitive via campaigns + admin
-- ============================================================================
CREATE POLICY campaign_links_select ON public.campaign_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_links.campaign_id AND (c.created_by = auth.uid() OR is_admin()))
    OR is_admin()
  );

CREATE POLICY campaign_links_insert ON public.campaign_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_links.campaign_id AND (c.created_by = auth.uid() OR is_admin()))
    OR is_admin()
  );

CREATE POLICY campaign_links_update ON public.campaign_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_links.campaign_id AND (c.created_by = auth.uid() OR is_admin()))
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_links.campaign_id AND (c.created_by = auth.uid() OR is_admin()))
    OR is_admin()
  );

CREATE POLICY campaign_links_delete ON public.campaign_links
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_links.campaign_id AND (c.created_by = auth.uid() OR is_admin()))
    OR is_admin()
  );


-- ============================================================================
-- 8) campaign_link_clicks — OQ-arch-5 (c) Admin-only SELECT + service_role mutate + Admin DELETE (DSGVO)
-- ============================================================================
-- INSERT/UPDATE: authenticated bekommt false (WITH CHECK false), service_role bypassed RLS.
-- Public-Tracking-Pixel-Insert via /r/[token] nutzt createAdminClient (service_role) — bestaetigt durch grep-Audit MT-4-B.
-- DELETE: Admin (DSGVO-Cleanup ueber /api/cron/click-log-cleanup mit Cron-Service-Role oder Admin-Bypass).
CREATE POLICY campaign_link_clicks_select ON public.campaign_link_clicks
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY campaign_link_clicks_insert ON public.campaign_link_clicks
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY campaign_link_clicks_update ON public.campaign_link_clicks
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY campaign_link_clicks_delete ON public.campaign_link_clicks
  FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================================
-- 9) automation_runs — OQ-arch-5 (c) Admin-only SELECT + service_role mutate
-- ============================================================================
-- INSERT/UPDATE/DELETE: authenticated false; Cron schreibt mit service_role (RLS bypassed).
-- Cron-Endpoints `/api/cron/automation-runner` + recursion-guard + executor (siehe Audit MT-6).
CREATE POLICY automation_runs_select ON public.automation_runs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY automation_runs_insert ON public.automation_runs
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY automation_runs_update ON public.automation_runs
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY automation_runs_delete ON public.automation_runs
  FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================================
-- 10) fit_assessments — Special: assessed_by = auth.uid() OR is_admin()
-- ============================================================================
-- OQ-arch-5 (a): polymorph entity_type/_id-Pattern zu fragil, assessed_by ist stabil.
CREATE POLICY fit_assessments_select ON public.fit_assessments
  FOR SELECT TO authenticated
  USING (fit_assessments.assessed_by = auth.uid() OR is_admin());

CREATE POLICY fit_assessments_insert ON public.fit_assessments
  FOR INSERT TO authenticated
  WITH CHECK (fit_assessments.assessed_by = auth.uid() OR is_admin());

CREATE POLICY fit_assessments_update ON public.fit_assessments
  FOR UPDATE TO authenticated
  USING (fit_assessments.assessed_by = auth.uid() OR is_admin())
  WITH CHECK (fit_assessments.assessed_by = auth.uid() OR is_admin());

CREATE POLICY fit_assessments_delete ON public.fit_assessments
  FOR DELETE TO authenticated
  USING (fit_assessments.assessed_by = auth.uid() OR is_admin());


-- ============================================================================
-- 11) documents (public.documents) — Multi-Parent OR + created_by + admin
-- ============================================================================
-- OQ-arch-6: Policy-Naming `documents_table_*` (konflikt-frei zu storage.objects `documents_user_*`).
CREATE POLICY documents_table_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY documents_table_insert ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY documents_table_update ON public.documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  );

CREATE POLICY documents_table_delete ON public.documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contacts  c  WHERE c.id  = documents.contact_id  AND can_see_owner(c.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.companies co WHERE co.id = documents.company_id AND can_see_owner(co.owner_user_id))
    OR EXISTS (SELECT 1 FROM public.deals     d  WHERE d.id  = documents.deal_id    AND can_see_owner(d.owner_user_id))
    OR (documents.contact_id IS NULL AND documents.company_id IS NULL AND documents.deal_id IS NULL AND documents.created_by = auth.uid())
    OR is_admin()
  );


-- ============================================================================
-- 12) email_sync_state — Admin-only (kein FK, kein Owner)
-- ============================================================================
CREATE POLICY email_sync_state_select ON public.email_sync_state
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY email_sync_state_insert ON public.email_sync_state
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY email_sync_state_update ON public.email_sync_state
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY email_sync_state_delete ON public.email_sync_state
  FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================================
-- 13) Post-Apply Verifikation (Done-Gate per Sec-Audit-Helper-Function)
-- ============================================================================
-- Erwartung: 2 Rows (11 Pre - 9 Block-3).
-- Verbleibend: audit_log (SLC-904) + knowledge_chunks (SLC-905).
-- Live-Verify nach Apply per:
--   SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
-- Sub-Sweep-Verify (nur Block 3):
--   SELECT tablename, COUNT(policyname) FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('ai_action_queue','ai_feedback','campaigns','campaign_links',
--                        'campaign_link_clicks','automation_runs','fit_assessments',
--                        'documents','email_sync_state')
--    GROUP BY tablename ORDER BY tablename;
-- Erwartung: 9 Tabellen x 4 Policies = 36 Rows.

NOTIFY pgrst, 'reload schema';
