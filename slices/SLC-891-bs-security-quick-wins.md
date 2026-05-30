# SLC-891 — BS Security Quick-Wins

- **Version**: V8.9
- **Feature**: FEAT-891 / BL-497
- **Created**: 2026-05-30
- **Status**: planned
- **Branch**: `slc-891-security-quick-wins-bs` (Single-Branch, kein Worktree noetig — BS = Internal-Tool-Mode, Slice ist Defense-in-Depth ohne Production-Risk)
- **Aufwand**: M (3-4h Code + ~1h /qa + Coolify-Redeploy)

## Purpose

Schliesst die 5 hoechst-priorisierten Security-Findings aus dem Cross-Repo-Audit 2026-05-30 (`docs/SECURITY_AUDIT_2026-05-30.md`):

- **SEC-001..004** (4× High IDOR): 4 API-Routes lesen+updaten via `createAdminClient()` (service_role BYPASSRLS) auf `params.id`/`body.id` ohne User-Client-Vor-Check. **Aktiv exploitable** fuer Cross-Owner-Bedrock-Cost + PII-Verarbeitung.
- **SEC-010** (Medium Timing-Side-Channel): 17 Cron-Endpoints + 6 Export-API-Endpoints nutzen `!==` statt `crypto.timingSafeEqual` fuer Secret-Vergleich.

## Out-of-Scope

- BS SEC-005 (Email-HTML DOMPurify-Sanitize) → eigener Slice Sprint 2 (~3h)
- BS SEC-006 (25-Tabellen-RLS-Sweep) → eigener V8.10/V9-Foundation-Sweep (1-2 Wochen)
- BS SEC-007/008 (search_knowledge_chunks + documents-Storage) → Sprint 2
- BS SEC-009..020 → V8.10 oder spaeter

## Pre-Conditions

- V8.8 STABLE (RPT-556 bestaetigt 2026-05-29)
- Coolify-DB erreichbar fuer Vitest-RLS-Suite via Container-Hostname
- Strategaize-Pattern-Reuse-Rule (`.claude/rules/strategaize-pattern-reuse.md`) anwenden

## Acceptance Criteria

- **AC-1 (SEC-001)**: `POST /api/meetings/[id]/generate-agenda` mit fremder Meeting-UUID returnt HTTP 404 (User-Client kann die Row per RLS nicht sehen → `maybeSingle()` returnt `null` → Endpoint returnt 404 vor `createAdminClient`-Call).
- **AC-2 (SEC-002)**: `POST /api/signals/extract` mit `body.deal_id` eines fremden Deals returnt HTTP 404.
- **AC-3 (SEC-003)**: `POST /api/knowledge/query` mit `body.deal_id` eines fremden Deals returnt HTTP 404. `loadDealContext()` nutzt User-Client. `queryKnowledge()` haengt einen `caller_uid`-Filter an die `search_knowledge_chunks`-RPC (additiv, RPC bleibt funktional fuer alte Caller mit `caller_uid=NULL`-Default → no-op-Filter).
  - **Hinweis:** Tieferer Fix von `search_knowledge_chunks` SEC-007 ist Out-of-Scope (Sprint 2). MT-3 macht nur den Caller-Side-Schutz, RPC-Signatur-Erweiterung um `caller_uid uuid DEFAULT NULL` ist optional und kann auf Sprint 2 verschoben werden — dann SEC-003 partial-mitigation via `loadDealContext`-Schutz.
- **AC-4 (SEC-004)**: `POST /api/meetings/[id]/retry-summary` und `/retry-transcript` mit fremder Meeting-UUID returnen HTTP 404.
- **AC-5 (SEC-010)**: `verifyCronSecret()` und `verifyExportApiKey()` nutzen `crypto.timingSafeEqual` mit Buffer-Length-Check. Pattern-Reuse aus `cockpit/src/lib/calcom/webhook-handler.ts:61-67` (timing-safe ist dort bereits etabliert). Identische Signatur, kein Caller-Change.
- **AC-6 (Vitest)**: 4 neue "rejects-404-on-foreign-id" Tests in `cockpit/__tests__/rls/` (eine pro IDOR-Route). 2 neue Tests fuer timing-safe-Helper (positive + negative case). Suite >= 1156 (1152 Baseline + min. 4 IDOR + 2 timing-safe). Tests laufen gegen Coolify-DB im node:22-Container per `.claude/rules/coolify-test-setup.md`.
- **AC-7 (Lint+Build)**: `npm run lint` 142e/57w EXAKT V8.8-Baseline (keine neuen Errors/Warnings). `npm run build` PASS. `npm run test:tsc` EXIT=0.
- **AC-8 (Live-Smoke)**: Post-Deploy 4 HTTP-Probes per `curl` gegen Production:
  1. `POST /api/meetings/<random-uuid>/generate-agenda` mit Admin-Session → 404
  2. `POST /api/signals/extract` mit `{"deal_id":"<random-uuid>"}` → 404
  3. `GET /api/cron/click-log-cleanup` mit gueltigem CRON_SECRET → 200 (Sanity-Check timing-safe-Refactor brach nichts)
  4. `GET /api/cron/click-log-cleanup` mit `X-Cron-Secret: x` → 401 (negativ-Pfad)
- **AC-9 (Audit-Records)**: `docs/AUDIT_SERVER_ACTIONS_V7.md` um SLC-891-Section ergaenzt (4 IDOR-Patched-Routes + timing-safe-Helper).

## Micro-Tasks

### MT-1: SEC-001 generate-agenda IDOR-Fix
- **Goal**: User-Client-Vor-Check vor `createAdminClient()` Pfad einbauen.
- **Files**: `cockpit/src/app/api/meetings/[id]/generate-agenda/route.ts`, `cockpit/__tests__/rls/sec-891-idor-meetings-generate-agenda.test.ts` (NEU).
- **Expected behavior**: Vor `admin.from("meetings").select(...).eq("id", id)`-Pfad: `const { data: visible } = await supabase.from("meetings").select("id").eq("id", id).maybeSingle(); if (!visible) return new Response(null, { status: 404 });` Server-Client kommt aus `createServerClient()` der schon im File ist (auth-check). Danach unveraendert.
- **Verification**: Vitest "rejects with 404 when meeting belongs to other owner" PASS gegen Coolify-DB. Build clean.
- **Dependencies**: none.

### MT-2: SEC-002 signals-extract IDOR-Fix
- **Goal**: Gleiches Pattern wie MT-1 fuer Deal-Lookup.
- **Files**: `cockpit/src/app/api/signals/extract/route.ts`, `cockpit/__tests__/rls/sec-891-idor-signals-extract.test.ts` (NEU).
- **Expected behavior**: Vor `admin.from("deals")...eq("id", body.deal_id)`-Pfad: `const { data: visible } = await supabase.from("deals").select("id").eq("id", body.deal_id).maybeSingle(); if (!visible) return Response.json({ error: "deal_not_found" }, { status: 404 });`
- **Verification**: Vitest PASS.
- **Dependencies**: none (kann parallel zu MT-1 laufen).

### MT-3: SEC-003 knowledge-query IDOR-Fix
- **Goal**: User-Client-Vor-Check fuer `loadDealContext()`. (RPC-Erweiterung von `search_knowledge_chunks` um `caller_uid` ist Optional/Spaeter.)
- **Files**: `cockpit/src/app/api/knowledge/query/route.ts`, `cockpit/src/lib/knowledge/search.ts`, `cockpit/__tests__/rls/sec-891-idor-knowledge-query.test.ts` (NEU).
- **Expected behavior**: In `loadDealContext(dealId)` wird der erste Lookup ueber User-Client gemacht statt Admin-Client. Wenn null → return null (Caller returnt dann 404). Im API-Handler: Wenn `body.deal_id` gesetzt und `loadDealContext()` returnt null → HTTP 404.
- **Verification**: Vitest PASS. `loadDealContext` ohne dealId weiter funktional (Cockpit-Mode).
- **Dependencies**: none (kann parallel zu MT-1/MT-2 laufen).

### MT-4: SEC-004 retry-summary + retry-transcript IDOR-Fix
- **Goal**: User-Client-Vor-Check vor admin-Update auf `meetings`.
- **Files**: `cockpit/src/app/api/meetings/[id]/retry-summary/route.ts`, `cockpit/src/app/api/meetings/[id]/retry-transcript/route.ts`, `cockpit/__tests__/rls/sec-891-idor-meetings-retry.test.ts` (NEU, beide Routes in einem Test-File).
- **Expected behavior**: Analog MT-1 in beiden Files.
- **Verification**: Vitest PASS fuer beide Routes.
- **Dependencies**: none.

### MT-5: SEC-010 timing-safe Cron-Secret + Export-API-Key
- **Goal**: `verifyCronSecret()` und `verifyExportApiKey()` auf `crypto.timingSafeEqual` umstellen.
- **Files**: `cockpit/src/app/api/cron/verify-cron-secret.ts`, `cockpit/src/lib/export/auth.ts`, `cockpit/__tests__/lib/sec-891-timing-safe.test.ts` (NEU).
- **Expected behavior**: Beide Helper bekommen Buffer-Length-Check (`if (a.length !== b.length) return false;`) gefolgt von `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`. Signatur unveraendert. Pattern-Reuse aus `cockpit/src/lib/calcom/webhook-handler.ts:61-67` als Quellen-Kommentar im Helper-Header.
- **Verification**: 2 Vitest-Cases (positive: gueltiges Secret returnt true; negative: ungueltiges Secret returnt false ohne early-return-Latency-Difference — Test ist Behavior-only, kein Statistical-Timing-Test). Build clean. Lint clean. 17 Cron-Routes + 6 Export-Routes funktional unveraendert (Pattern-Spot-Check `grep verifyCronSecret cockpit/src/app/api/cron`).
- **Dependencies**: none (kann parallel zu MT-1..MT-4 laufen).

### MT-6: Doc-Update + Records-Sync
- **Goal**: AUDIT_SERVER_ACTIONS_V7.md um SLC-891-Section ergaenzen. Slice-INDEX + Backlog + STATE + KNOWN_ISSUES updaten.
- **Files**: `docs/AUDIT_SERVER_ACTIONS_V7.md`, `slices/INDEX.md`, `planning/backlog.json` (BL-497 → done), `planning/roadmap.json` (V8.9 → released nach Deploy), `docs/STATE.md` (Last Stable Version + Active Scope), `docs/RELEASES.md` (REL-042 nach Deploy).
- **Expected behavior**: SLC-891 → done in INDEX nach /qa PASS. BL-497 → done. V8.9 status `active` waehrend Implementation, `released` nach REL-042-Deploy. KNOWN_ISSUES braucht keinen Update weil die 5 Findings in der Cross-Repo-Summary stehen, nicht in KNOWN_ISSUES.
- **Verification**: Cockpit-Records-Hygiene-Check (mandatory-completion-report.md Sektion 8). Counts in INDEX match.
- **Dependencies**: MT-1..MT-5 done + /qa PASS.

## Notable Risks

- **R-1 (Low)**: `search_knowledge_chunks` RPC bleibt in MT-3 unveraendert. SEC-007 (tieferer Tenant-Filter im RPC) ist Sprint 2. MT-3 schliesst nur den `loadDealContext`-Pfad, nicht den `queryKnowledge`-RPC-Pfad → ein authentifizierter User koennte theoretisch direkt mit `dealId=undefined` + nur Free-Text-Query Cross-Tenant-Embeddings finden. **Mitigation**: bewusste partial-mitigation, dokumentiert in der Slice-Beschreibung + Cross-Repo-Summary. Voll-Fix in Sprint 2.
- **R-2 (Low)**: Cron-Secret-Refactor koennte Wire-Format-Drift haben falls bestehende Coolify-Cron-Jobs mit Sonderzeichen-haltigem Secret arbeiten. **Mitigation**: AC-8 Live-Smoke-Probe 3+4 testet positiv+negativ-Pfad post-Deploy, plus zusaetzlich `docker logs $(docker ps --format '{{.Names}}' | grep ^app)` nach Coolify-Redeploy 5 Min beobachten auf 401-Errors aus Cron-Loops.
- **R-3 (Low)**: MT-3 koennte Knowledge-Query-Latenz minimal erhoehen (1 zusaetzliche DB-Roundtrip via User-Client). **Mitigation**: User-Client-Roundtrip ist primary-key-eq() auf einem Index → < 5ms. Acceptable.

## Strategaize Pattern Reuse (Pflicht)

- `cockpit/src/lib/calcom/webhook-handler.ts:61-67` — etabliertes `crypto.timingSafeEqual`-Pattern fuer MT-5.
- `cockpit/__tests__/rls/v7-rls-matrix.test.ts` — Vitest-RLS-Pattern fuer MT-1..MT-4 Coolify-DB-Tests (User-Token-Setup + SAVEPOINT-Pattern aus `coolify-test-setup.md`).
- Bestehendes User-Client-Pattern via `createServerClient()` ist in allen 4 IDOR-Routes schon vorhanden fuer den Auth-Check — wir hangen den Owner-Visible-Check daran an.

## Verification Plan

1. `npm run test:rls -- sec-891` → 4+ neue Tests PASS gegen Coolify-DB
2. `npm run test` → >= 1156 PASS (unchanged baseline + min. 4 + 2 neue)
3. `npm run lint` → 142e/57w (EXAKT V8.8-Baseline, falls Drift → fixen oder als Finding)
4. `npm run test:tsc` → EXIT=0
5. `npm run build` → PASS
6. Coolify-Redeploy via Coolify-UI (User-Action)
7. AC-8 Live-Smoke 4 curl-Probes gegen Production
8. 18-24h Burn-In, danach REL-042-Stable-Bestaetigung

## Next Step

`/backend SLC-891 MT-1` als naechster Step. MT-1..MT-5 koennen parallel implementiert werden (kein Cross-File-Konflikt). MT-6 zuletzt nach /qa PASS.
