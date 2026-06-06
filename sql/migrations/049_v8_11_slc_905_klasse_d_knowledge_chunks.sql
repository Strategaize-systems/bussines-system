-- ============================================================================
-- MIG-049 — V8.11 SLC-905 RLS-Sweep Klasse D (knowledge_chunks Schema-Erweiterung + Backfill + Policies + search_knowledge_chunks-Function-Erweiterung)
-- ============================================================================
-- Datum: 2026-06-06 (Apply via SLC-905 MT-2-Live)
-- Idempotent: ja (ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS + DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION).
--
-- Klasse-D-Tabelle (1):
--   1. knowledge_chunks — ALTER ADD COLUMN owner_user_id + team_id, 2 neue Indexe,
--                          neue RLS-Policy mit can_see_owner-Filter,
--                          search_knowledge_chunks-Function um service-bypass-aware Owner-Filter erweitert.
--
-- DECISION D-905-1 (Source-Type-Wording, qa/SLC-905-perf-baseline.md):
--   Live-Code-Convention nutzt 'email' (NICHT 'email_message') und 'deal_activity' (NICHT 'activity').
--   Backfill-SQL Phase 2 nutzt Live-Reality-Werte aus lib/knowledge/indexer.ts:
--     indexEmail()    → reindexSource("email", ...)
--     indexActivity() → reindexSource("deal_activity", ...)
--     indexMeeting()  → reindexSource("meeting", ...)
--     indexDocument() → reindexSource("document", ...)
--   GEWAEHLT: source_type='email' JOIN auf email_messages, source_type='deal_activity' JOIN auf activities.
--
-- DECISION D-905-2 (search_knowledge_chunks-Signatur-Respekt):
--   Live-Function existiert mit Signatur (query_embedding TEXT, match_count INT, filter_scope TEXT, filter_id TEXT).
--   Spec L129-153 nahm vector(1024)+match_threshold+match_count an. R-905-3 erzwingt Signatur-Kompatibilitaet.
--   GEWAEHLT: CREATE OR REPLACE mit EXISTIERENDER 4-Param-Signatur. Nur Body-Filter ergaenzt.
--
-- DECISION D-905-3 (service_role-Bypass-Pattern):
--   can_see_owner(uuid) nutzt intern auth.uid(). Bei service_role-Calls (Cron via createAdminClient):
--   auth.uid() = NULL → can_see_owner returnt NULL → Filter FALSE → Cron broeselt.
--   Strategaize-Standard-Pattern: '(auth.uid() IS NULL OR can_see_owner(...))' im Function-Body
--   (Cron-Bypass-Pattern analog Tabellen-RLS-Policies, NUR fuer Function-internal weil Function
--   SECURITY DEFINER ist und sonst die Definer-Postgres-BYPASSRLS-Effekt einsetzt).
--   GEWAEHLT: Function-Body verwendet '(auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))'.
--   Tabellen-Policy 'knowledge_chunks_select' bleibt OHNE Bypass (BYPASSRLS=true von service_role greift bereits direkt).
--
-- DECISION D-905-4 (search_knowledge_chunks Caller-Defense-in-Depth BEYOND SCOPE):
--   searchKnowledge wird heute via createAdminClient aufgerufen. Damit ist Defense-in-Depth nicht aktiv
--   (auth.uid()=NULL → Bypass). Umstellung auf User-Session-Caller bricht Signal-Extractor-Cron
--   (cross-tenant-Lesen Pflicht).
--   VERTAGT: Caller-Mode-Switch (User-Session vs. service_role) wird in SEC-007-Followup-SLC (V8.12+) adressiert.
--   Pre-Check via loadDealContext User-Client (SEC-891 SEC-003 Mitigation in /api/knowledge/query/route.ts)
--   bleibt aktiv.
--
-- DECISION D-905-5 (MT-5-Code-Target):
--   embedding-sync-Cron macht keine chunk-INSERTs (nur UPDATE bestehender chunks mit status='pending'/'failed').
--   Chunk-INSERTs passieren in lib/knowledge/indexer.ts:embedAndStore (via indexMeeting/indexEmail/...).
--   GEWAEHLT: MT-5 passt indexer.ts an, NICHT embedding-sync-Cron.
--
-- Pattern-Quelle: docs/ARCHITECTURE.md V8.11-Addendum Klasse D + DEC-267 + DEC-273 + Slice-Spec
-- (BLOCKING per .claude/rules/strategaize-pattern-reuse.md)
--
-- Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access):  1 Row (knowledge_chunks)
-- Post-Apply Done-Gate Erwartung:                                        0 Rows
--                                                                       (Q-V8.11-B 100% Coverage erfuellt)
-- ============================================================================


-- ============================================================================
-- 1) Helper-Existenz-Guard (can_see_owner Pflicht)
-- ============================================================================
DO $$
DECLARE
  v_helper_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_helper_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('can_see_owner', 'is_admin', 'is_teamlead', 'get_my_team_id');

  IF v_helper_count < 4 THEN
    RAISE EXCEPTION 'MIG-049: V7-Helper-Functions can_see_owner/is_admin/is_teamlead/get_my_team_id fehlen (gefunden %, erwarte 4). MIG-035 muss vorher applied sein.', v_helper_count;
  END IF;
END $$;


-- ============================================================================
-- 2) Phase 1 — Schema-ALTER (idempotent)
-- ============================================================================
ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS team_id        UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_owner
  ON public.knowledge_chunks(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_team
  ON public.knowledge_chunks(team_id);


-- ============================================================================
-- 3) Phase 2 — Sync-Backfill (DEC-267, atomar)
-- ============================================================================
-- Source-Type-Werte per D-905-1: 'meeting' / 'email' / 'deal_activity' / 'document'.

-- meeting → meetings.owner_user_id
UPDATE public.knowledge_chunks kc
   SET owner_user_id = m.owner_user_id,
       team_id       = p.team_id
  FROM public.meetings m
  JOIN public.profiles p ON p.id = m.owner_user_id
 WHERE kc.source_type = 'meeting'
   AND kc.source_id   = m.id
   AND kc.owner_user_id IS NULL;

-- email → email_messages.owner_user_id
UPDATE public.knowledge_chunks kc
   SET owner_user_id = em.owner_user_id,
       team_id       = p.team_id
  FROM public.email_messages em
  JOIN public.profiles p ON p.id = em.owner_user_id
 WHERE kc.source_type = 'email'
   AND kc.source_id   = em.id
   AND kc.owner_user_id IS NULL;

-- deal_activity → activities.owner_user_id
UPDATE public.knowledge_chunks kc
   SET owner_user_id = a.owner_user_id,
       team_id       = p.team_id
  FROM public.activities a
  JOIN public.profiles p ON p.id = a.owner_user_id
 WHERE kc.source_type = 'deal_activity'
   AND kc.source_id   = a.id
   AND kc.owner_user_id IS NULL;

-- document → documents.created_by
-- documents-Tabelle hat KEINE owner_user_id-Spalte (verifiziert MT-1), nur created_by.
UPDATE public.knowledge_chunks kc
   SET owner_user_id = d.created_by,
       team_id       = p.team_id
  FROM public.documents d
  JOIN public.profiles p ON p.id = d.created_by
 WHERE kc.source_type = 'document'
   AND kc.source_id   = d.id
   AND kc.owner_user_id IS NULL;

-- Backfill-Verifikation (WARNING bei Orphan-Count >0)
DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
    FROM public.knowledge_chunks
   WHERE owner_user_id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE WARNING 'MIG-049 Backfill liess % orphan chunks zurueck (parent-source geloescht oder unbekannter source_type). Siehe qa/SLC-905-orphan-report.md fuer Detail-Auswertung.', v_orphan_count;
  END IF;
END $$;


-- ============================================================================
-- 4) Phase 3 — DROP alte UND neue Policies (idempotent — alle moeglichen Naming-Varianten)
-- ============================================================================
-- Pre-V8.11 Naming-Varianten:
DROP POLICY IF EXISTS authenticated_full_access ON public.knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_full_access ON public.knowledge_chunks;

-- Neue Klasse-D-Naming-Varianten (Re-Apply-Idempotenz):
DROP POLICY IF EXISTS knowledge_chunks_select ON public.knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_insert ON public.knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_update ON public.knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_delete ON public.knowledge_chunks;


-- ============================================================================
-- 5) knowledge_chunks — RLS-Policies (Owner-Filter SELECT, service_role-only Mutate)
-- ============================================================================
-- SELECT: User sieht nur eigene chunks oder team-eigene (via can_see_owner).
-- NULL-owner_user_id-chunks (z.B. service_role-Inserts ohne Owner): nur Admin sichtbar.
-- INSERT/UPDATE/DELETE: WITH CHECK(false) / USING(false) — service_role-only via BYPASSRLS.
CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT TO authenticated
  USING (can_see_owner(owner_user_id));

CREATE POLICY knowledge_chunks_insert ON public.knowledge_chunks
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY knowledge_chunks_update ON public.knowledge_chunks
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY knowledge_chunks_delete ON public.knowledge_chunks
  FOR DELETE TO authenticated
  USING (false);


-- ============================================================================
-- 6) Phase 4 — search_knowledge_chunks-Function um service-bypass-aware Owner-Filter erweitert
-- ============================================================================
-- Live-Signatur respektiert (D-905-2): TEXT-Embedding, 4 Params, 7 Return-Spalten, plpgsql.
-- Body-Filter neu (D-905-3): '(auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))'.
--   service_role-Caller (auth.uid()=NULL) → Bypass → Cron funktional.
--   User-Session-Caller (auth.uid()=uuid) → Owner-Filter aktiv → Defense-in-Depth.
-- Caller-Mode-Switch (User-Session statt admin) BEYOND SCOPE (D-905-4 SEC-007-Followup).
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  query_embedding TEXT,
  match_count     INTEGER DEFAULT 20,
  filter_scope    TEXT DEFAULT NULL,
  filter_id       TEXT DEFAULT NULL
)
RETURNS TABLE(
  id           UUID,
  source_type  TEXT,
  source_id    UUID,
  chunk_index  INTEGER,
  chunk_text   TEXT,
  metadata     JSONB,
  similarity   DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_type,
    kc.source_id,
    kc.chunk_index,
    kc.chunk_text,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding::vector) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.status = 'active'
    AND (auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))
    AND (
      filter_scope IS NULL
      OR (filter_scope = 'deal'    AND kc.metadata->>'deal_id'    = filter_id)
      OR (filter_scope = 'contact' AND kc.metadata->>'contact_id' = filter_id)
      OR (filter_scope = 'company' AND kc.metadata->>'company_id' = filter_id)
    )
  ORDER BY kc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$function$;

-- GRANT EXECUTE bleibt auf authenticated (existing). Backward-compatible.
-- (Pre-Apply: existing GRANT, kein neuer GRANT noetig — Function existierte bereits.)
GRANT EXECUTE ON FUNCTION public.search_knowledge_chunks(TEXT, INTEGER, TEXT, TEXT) TO authenticated;


-- ============================================================================
-- 7) Post-Apply Verifikation (Done-Gate per Sec-Audit-Helper-Function)
-- ============================================================================
-- Erwartung: 0 Rows (1 Pre - 1 knowledge_chunks).
-- Q-V8.11-B 100% Coverage erfuellt → BS multi-tenant-ready.
-- Live-Verify nach Apply per:
--   SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
-- Sub-Sweep-Verify (nur knowledge_chunks):
--   SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename='knowledge_chunks'
--    ORDER BY policyname;
-- Erwartung: 4 Rows (SELECT/INSERT/UPDATE/DELETE).
-- Function-Body-Verify:
--   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='search_knowledge_chunks';
-- Erwartung: Body enthaelt '(auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))'.
-- Backfill-Verify:
--   SELECT COUNT(*) FROM knowledge_chunks WHERE owner_user_id IS NULL;
-- Erwartung: 0 (oder dokumentierte Orphan-Count im qa/SLC-905-orphan-report.md).

NOTIFY pgrst, 'reload schema';
