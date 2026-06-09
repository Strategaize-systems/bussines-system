# FEAT-923 — V8.12 Sentry-Observability (Phase 3)

## Status
- Version: V8.12
- Status: planned
- Priority: Medium (Observability-Baseline)
- Created: 2026-06-09
- Source-of-Truth: [reports/RPT-607.md](../reports/RPT-607.md) Section 4 + 6

## Purpose

Sentry.io EU-Region Frankfurt fuer BS-Cockpit + Worker einrichten. Aggregiert Production-Errors + CSP-Violations + Cost-Cap-Alerts in 1 Dashboard. Schliesst L-1 aus RPT-599 (Observability-Gap) und ist Grundvoraussetzung fuer DEC-279 (CSP-report-uri-Integration) und DEC-283 (Cost-Cap-Alert).

## Scope

- Sentry.io Team-Plan EU-Region Frankfurt (DEC-277, DPA-konform)
- `@sentry/nextjs` Setup in cockpit
- Coolify-ENVs:
  - SENTRY_DSN
  - SENTRY_ENVIRONMENT (production / development)
  - SENTRY_TRACES_SAMPLE_RATE (default 0.1)
- Init in `cockpit/src/instrumentation.ts` (Next.js 15+ instrumentation hook)
- Integration mit BL-503 Logger-Redaction (beforeSend-Hook entfernt Secrets aus Sentry-Events)
- CSP-Endpoint integriert (DEC-279)
- DSGVO-Posture: `sendDefaultPii: false` (DEC-277 + R-V812-5)

## Backlog-Items

- BL-514 V8.12 Sentry-Setup EU-Region (NEU)

## Acceptance Criteria

- AC-923-1: Sentry-Project Frankfurt eingerichtet, DSN in Coolify-ENV
- AC-923-2: Test-Error (`/api/_debug/throw`) wird in Sentry-Dashboard sichtbar
- AC-923-3: CSP-Violations werden in Sentry-Dashboard sichtbar (sobald BL-501 Phase-A live)
- AC-923-4: beforeSend-Hook integriert mit BL-503 Logger-Redaction (Vitest verifiziert: keine Secret-Keys in Sentry-Events)
- AC-923-5: TSC=0, ESLint=0, Full-Vitest-Suite GREEN
- AC-923-6: SENTRY_TRACES_SAMPLE_RATE=0.1 + Rate-Limit pro Issue-Type aktiv (Cost-Control gegen R-V812-6)

## Constraints

- EU-Region Pflicht per `data-residency.md` (Sentry.io eu.sentry.io Endpoint)
- DPA mit Sentry abschliessen (Founder-Action)
- Pattern-Reuse von ImSch V3.3 IMP-1086 + IS V3.5-Pattern wenn vorhanden
- 0 Schema-Migration
- 1 neue npm dependency: @sentry/nextjs

## Out of Scope

- Sentry Cross-Repo-Mirror auf OP+IS (separate Slots)
- Sentry-Custom-Dashboards (Default-Dashboards reichen V8.12)
- Performance-Monitoring jenseits Trace-Sampling (Performance-Tab nice-to-have, kein Pflicht-Scope)
- Distributed-Tracing-Integration zwischen Cockpit + Worker (V8.x-Polish-Slot)

## Sub-Slices (geplant)

- SLC-9X7 BL-514 Sentry-Setup + Worker-Integration + CSP-Endpoint + Redact-beforeSend (1 Bundle-Slice mit ~5-6 MTs)

## Dependencies

- Sentry.io Account erstellt + Project EU-Region eingerichtet (Founder-Pre-Step ~10min vor /backend)
- BL-503 Logger-Redaction (FEAT-922) fuer beforeSend-Hook-Integration
- DSN-Wert in Coolify ENV gesetzt (Founder-Pre-Step)

## Parallel-Ausfuehrung-Hinweis

FEAT-923 kann teilweise parallel zu FEAT-922 laufen — Sentry-Project + DSN-Setup ist Pre-Step ohne Code-Aenderung, kann Pre-Phase-1 erfolgen. Code-Wiring (beforeSend + CSP-Endpoint) braucht aber FEAT-922 BL-503 Logger-Redaction als Pre-Cond.
