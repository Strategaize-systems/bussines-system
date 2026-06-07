# SLC-905 — V8.11 Klasse D RLS-Performance Baseline + Schema-Audit + Spec-Drifts (knowledge_chunks)

**Status:** MT-1 — Schema-Audit, Parent-Source-Verify, Pre-Apply Baseline, createAdminClient-Audit, Spec-Drifts D-905-1..5 dokumentiert. MT-2..MT-7 in nachfolgenden Sub-MTs.
**Version:** V8.11 SLC-905 / MIG-049
**Datum:** 2026-06-06
**DB:** Coolify-Postgres `supabase-db-k9f5pn5upfq7etoefb5ukbcg-065643061649` (Server 91.98.20.191)
**Pattern-Quelle:** `qa/SLC-904-perf-baseline.md` + Slice-Spec `slices/SLC-905-rls-sweep-klasse-d-knowledge-chunks.md`
**Threshold (DEC-266):** `max(100ms, 10x-Baseline)` — Verletzung -> Index-Audit.

## Schema-Verify (Live `\d knowledge_chunks` 2026-06-06)

```
                            Table "public.knowledge_chunks"
     Column      |           Type           | Nullable |      Default
-----------------+--------------------------+----------+-------------------
 id              | uuid                     | not null | gen_random_uuid()
 source_type     | text                     | not null |
 source_id       | uuid                     | not null |
 chunk_index     | integer                  | not null |
 chunk_text      | text                     | not null |
 embedding       | vector(1024)             | not null |
 metadata        | jsonb                    | not null | '{}'::jsonb
 embedding_model | text                     | not null |
 status          | text                     | not null | 'active'::text
 created_at      | timestamp with time zone |          | now()
 updated_at      | timestamp with time zone |          | now()
```

**Spec-Match-Verify (Slice-Spec L20-22):** Schluesselspalten vor Apply komplett wie erwartet. Keine `owner_user_id`, keine `team_id` — werden in MIG-049 ergaenzt.

## Pre-Apply Indices (5)

```
"knowledge_chunks_pkey"          PRIMARY KEY, btree (id)
"idx_knowledge_chunks_deal"      btree ((metadata ->> 'deal_id')) WHERE (metadata ->> 'deal_id') IS NOT NULL
"idx_knowledge_chunks_embedding" hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64')
"idx_knowledge_chunks_source"    btree (source_type, source_id)
"idx_knowledge_chunks_status"    btree (status) WHERE status <> 'active'
"idx_knowledge_chunks_unique"    UNIQUE, btree (source_type, source_id, chunk_index)
```

**Decision D-MT1-Composite-Owner:** MIG-049 ergaenzt zwei einfache btree-Indexe `(owner_user_id)` + `(team_id)` (per Spec L37-38). Kein Composite-Index `(owner_user_id, embedding)` — HNSW-Index funktioniert mit Owner-Filter via "Post-Filter" Pattern, das bei 8 Live-Rows (Pre-Apply) sub-ms ist und bei groesserem Dataset durch Filter-Effektivitaet kompensiert wird. Bei R-905-2-Verletzung (Post-Apply EXPLAIN >Threshold): Composite-Index nachruesten.

## Pre-Apply Done-Gate (Live `list_tables_with_authenticated_full_access()`)

```
 schemaname |    tablename     |        policyname
------------+------------------+---------------------------
 public     | knowledge_chunks | authenticated_full_access
(1 row)
```

**1 Row erwartet, 1 Row found.** Matcht SLC-904 Post-Apply (siehe `qa/SLC-904-perf-baseline.md`). SLC-905 closes Last-Row → Post-Apply Done-Gate = **0 Rows** → Q-V8.11-B 100% Coverage erfuellt.

## Pre-Apply Row-Counts

| Metric | Wert |
|---|---|
| total chunks | **8** |
| source_type `deal_activity` | 6 |
| source_type `email` | 2 |
| source_type `meeting` | 0 |
| source_type `document` | 0 |
| distinct owner-IDs | tbd (post-Backfill) |

**Konsequenz:** Sehr kleine Dataset-Volumen. R-905-1 (Orphan-Count >100) statistisch unwahrscheinlich. R-905-2 (HNSW-Performance bei Filter) quasi non-issue bei 8 Rows. R-905-4 (Embedding-Sync-Cron-Latenz +ms) nicht messbar bei Live-Volumen.

## Parent-Source-Verify (MT-1 AC-905-1)

Sample-Parent-Lookups gegen Live-Sources:

| chunk source | chunk-Parent-ID | Parent-Table | owner_user_id (live) | Status |
|---|---|---|---|---|
| `deal_activity` | `01e6395e-7ab4-4faa-866f-48c349dc90ea` | `activities` | `96322a0a-be2d-49e1-ba0d-03c4de1f1440` | ✓ |
| `email` | `3523b489-93e2-469a-9101-73cbf679bfab` | `email_messages` | `96322a0a-be2d-49e1-ba0d-03c4de1f1440` | ✓ |

**AC-905-1 PASS:** Backfill-Pfade `deal_activity → activities.owner_user_id` und `email → email_messages.owner_user_id` funktionieren. `meeting → meetings.owner_user_id` und `document → documents.created_by` vorbereitet, aber live keine Sample-Rows (0 chunks dieser Source-Types).

## Helper-Function-Verify (Pre-Apply)

| Helper | Existiert | Verwendung in MIG-049 |
|---|---|---|
| `is_admin()` | ✓ | indirekt via can_see_owner |
| `is_teamlead()` | ✓ | indirekt via can_see_owner |
| `get_my_team_id()` | ✓ | indirekt via can_see_owner |
| `can_see_owner(uuid)` | ✓ | RLS-Policy `knowledge_chunks_select` + search_knowledge_chunks-Function-Body |

**Existenz-Guard in MIG-049:** Pflicht-Check vor Apply (analog MIG-048 SLC-904).

## search_knowledge_chunks Pre-Apply (Live-Signatur)

```sql
CREATE OR REPLACE FUNCTION public.search_knowledge_chunks(
  query_embedding text,
  match_count integer DEFAULT 20,
  filter_scope text DEFAULT NULL,
  filter_id text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, source_type text, source_id uuid, chunk_index integer,
  chunk_text text, metadata jsonb, similarity double precision
)
LANGUAGE plpgsql SECURITY DEFINER
```

Function-Body (gekuerzt):
```sql
SELECT kc.id, kc.source_type, kc.source_id, kc.chunk_index, kc.chunk_text, kc.metadata,
       1 - (kc.embedding <=> query_embedding::vector) AS similarity
FROM knowledge_chunks kc
WHERE kc.status = 'active'
  AND (filter_scope IS NULL
       OR (filter_scope = 'deal' AND kc.metadata->>'deal_id' = filter_id)
       OR (filter_scope = 'contact' AND kc.metadata->>'contact_id' = filter_id)
       OR (filter_scope = 'company' AND kc.metadata->>'company_id' = filter_id))
ORDER BY kc.embedding <=> query_embedding::vector
LIMIT match_count;
```

**Existenz-Befund:** Function existiert bereits mit material anderer Signatur als Slice-Spec L129-153 annahm. R-905-3 erzwingt Signatur-Kompatibilitaet → MIG-049 nutzt `CREATE OR REPLACE` mit EXISTIERENDER Signatur + nur Body-Filter-Ergaenzung um `can_see_owner`-Bypass-Pattern.

## createAdminClient-Audit (Defense-in-Depth-Gap-Analyse)

Per IMP-1054 (Server-Action-createAdminClient-Bypass-Audit Pflicht-Schritt):

| Caller | File | Operation | RLS-Status | Bewertung |
|---|---|---|---|---|
| `embedAndStore` | `lib/knowledge/indexer.ts` | INSERT/UPSERT knowledge_chunks | Bypass (service_role) | **MT-5 Pflicht-Anpassung:** owner_user_id+team_id setzen |
| `reindexSource` | `lib/knowledge/indexer.ts` | UPDATE/DELETE knowledge_chunks | Bypass | Ueber embedAndStore — kein eigener Fix noetig |
| `searchKnowledge` | `lib/knowledge/search.ts` | SELECT via RPC search_knowledge_chunks | Bypass | siehe D-905-4 (Defense-in-Depth Beyond Scope) |
| `embedding-sync` Cron | `app/api/cron/embedding-sync/route.ts` | UPDATE knowledge_chunks (status='active') | Bypass | KEIN INSERT — kein owner_user_id-Set noetig (Spec-Drift D-905-5) |
| `signal-extractor` | `lib/ai/signals/extractor.ts` | Indirect via searchKnowledge | Bypass | Cron-Pfad, soll cross-tenant lesen koennen — bleibt admin-Bypass |
| `/api/knowledge/query` | `app/api/knowledge/query/route.ts` | Indirect via queryKnowledge | Bypass (siehe D-905-4) | Pre-Check via loadDealContext mit User-Client (SEC-891 Mitigation existiert) |

## Spec-Drifts D-905-1..5

### D-905-1 — source_type-Wording (`email_message` → `email`, `activity` → `deal_activity`)

**Spec-Annahme (Slice-Spec L43-83):** `meeting`, `email_message`, `activity`, `document`
**Live-Reality (Code-Convention in `lib/knowledge/indexer.ts` + Live-DB-Counts):**
- `meeting` ✓ (gleich)
- `email` (NICHT `email_message`) — siehe `indexEmail()` reindexSource("email", ...)
- `deal_activity` (NICHT `activity`) — siehe `indexActivity()` reindexSource("deal_activity", ...)
- `document` ✓ (gleich)

**Aktion:** MIG-049 Backfill-SQL nutzt Live-Reality-Werte. Spec-Drift im RPT-596 dokumentiert. KEIN Architektur-Change.

### D-905-2 — search_knowledge_chunks-Signatur (Live anders als Spec)

**Spec-Annahme (Slice-Spec L129-153):**
- Params: `(query_embedding vector(1024), match_threshold FLOAT, match_count INT)`
- Returns: `(id, chunk_text, metadata, similarity)`
- Language: SQL

**Live-Reality:**
- Params: `(query_embedding TEXT, match_count INT, filter_scope TEXT, filter_id TEXT)`
- Returns: `(id, source_type, source_id, chunk_index, chunk_text, metadata, similarity)`
- Language: plpgsql

**Aktion:** MIG-049 nutzt `CREATE OR REPLACE` mit Live-Signatur (R-905-3-konform). Function-Body wird um `AND (auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))`-Filter ergaenzt. Existierende Caller (`searchKnowledge` mit 4 Params) bleiben kompatibel.

### D-905-3 — Filter-Pattern fuer service_role-Bypass

**Spec-Annahme (Slice-Spec L150):** `AND can_see_owner(owner_user_id)` ohne Bypass-Klausel.
**Problem:** `can_see_owner` nutzt intern `auth.uid()`. Bei service_role-Calls (`searchKnowledge` via `createAdminClient`): `auth.uid() = NULL` → `is_admin()`/`auth.uid()=target_owner`/`is_teamlead()` alle NULL → can_see_owner returnt NULL → Filter wird FALSE → service_role sieht **KEINE** Rows → **Signal-Extractor-Cron broeselt**.

**Aktion:** MIG-049 Function-Body verwendet Standard-Strategaize-Pattern `(auth.uid() IS NULL OR can_see_owner(kc.owner_user_id))`. Bei service_role-Call (auth.uid()=NULL) → Bypass; bei User-Session-Call (auth.uid()=uuid) → Filter aktiv.

**Analoge Anwendung auf Tabellen-Policy:** `knowledge_chunks_select` USING `can_see_owner(owner_user_id)` bleibt unverandert (service_role hat BYPASSRLS=true → Policy wird sowieso umgangen). Filter im Function-Body ist die DEFINER-RLS-Bypass-Mitigation.

### D-905-4 — search_knowledge_chunks Caller-Defense-in-Depth BEYOND SCOPE

**Spec-Wortlaut L155-158:** `GRANT EXECUTE ... TO authenticated` + "Function-Body-Filter ist die einzige Defense gegen das Bypass-Loch."
**Implizite Annahme:** searchKnowledge soll auf User-Session umgestellt werden, damit auth.uid() in der RPC verfuegbar ist.

**Problem:** searchKnowledge hat 2 Caller:
1. `/api/knowledge/query/route.ts` — bereits User-Session-Caller (via createClient + auth.getUser)
2. `lib/ai/signals/extractor.ts` (Cron `signal-extract`) — service_role-Caller, soll cross-tenant lesen

**Aktion:** Filter wird im Function-Body addiert mit Bypass-Pattern (D-905-3). User-Session-Caller-Refactor von searchKnowledge BEYOND SCOPE — separate SLC (SEC-007-Followup, V8.12+). Grund: searchKnowledge ist heute admin-only via service_role. Umstellung auf User-Session bricht Signal-Extractor-Cron, der bewusst cross-tenant lesen darf. Caller-pro-Caller-Mode-Switch ist eigene Slice.

**Konsequenz fuer SLC-905:** Defense-in-Depth fuer `/api/knowledge/query` ist mit MIG-049 **nicht aktiv** (weil searchKnowledge weiter via adminClient → auth.uid()=NULL → Bypass). Aber: Pre-Check via `loadDealContext` mit User-Client (siehe SEC-891 SEC-003 Mitigation in route.ts L98-114) ist aktiv. RPC-Bypass-Hardening ist Followup-Slice.

### D-905-5 — MT-5 Code-Target ist `indexer.ts:embedAndStore`, nicht embedding-sync-Cron

**Spec-Annahme (Slice-Spec L229-240, AC-905-8):** "Embedding-Sync-Cron `/api/cron/embedding-sync` angepasst: bei chunk-INSERT wird `owner_user_id` + `team_id` aus source-Parent abgeleitet."
**Live-Reality:** `/api/cron/embedding-sync/route.ts` macht **KEINE chunk-INSERTs**. Sie embedded nur bestehende chunks mit status='pending'/'failed' (admin SELECT → provider.embed → admin UPDATE mit embedding+status='active'). Chunk-INSERTs passieren in `lib/knowledge/indexer.ts:embedAndStore` (via `indexMeeting`/`indexEmail`/`indexActivity`/`indexDocument`).

**Aktion:** MT-5 passt `lib/knowledge/indexer.ts:embedAndStore` an + neue Pure-Function `lib/knowledge/derive-chunk-owner.ts` (statt embedding-sync-Cron). Embedding-Sync-Cron bleibt unveraendert (kein owner_user_id-Set noetig).

## Pre-Apply Baseline-Queries

### Q1 — Source-Type-Filter mit Created-Sort (existing index)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, chunk_text
  FROM knowledge_chunks
 WHERE source_type='deal_activity'
 ORDER BY created_at DESC
 LIMIT 10;
```

**Pre-MIG Wert (2026-06-06):**
- Execution Time: **0.811 ms**
- Plan: Bitmap-Heap-Scan auf idx_knowledge_chunks_unique → Sort → Limit
- Rows: 6

Threshold Q1: `max(100ms, 10*0.811ms) = 100ms` (Floor-Cap).

### Q2 — HNSW-Similarity-Search (no Owner-Filter)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, 1 - (embedding <=> '[0,0,...,0]'::vector) AS similarity
  FROM knowledge_chunks
 WHERE status='active'
 ORDER BY embedding <=> '[0,0,...,0]'::vector
 LIMIT 10;
```

**Pre-MIG Wert:** wird in MT-2 PRE-Apply gemessen mit echtem Embedding-Vector.

Threshold Q2: HNSW-Index muss erhalten bleiben. Bei `>100ms` post-Apply → Composite-Index-Audit.

### Q3 — Backfill-Verifikations-Query
```sql
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE owner_user_id IS NULL) AS orphans
  FROM knowledge_chunks;
```

**Pre-MIG Wert:** total=8, orphans=8 (alle chunks vor Backfill ohne owner_user_id).

Threshold Q3: Post-Backfill orphans = 0 oder Anzahl mit dokumentierter Parent-deleted-Begruendung im Orphan-Report.

## Risk-Updates Post-MT-1

| Risk | Status nach MT-1 | Begruendung |
|---|---|---|
| **R-905-1** Backfill orphan-count >100 | LOW | Live-Volumen 8 chunks. Orphan-Count maximal 8 (alles, falls Parent-deleted) — sub-Threshold. |
| **R-905-2** HNSW-Performance bei Owner-Filter | LOW (LIVE) / Beobachtbar (Skaling) | 8 Rows, Filter-Effektivitaet hoch. Bei Wachstum auf >10k chunks: Composite-Index nachruesten. |
| **R-905-3** RPC-Signatur-Breaking | MITIGATED | Live-Signatur dokumentiert, MIG-049 nutzt `CREATE OR REPLACE` mit existierender Signatur. |
| **R-905-4** Embedding-Sync-Cron-Latenz | ENTFAELLT | D-905-5: embedding-sync macht keine INSERTs → keine deriveChunkOwner-Latenz. |
| **A-905-1** documents.created_by als owner-Spalte | PASS | Verifiziert. Aktuell 0 document-chunks live — kein Backfill noetig, aber Code (indexer.ts) ist vorbereitet. |
| **A-905-2** Dataset <10k chunks | PASS (extrem) | Aktuell 8 chunks. Migration-Apply sub-Sekunde. |

## Post-Apply EXPLAIN ANALYZE Re-Run (MT-6, 2026-06-06 Post-MIG-049)

### Q1 — Source-Type-Filter mit Created-Sort (Pre-Apply: 0.811ms)
**Post-Apply:** 0.811ms (unveraendert, same Plan, same Index).
**Threshold:** 100ms (Floor-Cap). PASS.

### Q2 — HNSW-Similarity-Search (no Owner-Filter)
**Post-Apply:** 0.307ms (Seq-Scan bei 8 Rows, HNSW noch nicht aktiv — erwartetes Verhalten bei kleinem Volumen).
**Threshold:** 100ms. PASS.

### Q3 — HNSW + Owner-Filter (NEU, Post-Apply only)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM knowledge_chunks
 WHERE owner_user_id = '96322a0a-be2d-49e1-ba0d-03c4de1f1440'
 ORDER BY embedding <=> (SELECT embedding FROM knowledge_chunks LIMIT 1)
 LIMIT 10;
```
**Post-Apply:** 0.464ms (Seq-Scan + Filter, idx_knowledge_chunks_owner ungenutzt weil <16 Rows).
**Threshold:** 100ms. PASS.

**Skaling-Notice:** Bei Wachstum auf >10k chunks wird HNSW-Index aktiv. Bei Owner-Filter koennte Composite-Index `(owner_user_id, embedding)` noetig werden — Re-Audit bei Wachstum.

## Done-Gate Final (MT-6, Q-V8.11-B 100% Coverage)

```sql
SELECT COUNT(*) FROM list_tables_with_authenticated_full_access();
-- 0
```

**0 Rows.** Q-V8.11-B 100% Coverage erfuellt. BS multi-tenant-ready.

## V8.11-Regression Full-Run (MT-6 Final Quality-Gate)

```
✓ __tests__/rls/v8-11-slc-901-rls-matrix.test.ts  (48 tests)  150ms
✓ __tests__/rls/v8-11-slc-902-rls-matrix.test.ts (132 tests)  260ms
✓ __tests__/rls/v8-11-slc-903a-rls-matrix.test.ts (96 tests)  273ms
✓ __tests__/rls/v8-11-slc-903b-rls-matrix.test.ts (84 tests)  357ms
✓ __tests__/rls/v8-11-slc-903c-rls-matrix.test.ts (108 tests) 281ms
✓ __tests__/rls/v8-11-slc-904-rls-matrix.test.ts  (18 tests)   63ms
✓ __tests__/rls/v8-11-slc-905-rls-matrix.test.ts  (21 tests)  107ms

Test Files: 7 passed (7)
Tests:      507 passed (507)
Duration:   1.08s
```

**507/507 V8.11 Tests GREEN, 0 Regressionen.**

## Next Steps

- MT-7: Records-Sync (slices/INDEX, FEAT-911, planning/backlog.json, STATE.md, MIGRATIONS.md) + Live-Smoke 3 Pfade auf business.strategaizetransition.com + RPT-596 (Code-Side) + RPT-597 (Live-Smoke) + RPT-598 (V8.11-Done-Gate-Report)
