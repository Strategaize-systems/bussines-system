# SLC-905 — V8.11 RLS-Sweep Klasse D (knowledge_chunks Schema-Erweiterung + Backfill + search_knowledge_chunks-Function-Erweiterung + 100% Coverage Done-Gate)

**Status:** planned
**Version:** V8.11
**Feature:** FEAT-911
**Backlog:** BL-500-905
**Created:** 2026-06-04
**Architecture:** docs/ARCHITECTURE.md V8.11-Addendum (Klasse D) + DEC-273 + DEC-267
**Slice-Reihenfolge (DEC-265):** Sub-Slice 5 von 5 — destructive Schema-ALTER zuletzt, profitiert von eingespielter Pipeline aus 4 vorherigen Slices
**Aufwand-Schaetzung:** ~4-5h Code-Side
**Migration:** MIG-049 (destructive: ALTER TABLE)
**Worktree:** `v8-11-rls-sweep` (cumulative)

## Goal

`knowledge_chunks` bekommt 2 neue Spalten (`owner_user_id`, `team_id`), Backfill aus Parent-Source (meetings/email_messages/activities/documents), 2 Indexe und neue RLS-Policy. Plus `search_knowledge_chunks`-RPC-Function wird um Owner-Filter erweitert (schliesst SEC-007 Lese-Pfad-Teil). Embedding-Sync-Cron wird Pflicht-MT angepasst.

**Done-Gate:** post-SLC-905 returns `list_tables_with_authenticated_full_access()` **0 Rows** → Q-V8.11-B 100% Coverage erfuellt → BS multi-tenant-ready.

## Tabelle (1) + Function (1)

| Asset | Aenderung |
|---|---|
| `knowledge_chunks` | ALTER ADD COLUMN owner_user_id UUID + team_id UUID, 2 neue Indexe, neue Policy mit can_see_owner |
| `search_knowledge_chunks()` RPC | Function-Body um `WHERE can_see_owner(owner_user_id)`-Filter ergaenzen (SECURITY DEFINER bleibt) |
| `/api/cron/embedding-sync` Code | Pflicht-Anpassung: chunk-INSERT muss owner_user_id+team_id aus source-Parent ableiten |

## Migration MIG-049 (4 Phasen, atomar in einer Migration)

### Phase 1 — Schema-ALTER (idempotent)

```sql
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS team_id        UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_owner ON knowledge_chunks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_team  ON knowledge_chunks(team_id);
```

### Phase 2 — Sync-Backfill (DEC-267, atomar)

```sql
-- meeting-source
UPDATE knowledge_chunks kc
   SET owner_user_id = m.owner_user_id,
       team_id       = p.team_id
  FROM meetings m
  JOIN profiles p ON p.id = m.owner_user_id
 WHERE kc.source_type = 'meeting'
   AND kc.source_id   = m.id
   AND kc.owner_user_id IS NULL;

-- email_message-source
UPDATE knowledge_chunks kc
   SET owner_user_id = em.owner_user_id,
       team_id       = p.team_id
  FROM email_messages em
  JOIN profiles p ON p.id = em.owner_user_id
 WHERE kc.source_type = 'email_message'
   AND kc.source_id   = em.id
   AND kc.owner_user_id IS NULL;

-- activity-source
UPDATE knowledge_chunks kc
   SET owner_user_id = a.owner_user_id,
       team_id       = p.team_id
  FROM activities a
  JOIN profiles p ON p.id = a.owner_user_id
 WHERE kc.source_type = 'activity'
   AND kc.source_id   = a.id
   AND kc.owner_user_id IS NULL;

-- document-source (PUBLIC documents-Tabelle, hat created_by)
-- Annahme: documents.created_by ist owner_user_id-Aequivalent (verifizieren in MT-1)
UPDATE knowledge_chunks kc
   SET owner_user_id = d.created_by,
       team_id       = p.team_id
  FROM documents d
  JOIN profiles p ON p.id = d.created_by
 WHERE kc.source_type = 'document'
   AND kc.source_id   = d.id
   AND kc.owner_user_id IS NULL;

-- Backfill-Verifikation (Pflicht-Check)
DO $$
DECLARE orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
    FROM knowledge_chunks
   WHERE owner_user_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'MIG-049 Backfill liess % orphan chunks zurueck (parent-source geloescht). Siehe qa/SLC-905-orphan-report.md.', orphan_count;
  END IF;
END $$;
```

**Orphan-Handling:** Falls Parent-Source nach Backfill noch geloescht ist (z.B. meeting geloescht aber chunks blieben), bleibt `owner_user_id = NULL`. Policy filtert die Orphan-Chunks dann via `can_see_owner(NULL)` → nur fuer Admin sichtbar. Im Cleanup separat (V9-Hotfix oder Cron) loeschen. MT-2 Orphan-Report dokumentiert die Anzahl.

### Phase 3 — RLS-Policy

```sql
DROP POLICY IF EXISTS authenticated_full_access ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_select ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_insert ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_update ON knowledge_chunks;
DROP POLICY IF EXISTS knowledge_chunks_delete ON knowledge_chunks;

CREATE POLICY knowledge_chunks_select ON knowledge_chunks
  FOR SELECT TO authenticated
  USING (can_see_owner(owner_user_id));

CREATE POLICY knowledge_chunks_insert ON knowledge_chunks
  FOR INSERT TO authenticated
  WITH CHECK (false);  -- service_role bypassed RLS

CREATE POLICY knowledge_chunks_update ON knowledge_chunks
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY knowledge_chunks_delete ON knowledge_chunks
  FOR DELETE TO authenticated
  USING (false);  -- service_role oder Admin via service_role-Skript
```

### Phase 4 — search_knowledge_chunks-RPC-Function Erweiterung

```sql
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kc.id, kc.chunk_text, kc.metadata,
         1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
   WHERE kc.status = 'active'
     AND kc.embedding <=> query_embedding < (1 - match_threshold)
     AND can_see_owner(kc.owner_user_id)  -- NEU: Owner-Filter, schliesst SEC-007 Lese-Pfad
   ORDER BY kc.embedding <=> query_embedding
   LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION search_knowledge_chunks(vector, FLOAT, INTEGER) TO authenticated;
```

**Begruendung:** `search_knowledge_chunks` ist SECURITY DEFINER → umgeht knowledge_chunks-RLS strukturell. Ohne `can_see_owner`-Filter im Function-Body wuerde User-RPC-Aufruf cross-tenant-Chunks zurueckliefern, obwohl die Policy auf der Tabelle das verhindern wuerde. Function-Body-Filter ist die einzige Defense gegen das Bypass-Loch.

## Acceptance Criteria

- **AC-905-1:** MT-1 documents-Schema-Verify: `documents.created_by` ist die owner-Spalte (oder MT-1 dokumentiert alternativen Pfad — z.B. JOIN auf deal/contact owner_user_id).
- **AC-905-2:** MIG-049 idempotent applied. Re-Apply ohne Fehler.
- **AC-905-3:** Schema-Verify: `knowledge_chunks` hat 2 neue Spalten (`owner_user_id`, `team_id`) + 2 neue Indexe.
- **AC-905-4:** Backfill-Verifikation: `SELECT COUNT(*) FROM knowledge_chunks WHERE owner_user_id IS NULL` = orphan-count (dokumentiert in `qa/SLC-905-orphan-report.md`). Zielwert: 0 oder orphan-only-Anzahl mit Begruendung.
- **AC-905-5:** 4 Policies auf knowledge_chunks, davon 3 mit `USING (false)` / `WITH CHECK (false)` (Mutate-service_role-only).
- **AC-905-6:** `search_knowledge_chunks`-Function-Body enthaelt `can_see_owner(owner_user_id)`-Filter. Verifikation per `pg_get_functiondef(oid)`.
- **AC-905-7:** Vitest `cockpit/__tests__/rls/v8-11-slc-905-rls-matrix.test.ts` GREEN ~20 Tests:
  - 4 admin × 4 ops (admin SELECT allowed, Mutate FAIL via authenticated-Session)
  - 4 teamlead × 4 ops (SELECT auf own-team-chunks allowed, foreign-team denied)
  - 4 member-2 × 4 ops (SELECT auf own-chunks allowed, member-1-chunks denied, Mutate FAIL)
  - 4 service_role × 4 ops (alle PASS — separater Test-Block)
  - 1 search_knowledge_chunks-RPC-Test: member-2 ruft RPC, sieht NUR own-owner-chunks
  - 3 Schema-Tests: 2 neue Spalten + 2 Indexe + Function-Body-Check
- **AC-905-8:** Embedding-Sync-Cron `/api/cron/embedding-sync` angepasst: bei chunk-INSERT wird `owner_user_id` + `team_id` aus source-Parent (meeting/email_message/activity/document) abgeleitet. Doku in `docs/AUDIT_CRON_V811.md` Section "Klasse D (embedding-sync)". Code-Test in Vitest (Unit-Test fuer Helper-Funktion `deriveChunkOwner(sourceType, sourceId)`).
- **AC-905-9:** EXPLAIN ANALYZE 3 Queries (siehe `qa/SLC-905-perf-baseline.md`):
  - `SELECT * FROM knowledge_chunks WHERE owner_user_id = $1 ORDER BY embedding <=> $2 LIMIT 10` (HNSW + Owner-Filter)
  - `SELECT search_knowledge_chunks($embedding, 0.7, 10)` mit User-Session (RPC mit Owner-Filter)
  - Backfill-Verifikations-Query
  DEC-266-Threshold. HNSW-Index muss erhalten bleiben.
- **AC-905-10:** Live-Smoke 3 Pfade auf business.strategaizetransition.com PASS:
  - admin: KI-Workspace-Frage "wie haben wir Vertragsbedingungen behandelt" → Antwort enthaelt Chunks aus admin-eigenen + via Admin-Bypass auch member-Chunks
  - teamlead: KI-Workspace-Frage → Antwort enthaelt nur team-eigene Chunks
  - member-2: KI-Workspace-Frage → Antwort enthaelt nur member-2-eigene Chunks (member-1-Inhalte unsichtbar)
- **AC-905-11:** Records-Sync: SLC-905 done, BL-500-905 done, **BL-500 done**, FEAT-911 status → done, V8.11 → ready fuer Gesamt-/qa, STATE.md Focus → "V8.11 Gesamt-/qa + /final-check + /go-live", MIGRATIONS.md MIG-049, RPT-593 (Code-Side) + RPT-594 (Live-Smoke) + RPT-595 (Gesamt-V8.11 Done-Gate-Report).
- **AC-905-12:** **Done-Gate erreicht** Q-V8.11-B 100% Coverage: `list_tables_with_authenticated_full_access()` returns **0 Rows**. BS ist multi-tenant-tauglich. Pre-Customer-Live-Gate vom RLS-Sweep-Side erfuellt.

## Micro-Tasks

### MT-1: Pre-Check Schema-Verify (documents.created_by + knowledge_chunks Pre-Apply) + Orphan-Estimate
- **Goal:** Verifizieren `documents.created_by` ist owner-Spalte. Pre-Apply: `SELECT COUNT(*) FROM knowledge_chunks` und Verteilung pro `source_type`.
- **Files:** `qa/SLC-905-perf-baseline.md` (neu).
- **Expected behavior:**
  ```sql
  -- documents-owner-Pfad verify
  SELECT created_by, COUNT(*) FROM documents GROUP BY created_by ORDER BY 2 DESC LIMIT 10;
  -- knowledge_chunks Verteilung
  SELECT source_type, COUNT(*) FROM knowledge_chunks GROUP BY source_type;
  -- Pre-Apply Pre-V8.11-Baseline 3 Queries
  ```
- **Verification:** Dokumentation. Wenn documents-Pfad alternativ via Parent-deal/contact noetig: in MT-2 Backfill-SQL anpassen.
- **Dependencies:** SLC-904 done

### MT-2: MIG-049 Migration-Datei (Phase 1+2+3+4) + Orphan-Report
- **Goal:** Idempotente Migration mit allen 4 Phasen + WARNING-Block fuer Orphan-Count.
- **Files:** `sql/migrations/049_v8_11_slc_905_klasse_d_knowledge_chunks.sql`, `qa/SLC-905-orphan-report.md` (neu, generiert von MT-3).
- **Expected behavior:** Migration enthaelt alle 4 Phasen-SQL aus diesem Spec-Body. Helper-Existenz-Guard. Re-Apply idempotent.
- **Verification:** Re-Apply ohne Fehler. Schema-Verify: 2 neue Spalten + 2 Indexe. Function-Body enthaelt `can_see_owner`-Filter.
- **Dependencies:** MT-1

### MT-3: Backfill-Verifikation + Orphan-Report
- **Goal:** Post-Apply: Orphan-Count zaehlen + dokumentieren.
- **Files:** `qa/SLC-905-orphan-report.md`
- **Expected behavior:** SQL-Auswertung pro source_type wie viele Chunks ohne owner_user_id sind. Bei >0: Liste Sample-IDs + source_type + Begruendung (parent geloescht / parent-source nicht im Backfill abgedeckt).
- **Verification:** Report existiert mit Konkretzahlen. Bei orphan-count >100 → eskaliert zu DEC-Update + V9-Cleanup-Cron geplant.
- **Dependencies:** MT-2

### MT-4: Vitest RLS-Matrix-File + search_knowledge_chunks-RPC-Test + Schema-Test
- **Goal:** Test-File mit ~20 Tests (analog SLC-904 + RPC-Test + Schema-Test).
- **Files:** `cockpit/__tests__/rls/v8-11-slc-905-rls-matrix.test.ts`
- **Expected behavior:**
  - 16 Tests Rollen × Ops (siehe AC-905-7)
  - 1 RPC-Test: User-Session ruft `search_knowledge_chunks` → kein cross-owner-leak
  - 3 Schema-Tests: 2 Spalten + 2 Indexe + Function-Body enthaelt `can_see_owner`
  - Seed-Pflicht: pro source_type 2 Chunks (1 owned-by-TEST_MEMBER_1 + 1 owned-by-TEST_MEMBER_2). Falls Seed-Script noch nicht knowledge_chunks-Fixtures hat: in MT-4 erweitern.
- **Verification:** Vitest GREEN 20/20 im Sidecar.
- **Dependencies:** MT-2

### MT-5: Embedding-Sync-Cron Code-Anpassung + Unit-Test deriveChunkOwner
- **Goal:** `/api/cron/embedding-sync/route.ts` anpassen: chunk-INSERT bekommt owner_user_id + team_id aus source-Parent. Helper-Funktion `deriveChunkOwner` extrahieren + Unit-Tests.
- **Files:**
  - `cockpit/src/app/api/cron/embedding-sync/route.ts` (anpassen)
  - `cockpit/src/lib/rag/derive-chunk-owner.ts` (neu, Pure-Function)
  - `cockpit/src/lib/rag/derive-chunk-owner.test.ts` (neu, Vitest)
- **Expected behavior:**
  - `deriveChunkOwner(supabase, sourceType, sourceId)` returnt `{ owner_user_id, team_id }` per Lookup auf Parent
  - Cron-Loop ruft Helper vor jedem chunk-INSERT
  - Unit-Test: 4 source_types (meeting/email_message/activity/document) liefern owner_user_id, leeres-Parent → throw oder default
- **Verification:** Vitest GREEN. Cron-Code-Review.
- **Dependencies:** MT-2

### MT-6: Post-MIG-049 EXPLAIN ANALYZE Re-Run + Done-Gate-Final
- **Goal:** 3 Queries re-messen. Done-Gate-Final 0 Rows.
- **Files:** `qa/SLC-905-perf-baseline.md` (Erweiterung Post-V8.11).
- **Expected behavior:** 3 Post-Werte ohne Threshold-Violation. **Done-Gate-SQL: `SELECT COUNT(*) FROM list_tables_with_authenticated_full_access()` = 0**.
- **Verification:** Done-Gate = 0 → Q-V8.11-B erfuellt.
- **Dependencies:** MT-2..MT-5

### MT-7: Records-Sync (final) + Live-Smoke + RPT-593/594/595 + V8.11-Workflow-Ready-Marker
- **Goal:** Records auf "V8.11 Code-Side komplett, bereit fuer Gesamt-/qa" aktualisieren.
- **Files:**
  - `slices/INDEX.md` (SLC-905 → done + V8.11-Section Status-Hinweis)
  - `planning/backlog.json` (BL-500-905 → done, BL-500 → done)
  - `features/FEAT-911-v811-rls-sweep.md` (status: done)
  - `docs/STATE.md` (Current Focus → "V8.11 Gesamt-/qa")
  - `docs/MIGRATIONS.md` (MIG-049 Eintrag)
  - `reports/RPT-593.md` (SLC-905 Code-Side)
  - `reports/RPT-594.md` (SLC-905 Live-Smoke)
  - `reports/RPT-595.md` (V8.11 Done-Gate-Report mit Helper-Function-Call-Output = 0)
- **Expected behavior:** Records updated per IMP-950 Defense. **Workflow-Closure NOCH NICHT** — V8.11 ist Code-Side komplett, aber roadmap V8.11 status bleibt `active` bis /go-live PASS. Memory-File explizit nennt "V8.11 Code-Side komplett post-/qa Sub-Slice".
- **Verification:** Records updated. Live-Smoke 3/3 PASS-LIVE. RPT-595 mit Helper-Function-Output dokumentiert.
- **Dependencies:** alle vorherigen MTs

## Pre-Conditions

- SLC-904 done (audit_log RLS aktiv, Helper-Function shows 1 Row vor SLC-905)
- knowledge_chunks-Seed-Daten existieren (mind. 2 chunks pro source_type fuer Multi-Owner-Tests)
- documents-Tabelle hat `created_by`-Spalte populiert (V8.10/SLC-893 erzwingt)

## Pattern-Reuse

- Migration-Pattern aus SLC-901..904
- Test-Pattern aus SLC-901..904 + Erweiterung um RPC-Test + Schema-Test
- ALTER+Backfill-Pattern aus V7-MIG-035 (V7 hatte aehnlichen owner_user_id-Backfill)
- Pure-Function `deriveChunkOwner` analog `buildDocumentStoragePath` aus V8.10/SLC-893 (Vitest-pflicht Pure-Function-Lib-Pattern)

## Risks / Assumptions

- **R-905-1 (High):** Backfill orphan-count hoch (>100 chunks). Wenn Parent-Source geloescht ist, bleibt chunk owner-less. Mitigation: MT-3 Orphan-Report + V9-Cleanup-Cron-Plan. Bei orphan-count >1000: V8.11-Block + DEC-Update + separate Cleanup-Slice.
- **R-905-2 (Medium):** HNSW-Index-Performance bei zusaetzlichem Owner-Filter koennte unter Threshold rutschen. Mitigation: EXPLAIN ANALYZE. HNSW-Filter geht durch sequential nach Vector-Sort — wenn langsam, ergaenze Composite-Index `(owner_user_id, embedding)` (partial-Index).
- **R-905-3 (Medium):** `search_knowledge_chunks`-RPC ist von Production-Code aufgerufen. Function-Body-Aenderung muss kompatibel sein (gleicher Return-Type, gleiche Parameter). Mitigation: CREATE OR REPLACE statt DROP+CREATE.
- **R-905-4 (Low):** Embedding-Sync-Cron ist seit V4.2 stabil. Aenderung an chunk-INSERT-Pfad fuegt 1 SELECT auf Parent ein (Latenz +ms). Mitigation: Helper cached per Loop-Iteration falls Parent gleicher.
- **A-905-1:** `documents.created_by` ist owner-Spalte. Falls nicht (MT-1 entdeckt JOIN-Pfad noetig): Backfill-SQL anpassen.
- **A-905-2:** Aktueller Stand <10k chunks (DEC-267 begruendet SYNC-Backfill). Falls Live-DB ueberraschend >50k chunks hat: Migration-Apply-Dauer >30s → vertretbar, dokumentieren.

## Out of Scope

- V9-Async-Backfill-Cron (kommt erst bei >100k chunks-Volumen)
- V9-Orphan-Cleanup-Cron (separater V9-Slice)
- SEC-007 Function-Hardening (search_knowledge_chunks ueber Vector-Pfad — V8.11 schliesst Owner-Filter, separate SQL-Injection-Defense ist V8.12)
- Multi-Tenant-V9 team_id-Filter im Function-Body

## Related

- `docs/ARCHITECTURE.md` V8.11-Addendum Klasse D + search_knowledge_chunks-Erweiterung
- `docs/DECISIONS.md` DEC-273, DEC-267, DEC-269, DEC-266
- `cockpit/src/app/api/cron/embedding-sync/route.ts` (Source-of-Truth Embedding-Sync)
- Pattern-Quelle Migration: SLC-901..904 + V7-MIG-035
- Rule: `.claude/rules/rag-embedding-pattern.md` (Standard-RAG-Architektur)

## Next Step (post-SLC-905)

- Gesamt-/qa V8.11 (alle 5 Slices als Einheit): Vitest 605+ Tests / Live-DB-Smoke / 5 Live-Smoke-Pfade aggregiert / EXPLAIN ANALYZE-Reports aggregiert / Helper-Function-Done-Gate = 0
- /final-check (Vulns, Dependencies, Build, ESLint)
- /go-live (REL-046)
- /deploy (Coolify-Redeploy)
- /post-launch T+3h Light + T+24h Full-Check
