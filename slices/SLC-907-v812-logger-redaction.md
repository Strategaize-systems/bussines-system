# SLC-907 — V8.12 Logger-Redaction-Layer (BL-503, Phase 2.1)

## Status

- Version: V8.12
- Feature: FEAT-922
- Backlog: BL-503
- Status: planned
- Priority: Medium
- Created: 2026-06-09

## Purpose

Strategaize-Cross-Repo-Origin-Pattern: `redactSecrets(obj, opts?)` pure Function + top-level `logSafe(level, ...args)` Wrapper. Schliesst Sicherheitsluecke aus Cross-Repo-Audit (Secret-Keys koennen via unstrukturiertem console-Log in Coolify-Container-Logs landen).

Pattern-Entscheidung per DEC-286: Top-Level-Wrapper (kein console.* drop-in) — explicit Caller-Site-Migration via grep-traceability.

**Pre-Cond fuer SLC-911 Sentry-beforeSend-Hook-Integration.**

## In Scope

- `cockpit/src/lib/logger/redact.ts` — pure function `redactSecrets(obj, opts?)` + `DEFAULT_REDACT_KEYS` Konstante (12 Keys per DEC-280)
- `cockpit/src/lib/logger/index.ts` — top-level wrapper `logSafe(level, ...args)`
- 10-15 critical Caller-Sites migriert (cron-loops, webhook-handlers, bedrock-client.ts, audit.ts central, send-action.ts mit Email-Daten)
- Vitest Mock-Patterns fuer Redact (Email/Token/Secret/Customer-Name)

## DEFAULT_REDACT_KEYS (DEC-280)

```
Security (10): password, token, secret, api_key, authorization,
               cookie, session, jwt, refresh_token, access_token
PII (2):       email, phone
```

Erweiterbar via `opts.extraKeys`. Replacement-Value default `'[REDACTED]'`, ueberschreibbar via `opts.replacementValue`.

## Out of Scope

- Massen-Migration aller console.* Calls (Surgical-Changes-Rule, nur 10-15 critical Files)
- Strict-Liste mit Business-Identifiers (iban/vat_id/full_name) (DEC-280 abgelehnt)
- Cross-Repo-Mirror auf OP+IS (separate Slots)

## Acceptance Criteria

- AC-907-1: `redactSecrets({password: 'x', email: 'y'})` returnt `{password: '[REDACTED]', email: '[REDACTED]'}`
- AC-907-2: `redactSecrets()` ist deep-recursive (Nested-Objects)
- AC-907-3: `redactSecrets(obj, {extraKeys: ['custom_key']})` redactet zusaetzlich
- AC-907-4: `logSafe('info', 'msg', {password: 'x'})` ruft `console.info('msg', {password: '[REDACTED]'})`
- AC-907-5: 10+ Caller-Sites in critical Files migriert (grep `logSafe(` zeigt mind. 10 Treffer)
- AC-907-6: TSC=0, ESLint=0, Vitest GREEN
- AC-907-7: `redactSecrets` ist als Named Export verfuegbar fuer SLC-911 Sentry-beforeSend-Hook-Reuse

## Risks

- **R-907-1**: Deep-Recursion bei zirkulaeren Referenzen (z.B. Next.js-Request-Objects) — **Mitigation**: WeakSet-Tracking fuer visited refs, Max-Depth-Guard
- **R-907-2**: Caller-Migration uebersieht Files — **Mitigation**: MT-3 explicit Migrations-Liste mit grep-Audit

## Dependencies

- DEC-280 (12 Default-Keys) ✓
- DEC-286 (Top-Level Wrapper) ✓

## Micro-Tasks

### MT-1: redact.ts Pure-Function
- Goal: `redactSecrets(obj, opts?)` + `DEFAULT_REDACT_KEYS` Konstante
- Files: `cockpit/src/lib/logger/redact.ts`, `cockpit/src/lib/logger/__tests__/redact.test.ts`
- Expected: Deep-recursive redaction, WeakSet fuer zirkulaere Refs, Max-Depth=10
- Verification: Vitest GREEN (mind. 8 Test-Cases: flat/nested/array/circular/extraKeys/customReplacement/maxDepth/null)
- Dependencies: none

### MT-2: logSafe Wrapper
- Goal: `logSafe(level, ...args)` top-level wrapper, leitet auf `console[level]` mit redact-Applied
- Files: `cockpit/src/lib/logger/index.ts`, `cockpit/src/lib/logger/__tests__/index.test.ts`
- Expected: Levels `info`/`warn`/`error`/`debug` unterstuetzt, leeres args[] sicher
- Verification: Vitest GREEN, Mock-Patterns auf `console.info` etc.
- Dependencies: MT-1

### MT-3: Caller-Migrations-Liste + Migration in 10+ critical Files
- Goal: 10-15 critical Files identifizieren + console.* zu logSafe() migrieren
- Files (initial Kandidaten):
  - `cockpit/src/lib/ai/bedrock-client.ts`
  - `cockpit/src/lib/audit.ts` (central audit-helper)
  - `cockpit/src/app/api/cron/**` (3-5 cron-loop-Files)
  - `cockpit/src/app/api/webhooks/**` (1-3 webhook-handlers)
  - `cockpit/src/lib/actions/send-action.ts` (email-Daten)
  - `cockpit/src/lib/email/**` (1-2 Files)
- Expected: grep `logSafe(` zeigt mind. 10 Caller-Sites, alte console.* in diesen Files entfernt
- Verification: TSC=0, ESLint=0, Full-Vitest-Suite GREEN
- Dependencies: MT-1, MT-2

### MT-4: Records-Sync
- Goal: SKILL_IMPROVEMENTS Cross-Repo-Pattern-Eintrag (BS V8.12 Origin) ergaenzen
- Files: `docs/SKILL_IMPROVEMENTS.md` (BS), evtl. Cross-Repo-Notiz fuer Dev-System
- Expected: IMP-Eintrag dokumentiert dass Logger-Redaction Cross-Repo-Pattern-Origin ist (Reuse fuer OP/IS/ImSch)
- Verification: Eintrag vorhanden
- Dependencies: MT-1..MT-3

## Pattern-Reuse

- Keine — BS V8.12 ist Origin (per RPT-608 Pattern-Reuse-Audit)
- Pattern wird Cross-Repo-Reuse-Quelle fuer OP V9.x+ + IS V4.x+ + ImSch V3.x+

## Done-Gate

- `grep -rE "logSafe\(" cockpit/src/` zeigt mind. 10 Treffer
- `redactSecrets` exportiert via `cockpit/src/lib/logger/redact.ts` named export (fuer SLC-911 Sentry-beforeSend-Reuse)
- Vitest jsdom Full-Suite GREEN (+8 neue Tests MT-1 + ~4 neue MT-2 = +12 GREEN-Delta)

## Aufwand

~1.5-2h Code-Side + ~0.5h /qa = ~2-2.5h. **Single-Session-machbar.**
