# SLC-904 — V8.11 Klasse E RLS-Performance Baseline + Schema-Audit (audit_log)

**Status:** MT-1 — Schema-Audit, Index-Audit, Pre-V8.11-Baseline, createAdminClient-Audit dokumentiert. MT-2..MT-6 in nachfolgenden Sub-MTs.
**Version:** V8.11 SLC-904 / MIG-048
**Datum:** 2026-06-05
**DB:** Coolify-Postgres `supabase-db-k9f5pn5upfq7etoefb5ukbcg-065643061649` (Server 91.98.20.191)
**Pattern-Quelle:** `qa/SLC-903-perf-baseline.md` + Slice-Spec `slices/SLC-904-rls-sweep-klasse-e-audit-log.md`
**Threshold (DEC-266):** `max(100ms, 10x-Baseline)` — Verletzung -> Index-Audit.

## Schema-Verify (Live `\d audit_log` 2026-06-05 evening)

```
                                   Table "public.audit_log"
         Column         |           Type           | Nullable |      Default
------------------------+--------------------------+----------+-------------------
 id                     | uuid                     | not null | gen_random_uuid()
 actor_id               | uuid                     |          |
 action                 | text                     | not null |
 entity_type            | text                     | not null |
 entity_id              | uuid                     | not null |
 changes                | jsonb                    |          |
 context                | text                     |          |
 created_at             | timestamp with time zone |          | now()
 view_as_target_user_id | uuid                     |          |
```

**Spec-Match-Verify (Slice-Spec L24):** Schluesselspalten `actor_id, entity_type, entity_id, changes (JSONB), created_at` alle ✓ vorhanden. `view_as_target_user_id` (V7-SLC-706 Drilldown-Audit) zusaetzlich.

**actor_id ist NULLABLE** — bestaetigt Cron-/Service-Role-Pfade ohne User-Session schreiben NULL-actor (8596 Rows = 97% der Daten).

## Pre-Apply Indices (5)

```
"audit_log_pkey"        PRIMARY KEY, btree (id)
"idx_audit_log_actor"   btree (actor_id)
"idx_audit_log_created" btree (created_at DESC)
"idx_audit_log_entity"  btree (entity_type, entity_id)
"idx_audit_log_view_as" btree (view_as_target_user_id) WHERE view_as_target_user_id IS NOT NULL
```

**Index-Audit fuer AC-904-5 Queries:**

| AC-904-5 Query | Benoetigter Index | Status | Mitigation |
|---|---|---|---|
| `WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 50` | Composite `(actor_id, created_at DESC)` | **FEHLT** | MIG-048 ergaenzt `idx_audit_log_actor_created` (R-904-2 Mitigation) |
| `WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC` | Composite `(entity_type, entity_id, created_at DESC)` | partial — `idx_audit_log_entity (entity_type, entity_id)` reicht bei kleinem Pool | KEIN neuer Index — Index-Cond-Match + Sort auf 1-3 Rows ist sub-ms |

**Decision D-MT1-Composite-Actor:** MIG-048 ergaenzt `CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created ON audit_log (actor_id, created_at DESC)`. Baseline-Befund: aktuelle Q1 nutzt `idx_audit_log_created` mit `Rows Removed by Filter: 7771` — composite verhindert Filter-Overhead bei groesserem Dataset.

**Decision D-MT1-Composite-Entity:** Verzicht auf `(entity_type, entity_id, created_at DESC)`-Composite. Begruendung: existing `idx_audit_log_entity` matcht beide Where-Spalten exakt, Sort auf 1-3 returned Rows ist sub-ms (siehe Q2 Baseline 0.622ms). Bei Tabellenwachstum auf >100 Rows pro entity_type+entity_id-Kombination kann nachgeruestet werden.

## Pre-Apply Row-Counts (8850 total, 26 distinct entity_types)

| Metric | Wert |
|---|---|
| total rows | 8850 |
| distinct actor_id | 3 (+1 NULL = 4 incl. service-role) |
| distinct entity_type | 26 |
| earliest | 2026-04-11 08:26:34 UTC |
| latest | 2026-06-05 16:45:03 UTC |

**Top-5 actor_id:**

| actor_id | n | Rolle |
|---|---|---|
| NULL | 8596 | Cron/Service-Role (97%) |
| `96322a0a-be2d-49e1-ba0d-03c4de1f1440` | 202 | Founder (real user) |
| `00000000-0000-0000-0000-000000000078` | 33 | TEST_TEAMLEAD_ID |
| `00000000-0000-0000-0000-0000000ba001` | 19 | Real-Admin (V8.10 backfill) |

**Top-5 entity_type:** `ai_action_queue` 8518 / `proposal` 115 / `call` 71 / `ki_workspace` 28 / `profile` 24.

**Real-Data-Bestaetigung:** audit_log ist Live-Tabelle mit 8850 Rows, nicht nur Seed. Refactor und Migration brauchen Live-Care.

## Pre-Apply Done-Gate (via list_tables_with_authenticated_full_access)

```sql
SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
```

| schemaname | tablename | policyname |
|---|---|---|
| public | audit_log | authenticated_full_access |
| public | knowledge_chunks | authenticated_full_access |

**= 2 Rows** (per Spec AC-904-1). Post-MIG-048 Erwartung: **1 Row** (knowledge_chunks only).

## Pre-Apply Policy-Inventur (audit_log)

```sql
SELECT policyname, cmd FROM pg_policies
 WHERE schemaname='public' AND tablename='audit_log'
 ORDER BY policyname;
```

| policyname | cmd |
|---|---|
| authenticated_full_access | ALL |

= 1 Policy mit `USING (true) WITH CHECK (true)`. MIG-048 DROP + 4 neue Policies (SELECT/INSERT/UPDATE/DELETE).

## Cascade-Constraint-Audit (IMP-1064)

```sql
SELECT confrelid::regclass AS test_table, conrelid::regclass AS cascading_child, confdeltype
  FROM pg_constraint
 WHERE confrelid = 'public.audit_log'::regclass
   AND contype='f' AND confdeltype IN ('c','r');
-- (0 rows)
```

**Verdict:** audit_log ist NICHT FK-Parent fuer child-Tabellen mit CASCADE/RESTRICT. Keine downstream-Probleme bei DELETE-Tests.

**FK-OUT:** `view_as_target_user_id` → `profiles(id) ON DELETE SET NULL` — uni-direktional, kein Test-Setup-Risk.

## Baseline-Queries Pre-MIG-048 (postgres BYPASSRLS)

### Q1 — actor-Lookup mit ORDER BY created_at DESC LIMIT 50

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log
 WHERE actor_id = '96322a0a-be2d-49e1-ba0d-03c4de1f1440'
 ORDER BY created_at DESC
 LIMIT 50;
```

- Plan: `Limit -> Index Scan using idx_audit_log_created on audit_log Filter: actor_id = $1`
- `Rows Removed by Filter: 7771` — Index Scan auf created_at, filtert dann actor_id
- Buffers: shared hit=625 read=34
- Planning Time: 0.590 ms
- **Execution Time: 11.016 ms** (vor composite-Index)

### Q2 — entity-Lookup mit ORDER BY created_at DESC

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log
 WHERE entity_type = 'proposal'
   AND entity_id = (SELECT id FROM proposals LIMIT 1)
 ORDER BY created_at DESC;
```

- Plan: `Sort (created_at DESC) -> Index Scan using idx_audit_log_entity Index Cond: (entity_type='proposal' AND entity_id=$0)`
- rows=1 (Sort trivial bei 1 Row)
- Buffers: shared hit=6 read=1
- Planning Time: 0.297 ms
- **Execution Time: 0.622 ms** (bereits optimal)

## Baseline-Tabelle (Pre-V8.11)

| ID | Query | Exec ms | Threshold (DEC-266) | Verdict-Pre |
|---|---|---|---|---|
| Q1 | `actor=$1 ORDER BY created_at DESC LIMIT 50` | **11.016** | max(100, 110.16) = 110.16ms | sub-Threshold aber suboptimaler Plan (Filter 7771 rows) |
| Q2 | `entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC` | **0.622** | max(100, 6.22) = 100ms | optimal |

**MT-1 Pre-Baseline-Verdict:** Q1 11.016ms ist unter 100ms-Threshold (knapp), aber Plan ist suboptimal — composite Index in MIG-048 erwartet ~0.5-2ms.

## createAdminClient-Audit (IMP-1054 + Slice-Spec MT-4)

`grep "from('audit_log')" cockpit/src/` zeigt **49 Call-Sites** ueber 36 Files. Klassifizierung nach Client-Typ:

### Direct ADMIN Inserts (5 Files, **OK** — nach MIG-048 weiterhin funktional)

| File | Pfad-Typ | Verdict |
|---|---|---|
| `lib/automation/sculptor.ts` | Worker (admin) | OK |
| `lib/ai/followup-engine.ts` | Cron (admin) | OK |
| `app/actions/consent.ts` | Action (admin) | OK |
| `app/actions/meetings.ts` (2×) | Action (admin, no try/catch) | OK |
| `app/api/cron/click-log-cleanup/route.ts` | Cron (admin) | OK |
| `app/api/cron/recording-retention/route.ts` (2×) | Cron (admin) | OK |
| `app/api/cron/meeting-transcript/route.ts` | Cron (admin) | OK |
| `app/api/cron/meeting-summary/route.ts` | Cron (admin) | OK |
| `app/api/cron/meeting-reminders/route.ts` | Cron (admin) | OK |
| `app/api/cron/meeting-recording-poll/route.ts` | Cron (admin) | OK |
| `app/api/cron/meeting-briefing/route.ts` (3×) | Cron (admin) | OK |
| `app/api/cron/call-processing/route.ts` | Cron (admin) | OK |
| `app/api/cron/signal-extract/route.ts` | Cron (admin) | OK |
| `app/api/meetings/[id]/retry-transcript/route.ts` | API (admin) | OK |
| `app/api/meetings/[id]/retry-summary/route.ts` | API (admin) | OK |
| `app/api/meetings/[id]/generate-agenda/route.ts` | API (admin) | OK |
| `app/api/leads/intake/route.ts` | API (admin) | OK |
| `lib/team/actions.ts` (3×) | Action (admin) | OK |
| `lib/auth/read-only-context.ts` | Auth-Layer (admin) | OK |
| `lib/automation/dry-run.ts` | Worker (admin) | OK |
| `lib/automation/nl-history.ts` | Worker (admin) | OK |
| `lib/automation/actions/update_field.ts` | Worker (admin) | OK |
| `lib/automation/assignee-resolver.ts` | Worker (admin) | OK |
| `app/(app)/proposals/actions.ts` line 1566 | Action (admin, batched) | OK |
| `app/(app)/audit-log/actions.ts` (2× SELECT) | Action (RLS-Read-Pfad) | OK — `is_admin() OR actor_id=auth.uid()` |
| `app/(app)/mein-tag/actions.ts` line 754 | SELECT — RLS-Read-Pfad | OK |

### Direct USER-SESSION Inserts (**FIX-NEEDED** — werden nach MIG-048 mit RLS-Violation versagen)

| File | Lines | Try/Catch? | Impact | Sub-MT-Refactor |
|---|---|---|---|---|
| `lib/audit.ts` (logAudit) | 65 | YES (swallow) | silent — alle 31 transitive Caller fail-silent | **MT-4a zentral** |
| `lib/audit.ts` (logAuditWithId) | 102 | YES (swallow) | silent — Workflow-Dispatcher Anti-Loop-Token-Fallback aktiviert | **MT-4a zentral** |
| `lib/team/view-as-audit.ts` (logViewAs) | 32 | partial (warn-log) | silent — Drilldown weiterhin OK, Audit-Trail-Loss | **MT-4b — Caller updated** |
| `lib/ki-workspace/reports/_shared.ts` | 84 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `lib/custom-reports/actions/save.ts` | 91 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `lib/custom-reports/actions/rename.ts` | 94 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `lib/custom-reports/actions/run.ts` | 117 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `lib/custom-reports/actions/delete.ts` | 80 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `app/(app)/proposals/actions.ts` | 319, 1210 | partial (best-effort void) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `app/(app)/proposals/actions.ts` | 1322, 1449 | **NEIN** (await direct) | **UI-BREAK** — RLS-Violation Exception | **MT-4b refactor to admin (CRITICAL)** |
| `app/(app)/pipeline/actions.ts` | 1079 (insertAudit-callback) | **NEIN** (hot-path) | **UI-BREAK** — RLS-Violation Exception | **MT-4b refactor to admin (CRITICAL)** |
| `app/(app)/settings/compliance/customer-dse/actions.ts` | 87, 140 | **NEIN** (await direct) | **UI-BREAK** — RLS-Violation Exception | **MT-4b refactor to admin (CRITICAL)** |
| `app/(app)/mein-tag/actions/apply-nl-rule.ts` | 166 | YES (swallow) | silent — Audit-Trail-Loss | **MT-4b refactor to admin** |
| `lib/automation/actions/auto_winloss_extract.ts` | 215 | YES (swallow) | parameter-passed `context.supabase` — depends on call-context | **MT-4b — Caller-side fix** |

### Transitive via logAudit / logAuditWithId (31 Caller, fail-silent durch audit.ts try/catch)

- `app/(app)/pipeline/actions.ts`: 9× logAudit + 3× logAuditWithId = 12 Calls
- `app/(app)/proposals/actions.ts`: 8× logAudit
- `app/(app)/settings/automation/actions.ts`: 5× logAudit
- `app/(app)/settings/campaigns/actions.ts`: 4× logAudit
- `app/(app)/settings/payment-terms/actions.ts`: 4× logAudit
- `lib/actions/activity-actions.ts`: 1× logAuditWithId

**= 33 transitive Audit-Trail-Eintraege gehen verloren** wenn audit.ts NICHT zentral refactored wird. **MT-4a Pflicht.**

## Critical-Path-Findings (UI-BREAK ohne Fix)

5 Sites OHNE try/catch — RLS-Violation propagiert als Exception → User-Action bricht:

1. `proposals/actions.ts` line 1322 (Send-Proposal-Action)
2. `proposals/actions.ts` line 1449 (Decline-Proposal-Action)
3. `pipeline/actions.ts` line 1079 (Hot-Path Stage-Change-Callback)
4. `customer-dse/actions.ts` line 87 (DSGVO-Request-Submit)
5. `customer-dse/actions.ts` line 140 (DSGVO-Request-Resolve)

**Diese 5 Sites sind MT-4b CRITICAL-Refactor-Targets.**

## R-904-1 Eskalation (Medium → High)

Spec L145: "Bestehende Audit-Caller schreiben via createServerClient() (User-Session). Nach Apply schlaegt das mit RLS-Violation fehl. Schwellwert: bei >3 Caller-Fixes wird das eigenes Slice SLC-904-fix."

**Real-Audit-Befund 2026-06-05:** 11 direkte User-Session-Sites + 33 transitive = 44 Audit-Trail-Verluste, davon 5 UI-Breaks. Schwellwert >>3 deutlich uebertreten.

**Founder-Decision 2026-06-05 (via AskUserQuestion):** Option A — Spec wie geschrieben (MIG-048 INSERT WITH CHECK false) + In-Slice-Refactor (audit.ts zentral + 11 direct sites zu admin).

**Slice-Aufwand revidiert:** ~5-7h statt ~2-3h.

## Verifizierung (MT-1 Done-Marker)

- [x] Schema-Verify: 9 Spalten dokumentiert + 5 Indices + 1 FK-OUT
- [x] Pre-Apply Row-Counts (8850 Rows, 3 distinct actor + NULL, 26 entity_types)
- [x] Cascade-Constraint-Audit (IMP-1064): 0 child-Tabellen → DELETE-Tests sicher
- [x] Index-Audit fuer AC-904-5 Queries: 1 fehlend (composite actor+created), 1 vorhanden (entity)
- [x] Pre-Apply Done-Gate Helper-Function: **2 Rows** (audit_log + knowledge_chunks)
- [x] Pre-Apply Policy-Inventur: 1 Row (`authenticated_full_access`)
- [x] 2 Baseline-Queries gemessen (Q1 11.016ms suboptimal, Q2 0.622ms optimal)
- [x] createAdminClient-Audit (IMP-1054 + Slice-MT-4 Pflicht):
  - 36 OK-ADMIN Files
  - 11 FIX-NEEDED USER-SESSION direct-Sites
  - 33 transitive via audit.ts (fixed by MT-4a)
  - 5 CRITICAL UI-Break-Sites
- [x] R-904-1 eskaliert auf High
- [x] Founder-Decision Option A bestaetigt

**AC-904-1 (Pre-Apply) + AC-904-5 (Pre-Baseline) + AC-904-8 (Done-Gate Pre=2) MT-1 PASS.**

## Post-MIG-048 EXPLAIN Re-Run (MT-5, 2026-06-06)

Re-Run der 2 AC-904-5-Queries nach MIG-048 LIVE-Apply (postgres BYPASSRLS, identisch zur Baseline).

### Q1 Post — actor-Lookup mit composite Index `idx_audit_log_actor_created`

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log
 WHERE actor_id = '96322a0a-be2d-49e1-ba0d-03c4de1f1440'
 ORDER BY created_at DESC
 LIMIT 50;
```

- Plan: `Limit -> Index Scan using idx_audit_log_actor_created on audit_log Index Cond: actor_id = $1`
- Plan-Hash CHANGED — Planner waehlt nun composite Index, `Rows Removed by Filter` entfaellt
- Buffers: shared hit=28 (Pre 625+34 = 659; **96% Reduktion**)
- Planning Time: 1.512 ms
- **Execution Time: 0.407 ms** (Pre: 11.016ms → **27x SCHNELLER**)

### Q2 Post — entity-Lookup

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log
 WHERE entity_type = 'proposal'
   AND entity_id = (SELECT id FROM proposals LIMIT 1)
 ORDER BY created_at DESC;
```

- Plan: `Sort (created_at DESC) -> Index Scan using idx_audit_log_entity Index Cond: (entity_type='proposal' AND entity_id=$0)` (Plan-Hash unchanged)
- rows=1 (Sort trivial)
- Buffers: shared hit=7 (Pre 6+1=7, unchanged)
- Planning Time: 0.548 ms
- **Execution Time: 0.193 ms** (Pre: 0.622ms → **3.2x SCHNELLER**, Cache-Warm-Effekt)

## Threshold-Verdict (DEC-266 max(100ms, 10x))

| ID | Query | Pre Exec ms | Post Exec ms | Faktor | Threshold | Verdict |
|---|---|---|---|---|---|---|
| Q1 | `actor=$1 ORDER BY created_at DESC LIMIT 50` | 11.016 | **0.407** | 0.04x | 100ms | **PASS** (96% schneller) |
| Q2 | `entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC` | 0.622 | **0.193** | 0.31x | 100ms | **PASS** (69% schneller) |

**Beide Queries laufen post-MIG schneller** (composite Index-Effekt fuer Q1, Cache-Warm-Effekt fuer Q2). Plan-Hash-Wechsel bei Q1 (Statistik-Update nach +1 Index + 4 Policies) ist erwuenscht.

## RLS-Overhead-Check (authenticated)

Verifikation dass Klasse-E-Policies als authenticated-User akzeptablen Overhead haben:

### Pattern 1 — TEST_MEMBER_1 actor-Lookup (DSGVO-Art-15 Self-Service)

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-000000000081","role":"authenticated"}';
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log WHERE actor_id = '00000000-0000-0000-0000-000000000081'
 ORDER BY created_at DESC LIMIT 50;
ROLLBACK;
```

- Plan: `Limit -> Index Scan using idx_audit_log_actor_created Filter: is_admin() OR actor_id = $sub`
- rows=0 (TEST_MEMBER_1 hat keine echten audit_log-Rows ausserhalb der V8.10-Backfill)
- Buffers: shared hit=11
- Planning Time: 0.782 ms
- **Execution Time: 0.071 ms** (vs postgres 0.407ms = ~0.17x **SCHNELLER** dank Index-Cond + leerer Result-Set)
- Verdict: **PASS** sub-Millisekunden. DSGVO-Self-Service-Pfad ist sehr effizient.

### Pattern 2 — Real-Admin SELECT all (Forensik-Pfad)

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-0000000ba001","role":"authenticated"}';
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;
ROLLBACK;
```

- Plan: `Limit -> Index Scan using idx_audit_log_created Filter: is_admin() OR actor_id = $sub`
- rows=50 (Admin sieht alle)
- Buffers: shared hit=175
- Planning Time: 0.077 ms
- **Execution Time: 0.719 ms** (vs postgres 0.407ms = ~1.8x — minimal Overhead durch `is_admin()`-Aufruf)
- Verdict: **PASS** unter 100ms. Forensik-Pfad fuer Admin performant.

## Post-Apply Verifikation (MT-5 Done-Marker)

```sql
SELECT * FROM list_tables_with_authenticated_full_access() ORDER BY 1;
```

| schemaname | tablename | policyname |
|---|---|---|
| public | knowledge_chunks | authenticated_full_access |

**Done-Gate Pre 2 → Post 1** ✓ (knowledge_chunks SLC-905 verbleibend).

```sql
SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='audit_log' ORDER BY policyname;
```

| policyname | cmd | qual | with_check |
|---|---|---|---|
| audit_log_delete | DELETE | false | — |
| audit_log_insert | INSERT | — | false |
| audit_log_select | SELECT | `is_admin() OR actor_id = auth.uid()` | — |
| audit_log_update | UPDATE | false | false |

**= 4 Policies aktiv** ✓.

```sql
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='audit_log' ORDER BY indexname;
```

= 6 Indices: `audit_log_pkey`, `idx_audit_log_actor`, **`idx_audit_log_actor_created`** (NEU), `idx_audit_log_created`, `idx_audit_log_entity`, `idx_audit_log_view_as`.

## MT-5 Done-Marker

- [x] MIG-048 Live-Apply ohne ERROR (1 CREATE INDEX + 6 DROP POLICY + 4 CREATE POLICY + 1 NOTIFY)
- [x] Re-Apply idempotent verifiziert (NOTICEs `relation already exists`, `policy does not exist`)
- [x] Done-Gate Pre 2 → Post **1** ✓ via Sec-Audit-Helper-Function
- [x] 4 Klasse-E Policies aktiv (SELECT/INSERT/UPDATE/DELETE) via `pg_policies`
- [x] Composite Index `idx_audit_log_actor_created` ergaenzt (6 Indices total)
- [x] Q1 27x SCHNELLER post-MIG (11.016ms → 0.407ms)
- [x] Q2 3.2x SCHNELLER post-MIG (0.622ms → 0.193ms)
- [x] Kein Threshold-Verletzung (beide <100ms)
- [x] RLS-Overhead-Check authenticated TEST_MEMBER_1: 0.071ms (sub-ms)
- [x] RLS-Overhead-Check authenticated Real-Admin: 0.719ms (1.8x vs postgres, akzeptabel)
- [x] Keine Plan-Hash-Regression (Q1 Plan-Hash-Wechsel ist erwuenscht: composite Index aktiv)

**AC-904-5 + AC-904-8 MT-5 PASS.**
