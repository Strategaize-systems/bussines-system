# SLC-910 — V8.12 CSP-Headers iterativ (BL-501, Phase 2.4)

## Status

- Version: V8.12
- Feature: FEAT-922
- Backlog: BL-501
- Status: in_progress
- Priority: Medium
- Created: 2026-06-09

> **Phase-A Code DONE 2026-06-10 (RPT-619, /backend):** MT-1 (csp.ts + 7 Vitest), MT-2 (next.config Report-Only + 6 Security-Header), MT-3 (csp-check.mjs Probe) abgeschlossen. TSC=0, ESLint=0, Vitest 1390/1390, curl -I verifiziert alle 6 Header. **OFFEN:** MT-4 (Deploy + 1-2 Wo Burn-In + Sentry-Iter-Fix), MT-5 (Phase-B strict-Switch), MT-6 (Live-Smoke 5 Routes). `@playwright/test` devDep noch nicht installiert (erst vor MT-5/MT-6 noetig). Founder-TODO: `SENTRY_CSP_REPORT_URI` in Coolify auf Sentry-Security-Endpoint setzen, sonst Phase-A-Violations nur browser-console-lokal.

## Purpose

Content-Security-Policy + Permissions-Policy in `next.config.ts` einrichten — Defense-in-Depth gegen XSS + Inline-Script-Injection + Clickjacking. Iterativ Phase-A Report-Only (1-2 Wochen Burn-In + Iter-Fix) → Phase-B strict.

Pattern-Reuse ImSch SLC-331 csp-allowlist.ts (~30-50% Struktur, Domain-Liste BS-spezifisch).

## In Scope

- `cockpit/src/lib/security/csp.ts` — `buildCSP(supabaseKongUrl)` pure function + `PERMISSIONS_POLICY` const
- `cockpit/next.config.ts` — `headers()` async function ergaenzt
- Phase-A: `Content-Security-Policy-Report-Only` Header (1-2 Wochen Burn-In)
- Phase-B: `Content-Security-Policy` strict (nach Inline-Script-Inventur via Sentry-Report-uri)
- `report-uri` zeigt auf Sentry-DSN-CSP-Endpoint (DEC-279)
- `tests/_probe/csp-check.mjs` Pflicht-Probe per `security-headers-live-smoke.md`
- Vitest fuer csp.ts Pure-Function

## CSP-Whitelist (initial)

```typescript
default-src 'self'
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'
  // 'unsafe-inline' Pflicht fuer Next.js 15+ RSC-inline-Scripts
  // Lehre aus ImSch V3.3 Live-Smoke 2026-06-08 (15min Production-Outage)
  // Migration zu Nonce-CSP via Middleware = V8.x-Post-Slot
connect-src 'self' https://*.sentry.io <NEXT_PUBLIC_SUPABASE_URL> https://bedrock-runtime.eu-central-1.amazonaws.com
img-src 'self' data: blob:
style-src 'self' 'unsafe-inline'  // Tailwind-Generated
font-src 'self'
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

```typescript
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
```

## Out of Scope

- Nonce-CSP via Middleware (V8.x-Post-Slot, Next.js 15+ braucht middleware-script-nonce-Strategy)
- CSP fuer Worker-Container (Worker hat keine HTTP-Surface)
- Custom CSP-Report-Aggregator (DEC-279: Sentry uebernimmt)
- Cross-Repo-Mirror OP+IS (separate Slots, koennen csp.ts portieren)

## Acceptance Criteria

- AC-910-1: `buildCSP(url)` returnt korrekt-formattierte CSP-Header-String mit allen 9 Direktiven
- AC-910-2: Vitest Pure-Function (mind. 4 Test-Cases: empty url, valid url, special-chars-url, Permissions-Policy const)
- AC-910-3: `next.config.ts headers()` setzt `Content-Security-Policy-Report-Only` + `Permissions-Policy` auf alle Routes
- AC-910-4 (Phase-A Live): Deploy + 1 Woche Burn-In + Sentry-Dashboard zeigt CSP-Violations als Issues (sobald BL-503-Integration via SLC-911 beforeSend live)
- AC-910-5 (Phase-B Iter-Fix): Inline-Script-Inventur via Sentry-Issues + iterativ-fixen (vermutlich 3-5 Iterationen per ImSch-Lehre)
- AC-910-6 (Phase-B Live): Switch `Content-Security-Policy-Report-Only` → `Content-Security-Policy` strict, Pflicht-Probe `tests/_probe/csp-check.mjs` PASS (0 CSP-Errors + hasReactProps + hasReactFiber + onSubmitAttached)
- AC-910-7: Live-Smoke mind. 5 Routes (Root + Login + Cockpit-Dashboard + Settings + 1 KI-Workspace) ohne CSP-Violation
- AC-910-8: TSC=0, ESLint=0, Vitest GREEN

## Risks

- **R-910-1 (R-V812-2)**: CSP strict-Phase breaks 80+ Pages — **Mitigation**: Phase-A Report-Only 1-2 Wo + Iter-Fix-Cycle + Pflicht-Probe
- **R-910-2**: Inline-Scripts/Styles bei Tailwind-Build verzaehlbar — **Akzeptiert**: `'unsafe-inline'` fuer script-src + style-src bis Nonce-CSP-Migration (V8.x-Post-Slot)
- **R-910-3**: Permissions-Policy lockdown bricht Camera-Features (z.B. KI-Workspace Voice) — **Mitigation**: V8.12 hat keine Camera/Microphone-Features. Wenn V8.x Voice/Whisper braucht, Permissions-Policy erweitern.

## Dependencies

- DEC-279 (Report-Only → strict + Sentry report-uri) ✓
- SLC-911 done (Sentry-DSN verfuegbar fuer report-uri)
- `tests/_probe/csp-check.mjs` Pattern-Reuse aus `security-headers-live-smoke.md`

## Micro-Tasks

### MT-1: csp.ts Pure-Function + Vitest
- Goal: `buildCSP(supabaseKongUrl)` + `PERMISSIONS_POLICY` const
- Files: `cockpit/src/lib/security/csp.ts` (NEW), `cockpit/src/lib/security/__tests__/csp.test.ts` (NEW)
- Expected: Pure function, 9 Direktiven, Sentry-Domain Wildcard, Bedrock-eu-central, Supabase-Kong-URL aus Param
- Verification: Vitest 4+ Test-Cases (empty/valid/special-chars/permissions-const) GREEN
- Dependencies: none

### MT-2: next.config.ts headers() integrieren (Phase-A Report-Only)
- Goal: `headers()` async returnt CSP-Report-Only + Permissions-Policy + Strict-Transport-Security + Standard-Security-Headers
- Files: `cockpit/next.config.ts` (Edit)
- Expected: Phase-A Header-Name `Content-Security-Policy-Report-Only`, report-uri zeigt auf `<SENTRY_DSN>` (CSP-Integration)
- Verification: TSC=0, Local-Curl `curl -I http://localhost:3000` zeigt Headers
- Dependencies: MT-1, SLC-911 (Sentry-DSN-ENV)

### MT-3: tests/_probe/csp-check.mjs portieren
- Goal: Playwright + Console-Listener + React-Fiber-Check Probe-Tool fuer BS
- Files: `tests/_probe/csp-check.mjs` (NEW, Pattern aus ImSch SLC-331)
- Expected: Zero-Dep Node-Script, exit=0 wenn 0 CSP-Errors + hasReactProps + hasReactFiber + onSubmitAttached
- Verification: Local-Test gegen http://localhost:3000 PASS
- Dependencies: MT-2
- npm-Note: `@playwright/test` ist evtl. nicht installiert — falls noetig devDep ergaenzen

### MT-4: Phase-A Deploy + 1 Woche Burn-In + Sentry-Iter-Fix
- Goal: Phase-A Report-Only deployen, Sentry-Issues monitoren, Inline-Script-Inventur durchfuehren, ggf. iter-fix
- Files: keine Code-Aenderung (Operational-Step)
- Expected: Sentry-Dashboard zeigt CSP-Violations als Issues. Sortieren nach Top-Violations und prufen ob Domain whitelist-baren ist oder Inline-Script entfernen
- Verification: Founder-Operational-Review nach 1 Woche
- Dependencies: MT-2 deployed
- Dauer: ~1-2 Wochen Burn-In, evtl. 3-5 Code-Iter-Fixes (`csp.ts` Whitelist erweitern oder Inline-Script entfernen)

### MT-5: Phase-B Switch zu strict
- Goal: Header-Name `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (kein -Report-Only-Suffix)
- Files: `cockpit/next.config.ts` (Edit)
- Expected: Strict-Mode live, CSP-Violations werden geblockt (nicht nur gemeldet)
- Verification: AC-910-6 Pflicht-Probe `tests/_probe/csp-check.mjs` PASS
- Dependencies: MT-4 abgeschlossen (Iter-Fix-Cycle done)

### MT-6: Live-Smoke 5 Routes + Records-Sync
- Goal: Post-Deploy Live-Smoke + KNOWN_ISSUES bereinigen
- Files: `qa/SLC-910-csp-live-smoke.md` (NEW)
- Expected: 5 Routes ohne CSP-Errors + Probe-Output dokumentiert
- Verification: AC-910-7 PASS
- Dependencies: MT-5 deployed

## Pattern-Reuse

- ImSch SLC-331 `src/lib/security/csp-allowlist.ts` (~30-50% Struktur, Domain-Liste BS-spezifisch)
- `tests/_probe/csp-check.mjs` Pattern aus `security-headers-live-smoke.md` (100% Tool-Reuse, Path-Adapter)

## Done-Gate

- Phase-A Report-Only mind. 1 Woche live ohne ungeloeste CSP-Issues
- Phase-B strict live + Probe `tests/_probe/csp-check.mjs` PASS
- 0 Production-Page-Breaks durch CSP
- Vitest GREEN (csp.ts Pure-Function)

## Aufwand

~2-3h Code (MT-1+MT-2+MT-3) + 1-2 Wochen Phase-A Burn-In + 1-2h Iter-Fixes + ~1h Phase-B Switch + Live-Smoke + Probe = **~4-6h aktive Arbeit ueber 2-3 Sessions, 1-2 Wochen Elapsed-Time** (Burn-In passiv).

**Iter-Fix-Sessions sind klein (~30min pro Iter), koennen parallel zu anderen V8.x-Sessions laufen.**
