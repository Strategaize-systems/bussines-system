# SLC-751 — ISSUE-066 Middleware-Mitigation (FEAT-752)

## Metadata
- **Slice ID:** SLC-751
- **Version:** V7.5
- **Feature:** FEAT-752 Read-Only-Context Defense-in-Depth
- **Status:** planned
- **Priority:** High (Foundation-First, schliesst Accepted Risk aus V7.1-REL-030)
- **Created:** 2026-05-16
- **Estimated Effort:** ~1-2h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (Middleware-Touch beruehrt jeden Request — Regression-Risiko)
- **Architecture:** DEC-210 (Middleware-Pfad-Regex), DEC-201 (Vitest-Pattern)
- **Reihenfolge-Pflicht:** **erster V7.5-Slice** (Foundation-First per Architecture-Empfehlung)

## Goal

ISSUE-066 final schliessen: Middleware setzt `X-Read-Only-Mode: 1`-Request-Header fuer V7-Drilldown-Routes `/team/[user_id]/*`. `assertNotReadOnlyContext()` liest AsyncLocalStorage + Header parallel. Direct-Server-Action-Calls aus Drilldown-DevTools werden serverseitig blockiert — bisher nur UX-Hide.

## Scope

**In Scope:**

- `cockpit/src/middleware.ts` (MOD) — Pfad-Regex `/^\/team\/[^/]+\//` triggert `NextResponse.headers.set("X-Read-Only-Mode","1")`. Bestehender Supabase-Session-Refresh-Pfad unveraendert.
- `cockpit/src/lib/auth/read-only-context.ts` (MOD) — `assertNotReadOnlyContext()` liest sowohl `readOnlyContextStore.getStore()` als auch `headers().get("X-Read-Only-Mode")`. Throw bei beiden. Kommentar Zeilen 14-19 angepasst: "ISSUE-066 closed in V7.5".
- `cockpit/src/lib/auth/read-only-context.test.ts` (MOD/NEU) — 4 Cases: header=1+no-ALS / no-header+ALS / both / neither (3x throws, 1x passes).
- `cockpit/src/middleware.test.ts` (NEU oder MOD) — Pfad-Regex-Matching fuer 9 Variationen (siehe Match-Tabelle DEC-210).
- `audit_log` neue Action `read_only_context_blocked` mit metadata `{path, attempted_action, blocked_via}`. Insert geschieht in `ReadOnlyContextError`-Catch-Path innerhalb der Server-Actions (nicht in `assertNotReadOnlyContext()` selbst, weil dort `headers()`/`cookies()` u.U. nicht zugaenglich). Implementierungs-Variante: Audit-Insert in `assertNotReadOnlyContext()` selbst, mit best-effort try/catch.
- Playwright-MCP-Live-Smoke (im QA-Step): Teamlead-Login → `/team/<member-uuid>/pipeline` → DevTools-fetch `updateDeal` mit `Next-Action`-Header → erwartet 500/Error + `audit_log`-Eintrag.
- `docs/KNOWN_ISSUES.md` (MOD) — ISSUE-066 Status `resolved` mit Resolved-Date + Resolution-Notes verlinkend AC-5 Playwright-Smoke.
- `docs/DECISIONS.md` (MOD) — DEC-210 + DEC-211 als `accepted` markieren (sind bereits in V7.5-Architecture; hier nur Status-Sync nach Implementation).

**Out of Scope:**

- HOF-Wrapper-Variante (`withReadOnlyGuard()` Decorator fuer alle Server-Actions) — V8+-Item
- Andere Read-Only-Routes ueber `/team/[user_id]/*` hinaus
- Wechsel von AsyncLocalStorage auf reines Header-Pattern (beide laufen parallel als Defense-in-Depth)

## Acceptance Criteria

- **AC1** Vitest `read-only-context.test.ts` 4 RED-GREEN-Cases:
  - Mock `headers().get('X-Read-Only-Mode')='1'`, kein AsyncLocalStorage → throws `ReadOnlyContextError`
  - Kein Header, kein AsyncLocalStorage → passes
  - AsyncLocalStorage gesetzt, kein Header → throws (bestehender SLC-706-Pfad)
  - Beide gesetzt → throws
- **AC2** Vitest `middleware.test.ts` 9 Pfad-Cases nach DEC-210 Match-Tabelle: `/team/abc/pipeline` matches, `/team/abc/aufgaben/new` matches, `/team/abc/mein-tag` matches, `/team/` ohne Sub-Pfad NO match, `/team` NO match, `/api/cron/automation-runner` NO match, `/api/health` NO match, `/settings/team` NO match, `/login` NO match.
- **AC3** Middleware-Code-Inspection: Pfad-Regex `/^\/team\/[^/]+\//` (strict, mit `/` nach `[user_id]`). Header-Set via `NextResponse.headers.set("X-Read-Only-Mode","1")`.
- **AC4** `read-only-context.ts` Zeilen 14-19 Kommentar aktualisiert: "ISSUE-066 closed in V7.5 — assertNotReadOnlyContext reads AsyncLocalStorage + X-Read-Only-Mode header parallel."
- **AC5** Playwright-MCP-Live-Smoke (post-Deploy):
  - Login als Teamlead via Admin-API (Pattern aus `reference_playwright_live_smoke_pattern`)
  - Navigate `/team/<member-uuid>/pipeline`
  - DevTools: `fetch('/team/<member-uuid>/pipeline', {method:'POST', headers:{'Next-Action':'<id>',...}, body:'<deal-update-payload>'})`
  - Expectation: Response 500/403, Server-Action wirft `ReadOnlyContextError`
  - Cleanup via Admin-API
- **AC6** `audit_log` enthaelt nach AC-5-Smoke einen `read_only_context_blocked`-Eintrag mit `actor_id=<teamlead-uuid>`, `metadata.path=/team/<member-uuid>/pipeline`, `metadata.blocked_via="header"`.
- **AC7** `docs/KNOWN_ISSUES.md` ISSUE-066 → `Status: resolved`, Resolved-Date `2026-05-16` (oder Tag der Live-Smoke-Bestaetigung), Resolution-Notes mit AC-5-Reference + SLC-751-Link.
- **AC8** `npm run test:all` 917 → 917+13 PASS (4 Context-Cases + 9 Middleware-Cases).

## Micro-Tasks

### MT-0: Worktree-Branch + Vorab-Review
- **Goal:** `slc-751-issue066-middleware` Branch erstellen + bestehende `cockpit/src/middleware.ts` lesen (Supabase-Session-Refresh-Pfad nicht beschaedigen).
- **Files (Review-only):**
  - `cockpit/src/middleware.ts` (Read)
  - `cockpit/src/lib/auth/read-only-context.ts` (Read)
  - `cockpit/src/lib/audit.ts` (Read — fuer Best-Effort-Audit-Insert-Pattern)
- **Verification:** Branch existiert, Middleware-Struktur verstanden.
- **Dependencies:** none

### MT-1: Middleware-Pfad-Regex + Header-Set
- **Goal:** Pfad-Regex `/^\/team\/[^/]+\//` einbauen, `X-Read-Only-Mode: 1`-Header setzen. Bestehende Logik unveraendert.
- **Files:**
  - `cockpit/src/middleware.ts` (MOD) — innerhalb der bestehenden `middleware`-Function, nach Supabase-Session-Refresh.
- **Expected behavior:**
  - `if (/^\/team\/[^/]+\//.test(request.nextUrl.pathname)) response.headers.set("X-Read-Only-Mode", "1");`
  - Header wird mitgeleitet bei jedem Drilldown-Request.
- **Verification:** TSC clean. Lokal `next dev` start, manueller Test `curl -I http://localhost:3000/team/anything/pipeline` zeigt Header (oder Pfad-Vitest in MT-2).
- **Dependencies:** MT-0

### MT-2: Vitest Middleware-Pfad-Regex-Test (9 Cases)
- **Goal:** RED-GREEN-Test fuer Pfad-Regex-Matching. DEC-210 Match-Tabelle als Truth-Table.
- **Files:**
  - `cockpit/src/middleware.test.ts` (NEU oder MOD wenn existiert)
- **Expected behavior:** Test pruft fuer 9 Pfade `pathMatchesReadOnlyDrilldown(pathname)` → true/false nach Tabelle. Falls Middleware-Funktion inlined: Extract `pathMatchesReadOnlyDrilldown` als exportierte Pure-Function im Middleware-File.
- **Verification:** `cd cockpit && npm run test middleware` 9/9 PASS.
- **Dependencies:** MT-1

### MT-3: `assertNotReadOnlyContext()` Layer-2-Header-Read
- **Goal:** Function liest AsyncLocalStorage + Header parallel. Best-Effort-Audit-Insert bei Block via Header.
- **Files:**
  - `cockpit/src/lib/auth/read-only-context.ts` (MOD)
- **Expected behavior:**
  - Layer 1: bestehender `readOnlyContextStore.getStore()` — wenn aktiv: throw `ReadOnlyContextError("AsyncLocalStorage", ctx)`.
  - Layer 2: `const hdr = (await headers()).get("X-Read-Only-Mode")` — wenn `"1"`: try-catch best-effort `audit_log`-Insert + throw `ReadOnlyContextError("X-Read-Only-Mode header", {source:"middleware"})`.
  - Kommentar Zeilen 14-19 aktualisiert.
- **Verification:** TSC clean. MT-4 Tests gruen.
- **Dependencies:** MT-0

### MT-4: Vitest read-only-context.test.ts 4 Cases
- **Goal:** RED-GREEN-Coverage fuer alle 4 Permutations (header / ALS / both / neither).
- **Files:**
  - `cockpit/src/lib/auth/read-only-context.test.ts` (NEU oder MOD)
- **Expected behavior:**
  ```typescript
  vi.mock("next/headers");
  // Case 1: header=1, no ALS → throws ReadOnlyContextError
  // Case 2: no header, no ALS → passes (no throw)
  // Case 3: ALS active, no header → throws (existing SLC-706 path)
  // Case 4: both active → throws (Defense-in-Depth)
  ```
- **Verification:** `cd cockpit && npm run test read-only-context` 4/4 PASS. `npm run test:all` 917 → 921 PASS (4 Cases) + 9 Middleware = 930 PASS (Korrektur AC8: 917+13=930).
- **Dependencies:** MT-3

### MT-5: Playwright-MCP-Live-Smoke (in /qa-Step)
- **Goal:** End-to-End-Verifikation: Teamlead-DevTools-Direct-Call wird mit `ReadOnlyContextError` blockiert + `audit_log`-Eintrag verifiziert.
- **Files (Verifikation, kein Code-Edit):**
  - Test-User aus V7.2-Seed (`qa-teamlead@strategaize.test`, `qa-member@strategaize.test`)
  - Live-Cockpit nach Coolify-Deploy
- **Expected behavior:**
  1. Playwright-MCP Login als Teamlead via Admin-API
  2. Navigate `/team/<qa-member-uuid>/pipeline`
  3. `browser_evaluate` — Direct-Fetch-Call mit `Next-Action`-Header an `updateDeal`-Server-Action
  4. Expect Response-Status 500 oder Error-Body mit "ReadOnlyContextError" oder "X-Read-Only-Mode header"
  5. Cleanup
  6. SQL-Verifikation via `docker exec`-psql: `SELECT * FROM audit_log WHERE action='read_only_context_blocked' AND actor_id='<teamlead-uuid>' ORDER BY created_at DESC LIMIT 1;` → 1 Eintrag
- **Verification:** Playwright-Smoke Screenshot + audit_log-SELECT-Output in RPT-XXX dokumentiert.
- **Dependencies:** MT-1..MT-4 done + User-Coolify-Deploy + Worktree gemerged

### MT-6: Cockpit-Records-Sync
- **Goal:** Nach Slice-Done: ISSUE-066 resolved, SLC-751 done, FEAT-752 done.
- **Files:**
  - `docs/KNOWN_ISSUES.md` (MOD) — ISSUE-066 Status `resolved` mit Resolved-Date + AC-5-Reference
  - `slices/INDEX.md` (MOD) — SLC-751 Status `done`
  - `features/INDEX.md` (MOD) — FEAT-752 Status `done`
  - `planning/backlog.json` (MOD) — BL-476 Status `done`
- **Verification:** Cockpit-Manual-Check oder Datei-Inspection.
- **Dependencies:** MT-5 PASS

## Risks & Mitigations

- **R1** `next/headers`-API in Server-Action-Context — falls `headers()` aus Server-Action nicht aufrufbar (Edge-Case Next.js App-Router), faellt Header-Layer aus. **Mitigation:** MT-3 erfolgt mit `await headers()` (Next.js 15-Pattern). MT-4 mockt `next/headers` direkt. Falls Live-Smoke MT-5 zeigt dass Header nicht ankommt: Architecture-Adjustment via `cookies()`-Fallback oder Server-Action-Wrapper-Pattern.
- **R2** Cron-Endpoint-Side-Channel — Pfad-Regex matched `/team/...` aber Cron-Routes liegen unter `/api/cron/*`. Kein Overlap, AC2 verifiziert.
- **R3** Performance-Overhead pro Drilldown-Request — Header-Set ist nanosecond, kein Bottleneck. Bestehender Supabase-Session-Refresh-Pfad ist viel teurer.
- **R4** Bestehender Middleware-Code hat eigene Logik (Auth-Refresh) — **Mitigation:** Pfad-Check kommt NACH der Auth-Logik (am Ende der `middleware`-Function), keine bestehende Behavior-Aenderung.

## Dependencies

- **V7.2 SLC-721** (Test-Infra-Cleanup): Vitest-RLS-Config + Multi-User-Seed muss greifen (fuer Playwright-Smoke mit Teamlead+Member). Done in REL-031.
- **V7 SLC-704/706** (Drilldown + AsyncLocalStorage): Bestehender Pfad bleibt aktiv.
- **V7.1 FEAT-713** (4 first-line Guards): Profitieren automatisch ohne Code-Change.

## Verification & Tests

- TSC clean
- Vitest `npm run test:all` 917 → 930 PASS (+13)
- Playwright-MCP-Live-Smoke MT-5 PASS
- audit_log `read_only_context_blocked`-Eintrag verifiziert
- ISSUE-066 Status `resolved`

## Open Points

- `next/headers`-API-Verfuegbarkeit in Server-Action-Context — bei Drift wird MT-5 das offenbaren, dann Architecture-Adjustment.

## Files Reviewed (Slice-Planning)

- `cockpit/src/middleware.ts` (vermutete Supabase-Refresh-Funktion, exakte Struktur in MT-0 verifiziert)
- `cockpit/src/lib/auth/read-only-context.ts:14-19` (Comment-Anker)
- `docs/ARCHITECTURE.md` V7.5-Section (DEC-210 Match-Tabelle)
- `docs/KNOWN_ISSUES.md` ISSUE-066
- Memory `reference_playwright_live_smoke_pattern.md`

## Recommended Implementation Skill

`/backend` fuer MT-0..MT-4 (Middleware + Guard + Tests).
`/qa` fuer MT-5 Playwright-MCP-Live-Smoke + audit_log-SELECT-Verifikation.
Master-Merge nach MT-5 PASS (per `feedback_slice_merge_at_end`).
