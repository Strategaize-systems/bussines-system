# SLC-911 — V8.12 Sentry-Observability (Phase 3, FEAT-923)

## Status

- Version: V8.12
- Feature: FEAT-923
- Backlog: BL-514
- Status: planned
- Priority: Medium
- Created: 2026-06-09

## Purpose

Sentry.io EU-Region Frankfurt fuer BS-Cockpit einrichten — Error-Monitoring + Performance-Tracing-Baseline. Schliesst L-1 aus RPT-599 (Observability-Gap).

**Pre-Cond fuer SLC-909 Cost-Cap-Alert (Sentry.captureMessage) + SLC-910 CSP-Headers report-uri-Integration.**

Pattern-Reuse aus ImSch SLC-330 (~70-80% byte-identisch — siehe DEC-277).

## In Scope

- `cockpit/sentry.server.config.ts` (Node-Runtime Init, SENTRY_DSN)
- `cockpit/sentry.client.config.ts` (Browser Init, NEXT_PUBLIC_SENTRY_DSN)
- `cockpit/sentry.edge.config.ts` (Edge-Runtime Init)
- `cockpit/src/instrumentation.ts` (Next.js 15+ Hook fuer Server-Side-Loading)
- `cockpit/src/lib/monitoring/sentry.ts` Wrapper (captureException, captureMessage, isSentryEnabled)
- `cockpit/src/app/global-error.tsx` Caller-Site fuer captureException
- `cockpit/src/app/api/_debug/throw/route.ts` Test-Error-Endpoint (AC-911-2)
- beforeSend-Hook in allen 3 Configs nutzt `redactSecrets()` aus SLC-907
- @sentry/nextjs npm-Dep installiert (^8.x)

## Coolify-ENVs (Founder-Pre-Step)

```
SENTRY_DSN=https://<key>@<orgId>.ingest.de.sentry.io/<projectId>
NEXT_PUBLIC_SENTRY_DSN=<gleiche-DSN-oder-separat>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Out of Scope

- Sentry-Custom-Dashboards (Default reicht V8.12)
- Performance-Monitoring jenseits Trace-Sampling (V8.x-Polish-Slot)
- Cross-Repo-Mirror OP+IS (separate Slots)
- Worker-Container-Integration (V8.x-Polish-Slot — BS hat aktuell keinen separaten Worker)
- Distributed-Tracing (V8.x-Polish-Slot)

## Acceptance Criteria

- AC-911-1: Sentry-Project Frankfurt eingerichtet (Founder-Pre-Step), DSN in Coolify-ENV
- AC-911-2: `GET /api/_debug/throw` triggert Test-Error, sichtbar in Sentry-Dashboard innerhalb 1min
- AC-911-3: beforeSend-Hook redactet `event.extra`, `event.contexts`, `event.tags`, `event.user.email` via `redactSecrets()`
- AC-911-4: `sendDefaultPii: false` in allen 3 Configs (R-V812-5 DSGVO)
- AC-911-5: `tracesSampleRate: 0.1` in allen 3 Configs (R-V812-6 Cost-Control)
- AC-911-6: TSC=0, ESLint=0, Vitest GREEN
- AC-911-7: Vitest Mock-Sentry-Init + Test fuer beforeSend-Redact-Integration (mind. 3 Test-Cases)
- AC-911-8: Ohne SENTRY_DSN-ENV laeuft App ohne Crash (self-warned)

## Risks

- **R-911-1**: Sentry-Cost-Spike bei Error-Burst — **Mitigation**: tracesSampleRate=0.1 + Sentry-Rate-Limit pro Issue-Type (Sentry-Default)
- **R-911-2**: User-IP-Default in Sentry-Events = DSGVO-Risk — **Mitigation**: `sendDefaultPii: false` in allen 3 Configs
- **R-911-3**: Sentry-DSN-Leak via Client-Bundle-Inspector — **Mitigation**: DSN ist designed-public (Sentry-Doc), kein Secret. Trotzdem nur Project-DSN (kein org-Auth)

## Dependencies

- SLC-907 done (redactSecrets fuer beforeSend-Hook)
- DEC-277 (Sentry.io EU) ✓
- **Founder-Pre-Step:** Sentry-Account anlegen + EU-Project Frankfurt + DPA unterzeichnen + DSN in Coolify-ENV (~15min, kein Slice-Aufwand)

## Micro-Tasks

### MT-1: @sentry/nextjs Installation + 3 Config-Files
- Goal: npm install + 3 Sentry-Config-Files mit minimal-Setup
- Files:
  - `cockpit/package.json` (+ @sentry/nextjs ^8.x)
  - `cockpit/sentry.server.config.ts` (NEW)
  - `cockpit/sentry.client.config.ts` (NEW)
  - `cockpit/sentry.edge.config.ts` (NEW)
- Expected: 3 Configs mit identischer Sentry.init() Struktur, DSN aus jeweiliger ENV, sendDefaultPii: false, tracesSampleRate: 0.1
- Verification: TSC=0, App startet ohne SENTRY_DSN (self-warned)
- Dependencies: SLC-907 done

### MT-2: instrumentation.ts + Wrapper
- Goal: Next.js 15+ instrumentation-Hook + `src/lib/monitoring/sentry.ts` Wrapper
- Files:
  - `cockpit/src/instrumentation.ts` (NEW)
  - `cockpit/src/lib/monitoring/sentry.ts` (NEW)
  - `cockpit/src/lib/monitoring/__tests__/sentry.test.ts` (NEW)
- Expected: instrumentation.register() laedt sentry.server.config bei NEXT_RUNTIME=nodejs. Wrapper exportiert captureException, captureMessage, isSentryEnabled
- Verification: Vitest 3+ Test-Cases (Wrapper-Surface)
- Dependencies: MT-1

### MT-3: beforeSend-Hook + Redact-Integration
- Goal: beforeSend(event) in allen 3 Configs ruft `redactSentryEvent(event)` Helper, der `redactSecrets()` aus SLC-907 nutzt
- Files:
  - `cockpit/src/lib/monitoring/redact-event.ts` (NEW, Helper)
  - `cockpit/src/lib/monitoring/__tests__/redact-event.test.ts` (NEW)
  - 3 Config-Files (Edit: beforeSend-Hook ergaenzen)
- Expected: event.extra/contexts/tags/user.email durchlaufen redactSecrets, alle Secret-Keys redacted
- Verification: Vitest mind. 3 Test-Cases (event.extra.password redact, event.user.email redact, no-op bei leerem Event)
- Dependencies: MT-2, SLC-907 MT-1

### MT-4: global-error.tsx Caller-Site
- Goal: `app/global-error.tsx` ruft `captureException(error)` via Wrapper
- Files: `cockpit/src/app/global-error.tsx` (Edit oder NEW)
- Expected: Uncaught React-Errors landen in Sentry
- Verification: TSC=0, Code-Review
- Dependencies: MT-2

### MT-5: Test-Error-Endpoint /api/_debug/throw
- Goal: GET-Endpoint der `throw new Error("Sentry-Smoke-Test V8.12")` macht
- Files: `cockpit/src/app/api/_debug/throw/route.ts` (NEW)
- Expected: GET zeigt 500, Sentry-Event in Dashboard < 1min
- Verification: AC-911-2 Live-Smoke-Pfad
- Dependencies: MT-1..MT-4

### MT-6: Coolify-ENV-Setup + Live-Smoke (Founder-Step)
- Goal: SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN + SENTRY_ENVIRONMENT in Coolify-Production-ENV
- Files: keine Code-Aenderung (Founder-UI-Step)
- Expected: Post-Deploy GET `https://business.strategaizetransition.com/api/_debug/throw` → Sentry-Dashboard zeigt Event
- Verification: AC-911-2 PASS
- Dependencies: MT-5, Founder-Sentry-Account ready

## Pattern-Reuse

- ImSch SLC-330 `sentry.{server,client,edge}.config.ts` (~70-80% byte-identisch, nur DSN-ENV-Namen-Anpassung)
- ImSch SLC-330 `src/lib/monitoring/sentry.ts` Wrapper-Pattern (1:1 portierbar)
- ImSch SLC-330 `src/app/global-error.tsx` Caller-Pattern

## Done-Gate

- Sentry-Dashboard zeigt mind. 1 Test-Event aus `/api/_debug/throw` post-Deploy
- Vitest mind. 6+ neue GREEN-Tests (Wrapper + redact-event)
- TSC=0, ESLint=0
- @sentry/nextjs ist in package.json + package-lock.json gecaptured

## Aufwand

~1.5-2h Code-Side + ~0.5h /qa = ~2-2.5h. **Single-Session-machbar** (Founder-Pre-Step Sentry-Account separat ~15min vor Slice-Start).
