# SLC-909 — V8.12 LLM-Cost-Cap Pre-flight (BL-504, Phase 2.3)

## Status

- Version: V8.12
- Feature: FEAT-922
- Backlog: BL-504
- Status: blocked
- Priority: Medium
- Created: 2026-06-09

## 🛑 BLOCKED / DEFERRED (2026-06-10, /backend A-V812-2 pre-check)

**This slice is not implementable as specified. Deferred out of V8.12 by Founder decision 2026-06-10.**

Root cause: SLC-909, DEC-281 and ARCHITECTURE.md all assume a per-tenant cost ledger
`ai_cost_ledger.tenant_id` ("existing seit V6.4"). The A-V812-2 pre-check against the
production Coolify-DB proved this premise false for BS:

- `SELECT to_regclass('public.ai_cost_ledger')` → **NULL** (table does not exist)
- **Zero** tables in the `public` schema have a `tenant_id` column (BS multi-tenancy is
  `team_id`/`user_id`-based per ARCHITECTURE V8.4: "Multi-Tenant via team_id-Reuse, kein
  eigenes tenant_id-Schema-Refactor")
- `ai_cost_ledger` is an **Intelligence Studio** construct (FK `ai_cost_ledger.job_id →
  ai_jobs(id)` pattern, see `.claude/rules/backend.md`). BS records LLM cost only in
  `audit_log.context` (JSON string `sculptor_cost_usd`, in USD) and **only for the sculptor
  flow** — the ~15 other `queryLLM()` callers record no cost at all.

Consequence: MIG-050 (`get_tenant_cost_sums(p_tenant_id UUID)` querying
`SUM(cost_eur) FROM ai_cost_ledger WHERE tenant_id=$1`) cannot be written — no table, no
`cost_eur`, no `tenant_id`. A cap built on existing data would miss exactly the runaway
paths (cron loops, multi-agent) this slice exists to guard against → false confidence.

A real per-tenant EUR cost cap requires a cost-recording foundation BS does not have
(an `ai_cost_ledger`-equivalent + write-path wiring across all `queryLLM` callers). That
is its own feature, not a single slice → **deferred to a Post-V8.12 slot** (BL-504,
unversioned). See KNOWN_ISSUES ISSUE-097, DEC-288 (supersedes DEC-281), IMP-005, RPT-618.

The spec body below is preserved for the future foundation slice.

---

## Purpose

Pre-flight Cost-Cap pro Tenant im Bedrock-Adapter — verhindert Cost-Spike durch verirrte Cron-Loops oder Multi-Agent-Worker-Runaway. Defaults 25 EUR DAILY / 500 EUR MONTHLY per Tenant (DEC-281).

Pattern wird Cross-Repo-Reuse-Quelle (analog IS V4.x Cost-Tracking).

## In Scope

- Pre-flight in `cockpit/src/lib/ai/bedrock-client.ts queryLLM()` + `queryStreamingLLM()`
- In-Memory `capCache: Map<tenant_id, {day_sum, month_sum, expires_at}>` Module-Scope (DEC-287)
- Cap-Approach-Bypass: bei `last_known_sum > 0.95 * Cap` → Cache-Skip + fresh SELECT
- Sentry-Alert via `Sentry.captureMessage("LLM Cap Hit", level=warning, tags={tenant_id, period})` (DEC-283)
- ENV-Defaults: `LLM_DAILY_CAP_EUR_PER_TENANT=25`, `LLM_MONTHLY_CAP_EUR_PER_TENANT=500`
- Optional: Postgres RPC `get_tenant_cost_sums(p_tenant_id)` als single-roundtrip-Query

## A-V812-2 Pre-Check (Pre-MT-1)

Direct-SQL gegen Coolify-DB:

```sql
SELECT COUNT(*) FROM ai_cost_ledger WHERE tenant_id IS NULL;
```

- Wenn 0: weiter wie geplant
- Wenn >0: MT-2 ergaenzt Default-Tenant-Fallback-Logic (Cron-only-Tenant-UUID aus ENV `SYSTEM_TENANT_ID`)

## Out of Scope

- Pro-Service-Role-Cost-Cap (Workspace vs Cron getrennt) — Post-V8.12-Slot
- Multi-Tenant-Cost-Cap-Tabelle mit per-Tenant-Overrides — Post-V8.12-Slot
- Slack-Webhook fuer Alerts (DEC-283: Sentry-Dashboard reicht)
- Cross-Container Redis-Cache (Post-V8.12-Slot bei Worker-Container)

## Acceptance Criteria

- AC-909-1: `queryLLM()` macht Pre-flight `checkCap(tenant_id)` vor Bedrock-Call
- AC-909-2: Bei Cap-Hit: `Sentry.captureMessage("LLM Daily/Monthly Cap Exceeded", level=warning, tags=...)` + `throw new Error("LLM Daily Cap Exceeded")`
- AC-909-3: `capCache` 1min TTL, Cache-Hit-Verifikation via Vitest (1 SELECT-Call pro Tenant pro Minute)
- AC-909-4: Cap-Approach-Bypass: wenn `cached.day_sum > 0.95 * DAILY_CAP` → Cache-Skip + fresh SELECT (verhindert silent Drift kurz vor Cap)
- AC-909-5: Cron/Job-Status=`failed` bei Cap-Hit-Throw (nicht silent-error)
- AC-909-6: ENV-Missing-Defaults: `LLM_DAILY_CAP_EUR_PER_TENANT` undefined → default 25
- AC-909-7: TSC=0, ESLint=0, Vitest GREEN (mind. 6 Test-Cases: cap-reached/cap-not-reached/ENV-default/cache-hit/cache-miss-1min/cap-approach-bypass)
- AC-909-8: A-V812-2 Pre-Check dokumentiert (Pre-MT-1 result)

## Risks

- **R-909-1 (R-V812-4)**: Pre-flight-Latenz vor jedem Bedrock-Call — **Mitigation**: In-Memory-Cache 1min TTL (Cache-Hit <1ms)
- **R-909-2**: Cap-Approach-Window kann zu spaet sein bei Burst — **Mitigation**: 95%-Threshold-Bypass + bei Hit Job-failed nicht silent
- **R-909-3**: Multi-Container-Drift (Worker+App separat) — **Akzeptiert** Internal-Test-Mode-Single-Container, Post-V8.12-Slot Redis-Cache
- **R-909-4**: ai_cost_ledger.tenant_id inconsistent → Cap berechnet falsch — **Mitigation**: A-V812-2 Pre-Check, MT-2 Default-Tenant-Fallback wenn noetig

## Dependencies

- DEC-281 (Pro-Tenant + Defaults 25/500) ✓
- DEC-283 (Sentry-Alert) ✓
- DEC-287 (In-Memory-Cache 1min TTL + Approach-Bypass) ✓
- SLC-911 done (Sentry.captureMessage Wrapper verfuegbar)

## Micro-Tasks

### MT-0: A-V812-2 Pre-Check (Direct-SQL)
- Goal: Verifizieren ob ai_cost_ledger.tenant_id konsistent gepflegt ist
- Files: `qa/SLC-909-pre-check.md` (NEW)
- Expected: `SELECT COUNT(*) FROM ai_cost_ledger WHERE tenant_id IS NULL` per node:20-Sidecar gegen Coolify-DB
- Verification: Result dokumentiert. Wenn 0: MT-2 wie geplant. Wenn >0: MT-2 ergaenzt Default-Tenant-Fallback
- Dependencies: none

### MT-1: get_tenant_cost_sums RPC (Postgres)
- Goal: Single-Roundtrip RPC fuer day+month-sum
- Files: `sql/migrations/050_v812_tenant_cost_sums_rpc.sql` (NEW), `__tests__/rls/v812-cost-cap.test.ts` (NEW)
- Expected: `CREATE OR REPLACE FUNCTION get_tenant_cost_sums(p_tenant_id UUID) RETURNS TABLE(day_sum NUMERIC, month_sum NUMERIC)` LANGUAGE SQL STABLE
- Verification: RPC gibt korrekte Summen, Vitest gegen Live-DB
- Dependencies: MT-0
- Note: Trotz "0 Schema-Migration"-Erwartung aus /architecture braucht es eine pure Read-Only-Function (kein Tabellen-DDL). Daher MIG-050 leicht-gewichtig.

### MT-2: capCache + checkCap Helper
- Goal: Module-Scope Map + Pre-flight-Logic in bedrock-client.ts
- Files: `cockpit/src/lib/ai/bedrock-client.ts` (Edit), `cockpit/src/lib/ai/__tests__/bedrock-cap.test.ts` (NEW)
- Expected: `checkCap(tenantId)` mit Cache + Approach-Bypass + Hard-Cap-Throw + Sentry-Alert
- Verification: Vitest 6+ Test-Cases (cap-reached/cap-not-reached/ENV-default/cache-hit/cache-miss-1min/approach-bypass) GREEN
- Dependencies: MT-1, SLC-911 done
- Optional: Default-Tenant-Fallback wenn A-V812-2 result >0

### MT-3: queryLLM + queryStreamingLLM Pre-flight-Wiring
- Goal: `await checkCap(tenantId)` vor jedem Bedrock-Call
- Files: `cockpit/src/lib/ai/bedrock-client.ts` (Edit)
- Expected: Pre-flight wirft → queryLLM returnt error oder propagiert Cap-Exceeded-Error
- Verification: Vitest 2+ Test-Cases (Pre-flight-Throw verhindert Bedrock-Call)
- Dependencies: MT-2

### MT-4: Logger-Migration in bedrock-client.ts
- Goal: bestehende console.* in bedrock-client.ts auf `logSafe()` (SLC-907)
- Files: `cockpit/src/lib/ai/bedrock-client.ts` (Edit)
- Expected: 0 console.* in bedrock-client.ts, alle via logSafe()
- Verification: grep audit
- Dependencies: SLC-907 done

### MT-5: ENV-Documentation
- Goal: `.env.example` + Coolify-Hinweis fuer 2 neue ENVs
- Files: `cockpit/.env.example` (Edit)
- Expected: `LLM_DAILY_CAP_EUR_PER_TENANT=25` + `LLM_MONTHLY_CAP_EUR_PER_TENANT=500` dokumentiert
- Verification: Eintrag vorhanden
- Dependencies: MT-2

## Pattern-Reuse

- Keine — BS V8.12 ist Origin (per RPT-608 Pattern-Reuse-Audit)
- Pattern wird Cross-Repo-Reuse-Quelle (analog IS V4.x Cost-Tracking)

## Done-Gate

- `checkCap` wird vor jedem Bedrock-Call gerufen (grep `checkCap` in bedrock-client.ts)
- Vitest GREEN inkl. 6+ neue Cap-Tests
- Cap-Hit-Alert via Sentry verifiziert (Vitest Mock)
- MIG-050 LIVE-applied auf Coolify-DB (`get_tenant_cost_sums` RPC verfuegbar)
- Logger-Migration bedrock-client.ts done

## Migration-Hinweis

Trotz "0 Schema-Migration"-Erwartung aus /architecture bringt SLC-909 eine **leicht-gewichtige Read-Only-Function MIG-050** mit. Keine Tabellen-DDL. RPC ist konsistent mit existing audit_log/ai_cost_ledger-Pattern (`is_admin()`, `can_see_owner()` RPCs).

**Dokumentations-Pflicht:** MIG-050 in `docs/MIGRATIONS.md` ergaenzen.

## Aufwand

~2-3h Code-Side (incl. MIG-050 + Cache-Logic + Sentry-Wiring) + ~0.5h /qa = ~2.5-3.5h. **Single-Session-machbar.**
