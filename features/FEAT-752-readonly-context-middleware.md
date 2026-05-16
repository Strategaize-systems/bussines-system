# FEAT-752 — Read-Only-Context Defense-in-Depth (ISSUE-066-Closure)

## Purpose

ISSUE-066 schliessen: Middleware-basierter Pfad-Check setzt `X-Read-Only-Mode: 1` Request-Header fuer V7-Drilldown-Routes. `assertNotReadOnlyContext()` liest sowohl `AsyncLocalStorage` als auch den Header. Damit greift der Read-Only-Guard auch bei Direct-Server-Action-Calls aus dem Drilldown — heute nur per UX-Hide mitigiert.

## Why

SLC-706 Drilldown-Mutate-Lockdown wrappt das Drilldown-Layout mit `runWithReadOnlyContext()` via Node `AsyncLocalStorage`. Der Context propagiert korrekt durch Server-Component-Render-Chain (Vitest MT-6 3/3 PASS), ABER: Server Actions sind separate Request-Handler in Next.js App-Router. Direct-Server-Action-Call via DevTools `fetch` mit `Next-Action`-Header laeuft OHNE aktiven Read-Only-Context. `assertNotReadOnlyContext()` greift dann nicht → Mutate-Action wuerde gelingen.

Im SLC-706-Quellcode dokumentiert (`cockpit/src/lib/auth/read-only-context.ts:14-19`): "fuer den Block-Pfad dort muss SLC-704 zusaetzlich auf Pfad-/Header-Hinweise zurueckgreifen". V7.5 setzt das Pattern um.

Heute kein Live-Exploit-Pfad (UX-Hide aktiv + Single-User V1 + Internal-Test-Mode), aber:
- Vor erstem produktivem Multi-User-Drittnutzer-Customer-Ship muss das geschlossen sein
- Defense-in-Depth-Versprechen ist asymmetrisch (UX-Layer ja, Server-Layer nein)
- Same-Team-RLS erlaubt Teamlead Schreib-Rechte auf eigene Team-Member-Daten → Same-Team-Bypass des Read-Only-UX-Versprechens

## Scope

### In Scope

- **Middleware-Pfad-Regex** `^\/team\/[^/]+\/` (Drilldown-Route) in `cockpit/src/middleware.ts`
- **Header-Set** `X-Read-Only-Mode: 1` per `NextResponse.headers.set()`
- **`assertNotReadOnlyContext()`-Erweiterung** in `cockpit/src/lib/auth/read-only-context.ts`: liest AsyncLocalStorage + `next/headers`-API parallel, throw bei beiden
- **Vitest-Mock-Test** RED-GREEN: Mock `headers().get('X-Read-Only-Mode') === '1'` → throws. Ohne Header + ohne AsyncLocalStorage → passes.
- **Playwright-MCP-Live-Smoke**: Teamlead loggt sich ein, navigiert auf `/team/<member-id>/pipeline`, oeffnet DevTools, fired Direct-Server-Action-Call `updateDeal({id, stage_id})` → Action wirft `ReadOnlyContextError`.
- **Negative-Test**: Cron-Pfade (`/api/cron/*`) bleiben unbeeinflusst — Middleware-Pfad-Regex matcht nicht.
- **Audit-Trail**: Wenn Server-Action im Read-Only-Context blockiert wird, `audit_log`-Eintrag `read_only_context_blocked` mit Pfad + Action-Name + User-ID fuer Forensik (analog V7-Patterns).

### Out of Scope

- Andere Read-Only-Routes ueber `/team/[user_id]/*` hinaus (z.B. `/admin/*` read-only-Views existieren nicht)
- Wechsel von `AsyncLocalStorage` auf reines Header-Pattern — beide laufen parallel als Defense-in-Depth
- Performance-Optimierung Middleware (Header-Set ist nanosecond-cheap)
- UI-Anpassungen an `/team/[user_id]/*` Pages (UX-Hide bleibt wie SLC-706)
- HOF-Wrapper-Variante (`withReadOnlyGuard()` Decorator fuer alle Server-Actions) — UI-Aspekt, ggf. V8+

## Acceptance Criteria

- **AC-1:** Vitest-Test `cockpit/src/lib/auth/__tests__/read-only-context.test.ts` (neu oder Erweiterung) hat RED-GREEN-Coverage:
  - Mock `headers().get('X-Read-Only-Mode') === '1'`, kein AsyncLocalStorage → `assertNotReadOnlyContext()` throws `ReadOnlyContextError`
  - Kein Header, kein AsyncLocalStorage → passes (kein throw)
  - AsyncLocalStorage gesetzt, kein Header → throws (bestehender SLC-706-Pfad)
  - Beide gesetzt → throws (Defense-in-Depth-Pruefung)
- **AC-2:** Middleware-Edit in `cockpit/src/middleware.ts`: Pfad-Regex `/^\/team\/[^/]+\//` matched `GET /team/abc-123/pipeline`, `POST /team/xyz-456/aktivitaeten` etc. Setzt `X-Read-Only-Mode: 1` in `NextResponse.headers`.
- **AC-3:** Middleware-Edit lasst `/api/cron/*`, `/api/health`, `/login`, `/settings/*` unveraendert (kein Header).
- **AC-4:** Vitest-Test fuer Middleware-Pfad-Matching: `pathname='/team/abc/pipeline'` → match; `pathname='/api/cron/automation-runner'` → kein match; `pathname='/settings/workflow-automation'` → kein match; `pathname='/team'` (ohne Sub-Pfad) → kein match.
- **AC-5:** Playwright-MCP-Live-Smoke aus Teamlead-Sicht via `reference_playwright_live_smoke_pattern`:
  - Login als Teamlead via Admin-API
  - Navigate `/team/<member-uuid>/pipeline`
  - DevTools: `fetch('/team/<member-uuid>/pipeline', {method:'POST', headers:{'Next-Action':'<id>',...}, body:'<deal-update-payload>'})`
  - Erwartung: Response-Status 500 oder 403, Server-Action wirft `ReadOnlyContextError`. Heute (Pre-V7.5) wuerde 200 + Mutation kommen.
  - Reset: getroffene Daten zuruecksetzen via Admin-Cleanup-API (Pattern aus `reference_playwright_browser_smoke`).
- **AC-6:** Audit-Trail: `audit_log` enthaelt nach AC-5-Reject einen `read_only_context_blocked`-Eintrag mit `actor_id=<teamlead-uuid>`, `path=/team/<member-uuid>/pipeline`, `attempted_action=<server-action-id>`.
- **AC-7:** `cockpit/src/lib/auth/read-only-context.ts:14-19` Kommentar wird angepasst: "ISSUE-066 closed in V7.5 — assertNotReadOnlyContext() reads AsyncLocalStorage + X-Read-Only-Mode header parallel."
- **AC-8:** `docs/KNOWN_ISSUES.md` ISSUE-066 Status → `resolved`, Resolved-Date gesetzt, Resolution-Notes inkl. AC-5 Live-Smoke-Reference.

## Dependencies

- **V7 SLC-704/706** (Drilldown-Read-Only-Context): bestehender AsyncLocalStorage-Pfad bleibt aktiv, Header-Pfad kommt zusaetzlich
- **V7.1 FEAT-713** (Defense-in-Depth Polish): bestehende 4 `assertNotReadOnlyContext()`-Aufrufer profitieren automatisch (kein zusaetzlicher Code-Change in Server-Actions)
- **Playwright-MCP** (V4.1+): Live-Smoke-Pattern aus `reference_playwright_live_smoke_pattern`
- **Next.js Middleware API**: Pattern aus bestehender `cockpit/src/middleware.ts` (Cookie-Refresh + Supabase-Session)

## Risks

- **Risk:** Middleware-Pfad-Regex zu eng/zu breit. **Mitigation:** Vitest-Tests fuer 6+ Pfad-Variationen, Live-Smoke vor Deploy.
- **Risk:** `next/headers`-API Server-Action-Context-Restriction. Falls `headers()` in Server-Action nicht aufrufbar (Edge-Case in Next.js App-Router), faellt der Header-Layer aus. **Mitigation:** Vitest dokumentiert das, Architecture klaert ob `cookies()`/`headers()` aus Server-Action zugaenglich sind.
- **Risk:** Cron-Endpoint-Side-Channel — falls ein zukuenftiger Cron-Endpoint Pfad-Pattern `/team/<id>/...` enthaelt, wuerde der Cron faelschlich read-only-gemacht. **Mitigation:** Pfad-Regex strict `/^\/team\/[^/]+\//`, Cron-Routes liegen unter `/api/cron/*`, kein Overlap.
- **Risk:** Performance-Overhead pro Drilldown-Request. **Mitigation:** Header-Set ist nanosecond, kein Bottleneck.

## Success Metric

Nach Deploy:
- Vitest-Test-Coverage: 4/4 RED-GREEN-Cases gruen
- Playwright-Live-Smoke: Direct-Server-Action-Call aus Drilldown-DevTools wird mit `ReadOnlyContextError` blockiert
- `audit_log` zeigt `read_only_context_blocked` bei Smoke-Test
- ISSUE-066 Status `resolved` in KNOWN_ISSUES.md

## References

- Backlog: BL-476 (neu, medium prio, V7.5)
- Issue: ISSUE-066 (V6.6-V7-Pre-Production-Compliance-Gap)
- SLC-706-Quellcode-Kommentar: `cockpit/src/lib/auth/read-only-context.ts:14-19`
- Strategaize-Pattern-Reuse: Next.js Middleware (Supabase-Session-Refresh), Playwright-MCP-Live-Smoke, `next/headers` API
- V7.1 FEAT-713 (Defense-in-Depth Polish, hat 4 first-line Guards eingefuehrt, profitieren von FEAT-752 ohne Code-Change)
