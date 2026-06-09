# FEAT-922 — V8.12 Cross-Repo-Polish-Patterns (Phase 2)

## Status
- Version: V8.12
- Status: planned
- Priority: Medium (NICE-TO-HAVE vor Customer-Live, NICHT blockierend)
- Created: 2026-06-09
- Source-of-Truth: [reports/RPT-607.md](../reports/RPT-607.md) Section 4 + 6

## Purpose

4 Cross-Repo-Security-Audit-Patterns BS-seitig einrichten — Pattern-Lib-Charakter fuer Dev-System-Reuse. Identische Patterns existieren oder werden parallel in OP V9.x+ und IS V4.x+ gebaut.

## Scope

4 Patterns, Reihenfolge klein→gross:

### BL-503 Logger-Redaction-Layer
- `cockpit/src/lib/logger/redact.ts` mit `redactSecrets(obj, opts?)`
- Wrapper `logSafe(level, ...args)`
- Default-Keys (DEC-280): 10 Security + 2 PII = 12 Keys
- Migration: 10-15 critical Files

### BL-502 Passwort-Policy 12+ + zxcvbn
- `cockpit/src/lib/auth/password-policy.ts`
- Mindestlaenge 12 + zxcvbn>=3 (DEC-282)
- Caller-Edit: set-password/actions.ts + accept-invitation/actions.ts
- Scope (DEC-278): nur neue Passwoerter
- UI-Visual-Indicator (Tailwind Progress-Bar)
- Dynamic-Import wegen zxcvbn-Bundle-Size (R-V812-3)

### BL-504 LLM-Cost-Cap (Pro-Tenant DAILY+MONTHLY)
- Pre-flight in `cockpit/src/lib/ai/bedrock-client.ts queryLLM()`
- Granularitaet (DEC-281): Pro-Tenant via ai_cost_ledger.tenant_id
- Defaults (DEC-281): 25 EUR DAILY / 500 EUR MONTHLY
- Hard-Cap throw + Cron/Job-Status=failed
- Cap-Hit-Alert via Sentry (DEC-283)
- In-Memory-Cache 1min TTL fuer Performance (R-V812-4)

### BL-501 CSP-Headers (iterativ)
- `cockpit/next.config.ts` Header-Block
- Phase-A 1-2 Wo Report-Only (DEC-279)
- report-uri = Sentry-CSP-Integration (DEC-279)
- Phase-B strict nach Inline-Scripts-Inventur
- Whitelist initial: script-src + img-src + connect-src + style-src + frame-ancestors

## Backlog-Items (Existing)

- BL-501 → in_progress
- BL-502 → in_progress
- BL-503 → in_progress
- BL-504 → in_progress

## Acceptance Criteria

- AC-922-1 (Logger): logSafe() in mind. 10 critical Files eingesetzt, redact-Vitest GREEN
- AC-922-2 (Passwort): Mindestlaenge 12 + zxcvbn>=3 enforced, Vitest GREEN, UI-Visual-Indicator funktional
- AC-922-3 (Cost-Cap): Pre-flight-Check vor jedem Bedrock-Call, Hard-Cap throw, Vitest GREEN
- AC-922-4 (CSP): Phase-A Report-Only deployed, Phase-B strict ohne Violations auf 80+ Pages
- AC-922-5: TSC=0, ESLint=0, Full-Vitest-Suite GREEN nach jedem Sub-Slice

## Constraints

- Pattern-Reuse Cross-Repo: ImSch + IS pruefen vor jedem Sub-Slice
- 0 Schema-Migration
- 0 neue npm-Major-Upgrades (additive: zxcvbn)
- Dev-System-Pattern-Library-Eintraege fuer Logger-Redaction + Passwort-Policy

## Out of Scope

- Cross-Repo-Mirror auf OP+IS (separate Slots in OP V9.x+ + IS V4.x+)
- Slack-Webhook fuer Cost-Cap-Alerts (DEC-283: Sentry-Dashboard reicht)
- Custom CSP-Endpoint (DEC-279: Sentry-Integration)
- Multi-Tenant-Cost-Cap-Tabelle (DEC-281: ENV-Default reicht V8.12, Tabelle ist Post-V8.12)

## Sub-Slices (geplant)

- SLC-9X3 BL-503 Logger-Redaction
- SLC-9X4 BL-502 Passwort-Policy
- SLC-9X5 BL-504 LLM-Cost-Cap
- SLC-9X6 BL-501 CSP-Headers (Phase-A + Phase-B in 2 Iterationen)

Reihenfolge klein→gross fuer schnelle Sub-Wins. Entscheidung Bundle vs separat: OQ-V812-slice-2 in /slice-planning.

## Dependencies

- Phase 1 FEAT-921 fertig (Code-Layer sauber bevor Polish drauf kommt)
- Sentry-Project ready aus FEAT-923 fuer DEC-279 + DEC-283 Integration (kann parallel laufen, aber CSP-report-uri + Cost-Cap-Alert brauchen Sentry-DSN)
