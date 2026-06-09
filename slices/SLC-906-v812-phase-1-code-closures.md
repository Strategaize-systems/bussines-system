# SLC-906 — V8.12 Phase 1 Code-Layer-Closures Bundle (7 Server-Actions)

## Status

- Version: V8.12
- Feature: FEAT-921
- Backlog: BL-513
- Status: planned
- Priority: High
- Created: 2026-06-09

## Purpose

Schliesst 7 Defense-in-Depth-Gaps die V8.11 bewusst akzeptiert hat: `createAdminClient` ohne is_admin()-Pre-Check in Server-Actions. DB-Layer-RLS bleibt aktive Second-Line-of-Defense, V8.12 macht die Code-Layer dazu mind. genauso eng. Bundle als 1 Slice mit 7 MTs weil Pattern-Reuse 100% gleich (`assertRole(["admin"])`) ueber alle Files.

Pattern-Reuse-Entscheidung per DEC-285: kein neuer `assertAdmin()`-Helper, existing `assertRole(["admin"])` aus `cockpit/src/lib/auth/assert-role.ts` 1:1 importieren. Production-erprobt seit V5+ (verifiziert in customer-dse/actions.ts).

## In Scope

7 Closures gemaess ARCHITECTURE.md V8.12-Section "Phase 1":

| MT | Issue | File | Klasse | Pattern |
|---|---|---|---|---|
| MT-1 | ISSUE-090 | `cockpit/src/lib/actions/products-actions.ts` | B | `await assertRole(["admin"])` vor createAdminClient |
| MT-2 | ISSUE-091 | `cockpit/src/lib/actions/deal-products-actions.ts` | C | `await assertRole(["admin"])` ODER User-Client-Switch |
| MT-3 | ISSUE-092 | `cockpit/src/lib/actions/send-action.ts` (email_attachments-Bulk) | C | User-Client SELECT+INSERT, Admin nur Storage-Cleanup |
| MT-4 | ISSUE-093 | `cockpit/src/lib/actions/insight-actions.ts` (ai_action_queue + ai_feedback) | C | `await assertRole(["admin"])` |
| MT-5 | ISSUE-094 | `cockpit/src/lib/actions/document-actions.ts` | C | User-Client SELECT+INSERT |
| MT-6 | SLC-901 M-1 | `cockpit/src/lib/actions/{goals,kpi-snapshots,activity-kpis}-actions.ts` | A | `await assertRole(["admin"])` (admin-only-write) |
| MT-7 | SLC-905 D-905-4 | `cockpit/src/lib/knowledge/search.ts` | D | Caller-Mode-Switch: User-Client wenn auth.uid() set, Admin nur Cron |

## Out of Scope

- Neue Helper-Function `assertAdmin()` (per DEC-285 nicht noetig)
- DB-Layer-Policy-Aenderungen (V8.11 abgeschlossen)
- UI-Komponenten-Aenderungen
- Schema-Migration

## Acceptance Criteria

- AC-906-1: 7 Issues in `docs/KNOWN_ISSUES.md` auf `Status: resolved` mit Resolution-Note
- AC-906-2: Vitest Mock-Pattern fuer Role-Check (assertRole-Mock) in jeder geaenderten Server-Action
- AC-906-3: grep-Audit `createAdminClient` in `cockpit/src/lib/actions/**` zeigt 0 Treffer ohne vorgelagerten `assertRole(["admin"])` (oder User-Client-Switch-Begruendung im Code-Kommentar)
- AC-906-4: TSC=0, ESLint=0
- AC-906-5: Full-Vitest-Suite jsdom GREEN post-Slice
- AC-906-6: Live-Smoke (post-Deploy) 7 UI-Pfade mit member-Role → 403/Redirect bzw. RLS-Block (R-V812-1 Mitigation)

## Risks

- **R-906-1**: UI-Regression wenn Admin-only-Feature an Member sichtbar war via createAdminClient-Backdoor — **Mitigation**: AC-906-6 Live-Smoke 7 UI-Pfade
- **R-906-2**: Caller-Mode-Switch (MT-3, MT-5, MT-7) bricht Cron-Caller wenn auth.uid()-Check zu strikt — **Mitigation**: explicit Branch `if (caller === 'cron') -> admin, else -> user-client`, dokumentiert via Code-Kommentar
- **R-906-3**: Vitest-Mock-Drift wie V8.11 SLC-904 audit-mock-regression (IMP-1106) — **Mitigation**: Pflicht-Schritt `npm run test` (Full-Suite jsdom) nach jedem MT

## Dependencies

- V8.11 STABLE ✓ (RPT-605)
- DEC-285 (assertRole existing) ✓ (RPT-608)

## Micro-Tasks

### MT-1: ISSUE-090 products-actions.ts (Klasse B)
- Goal: `await assertRole(["admin"])` vor createAdminClient in jeder Mutate-Action
- Files: `cockpit/src/lib/actions/products-actions.ts`, `cockpit/src/lib/actions/__tests__/products-actions.test.ts`
- Expected: Member-Role-Calls werfen `redirect('/mein-tag')`, Admin-Calls funktional unveraendert
- Verification: Vitest GREEN + grep `createAdminClient` zeigt vorgelagerten assertRole
- Dependencies: none

### MT-2: ISSUE-091 deal-products-actions.ts (Klasse C)
- Goal: `await assertRole(["admin"])` ODER User-Client-Switch je nach Action-Typ
- Files: `cockpit/src/lib/actions/deal-products-actions.ts`, `cockpit/src/lib/actions/__tests__/deal-products-actions.test.ts`
- Expected: Read-Actions auf User-Client switched, Write-Actions assertRole-gated
- Verification: Vitest GREEN
- Dependencies: none

### MT-3: ISSUE-092 send-action.ts email_attachments-Bulk (Klasse C, Hybrid)
- Goal: User-Client fuer SELECT+INSERT, Admin nur fuer Storage-Cleanup-Branch
- Files: `cockpit/src/lib/actions/send-action.ts`, evtl. `cockpit/src/lib/actions/__tests__/send-action.test.ts`
- Expected: email_attachments-Bulk-INSERTs gehen ueber User-Client (RLS aktiv), Storage-Cleanup via Admin
- Verification: Vitest GREEN, explizit Branch-Code-Kommentar `// Storage-Cleanup nutzt Admin weil Bucket-RLS via Path-Filter geht`
- Dependencies: none

### MT-4: ISSUE-093 insight-actions.ts (Klasse C)
- Goal: `await assertRole(["admin"])` vor createAdminClient fuer ai_action_queue + ai_feedback INSERTs
- Files: `cockpit/src/lib/actions/insight-actions.ts`, `cockpit/src/lib/actions/__tests__/insight-actions.test.ts`
- Expected: Member-Role blockiert, Admin-Calls funktional
- Verification: Vitest GREEN
- Dependencies: none

### MT-5: ISSUE-094 document-actions.ts (Klasse C)
- Goal: User-Client fuer SELECT+INSERT von documents-Tabelle
- Files: `cockpit/src/lib/actions/document-actions.ts`, `cockpit/src/lib/actions/__tests__/document-actions.test.ts`
- Expected: Member sieht/inserted documents nur fuer eigene/team-Pfade (RLS aktiv via Parent-FK-JOIN), Admin unveraendert
- Verification: Vitest GREEN
- Dependencies: none

### MT-6: SLC-901 M-1 goals/kpi-snapshots/activity-kpis (Klasse A)
- Goal: `await assertRole(["admin"])` fuer admin-only-write (Klasse-A Per-User-Stammdaten, User-Writes sind eigene Daten)
- Files: `cockpit/src/lib/actions/goals-actions.ts`, `cockpit/src/lib/actions/kpi-snapshots-actions.ts`, `cockpit/src/lib/actions/activity-kpis-actions.ts`, + 3 zugehoerige `__tests__/*.test.ts`
- Expected: User-Writes auf eigene user_id funktional (User-Client + RLS), Admin-Writes auf andere user_ids assertRole-gated
- Verification: Vitest GREEN
- Dependencies: none

### MT-7: SLC-905 D-905-4 knowledge/search.ts (Klasse D, Caller-Mode-Switch)
- Goal: Caller-Mode-Switch — User-Client wenn `auth.uid()` set (UI-Caller), Admin nur fuer Cron-Caller mit explizitem `serviceMode: true`-Flag
- Files: `cockpit/src/lib/knowledge/search.ts`, `cockpit/src/lib/knowledge/__tests__/search.test.ts`
- Expected: UI-Caller bekommen tenant-gefilterte Search-Ergebnisse, Cron-Caller bekommen Cross-Tenant (Signal-Extractor-Pflicht)
- Verification: Vitest GREEN, 2 Test-Cases (UI-Caller + Cron-Caller)
- Dependencies: none (parallel zu MT-1..6 moeglich)

### MT-8: Records-Sync + grep-Audit
- Goal: 7 KNOWN_ISSUES auf `Status: resolved` setzen, grep-Audit dokumentieren
- Files: `docs/KNOWN_ISSUES.md`, `qa/SLC-906-grep-audit.md` (NEW)
- Expected: 7 Status-Updates + grep-Output `createAdminClient` zeigt 0 unbegruendete Treffer
- Verification: ISSUE-090..094 + SLC-901 M-1 + SLC-905 D-905-4 alle resolved
- Dependencies: MT-1..MT-7

## Pattern-Reuse

- `assertRole(["admin"])` aus `cockpit/src/lib/auth/assert-role.ts` (100% existing, BS V5+, DEC-285)
- Vitest-Mock-Pattern fuer `getProfile()` + `assertRole()` aus V8.11 SLC-904 (post-IMP-1106-Fix)
- Caller-Mode-Switch-Pattern (MT-7) aus V8.11 SLC-905 (RPC-Filter `(auth.uid() IS NULL OR can_see_owner(...))`)

## Done-Gate

- 7 grep-Closures: `grep -rE "createAdminClient" cockpit/src/lib/actions/` zeigt 0 Treffer ohne vorgelagertes `assertRole(["admin"])` ODER explizit dokumentiertes User-Client-Switch-Kommentar
- Full-Vitest-Suite jsdom GREEN
- 7 ISSUEs in KNOWN_ISSUES.md auf `Status: resolved` mit Datum + RPT-Link

## Aufwand

~3-4h Code-Side (7 MTs ~25-30min/MT inkl. Vitest-Tests + Mocks) + ~1h /qa. **Single-Session-machbar.**
