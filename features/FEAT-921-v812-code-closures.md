# FEAT-921 — V8.12 Code-Layer-Closures (Phase 1)

## Status
- Version: V8.12
- Status: planned
- Priority: High (V8.11-Accepted-Risks Code-Layer-Closure)
- Created: 2026-06-09
- Source-of-Truth: [reports/RPT-607.md](../reports/RPT-607.md) Section 4 + 6

## Purpose

7 Server-Actions schliessen die DB-RLS Code-Layer-Bypass-Gap aus V8.11. createAdminClient ohne is_admin()-Pre-Check ist Defense-in-Depth-Luecke — V8.11 hat das bewusst akzeptiert (DB-Layer-RLS aktiv und funktional, Internal-Test-Mode-konform), V8.12 schliesst es bevor zweiter realer User dazukommt.

## Scope

7 Files in `cockpit/src/lib/actions/**` + `cockpit/src/lib/knowledge/search.ts`:

| Item | File | Klasse | Pattern |
|---|---|---|---|
| ISSUE-090 | products-actions.ts | B (Templates) | assertAdmin() vor createAdminClient |
| ISSUE-091 | deal-products-actions.ts | C (FK-JOIN) | assertAdmin() oder User-Client-Switch |
| ISSUE-092 | send-action.ts (email_attachments-Bulk) | C | User-Client SELECT+INSERT, Admin nur Storage-Cleanup |
| ISSUE-093 | insight-actions.ts (ai_action_queue + ai_feedback) | C | assertAdmin() vor createAdminClient |
| ISSUE-094 | document-actions.ts | C | User-Client SELECT+INSERT |
| SLC-901 M-1 | {goals,kpi-snapshots,activity-kpis}-actions.ts | A (Per-User) | assertAdmin() (admin-only-write) |
| SLC-905 D-905-4 | knowledge/search.ts | D | Caller-Mode-Switch: User-Client wenn auth.uid() set, Admin nur Cron |

## Backlog-Items

- BL-513 V8.12 Phase 1 Code-Layer-Closures Bundle (Umbrella)
- KNOWN_ISSUES ISSUE-090..094 (individuelles Tracking)

## Acceptance Criteria

- AC-921-1: KNOWN_ISSUES.md Status: resolved fuer ISSUE-090..094 + 2 SLC-Closures dokumentiert
- AC-921-2: Vitest Mock-Pattern fuer is_admin-Check in jeder geaenderten Server-Action
- AC-921-3: 0 createAdminClient-Calls ohne Pre-Check in cockpit/src/lib/actions/** (grep-Audit)
- AC-921-4: TSC=0, ESLint=0, Full-Vitest-Suite GREEN
- AC-921-5: Live-Smoke 7 UI-Pfade mit member-Role → 403/Forbidden bzw. RLS-Block

## Constraints

- Pattern-Reuse: assertAdmin() Helper aus V8.11 SLC-901+SLC-905 (vermutlich existierend, sonst neuer Helper in MT-0)
- 0 Schema-Migration
- Full-Vitest-Suite (jsdom non-RLS) Pflicht-Gate per IMP-1108

## Out of Scope

- Schema-Aenderungen
- UI-Komponenten-Aenderungen
- Architektur-Aenderungen DB-Layer

## Sub-Slices (Final-Cut in /slice-planning)

Option A: 1 Bundle-Slice SLC-9X1 mit 7 MTs.
Option B: 2 Slices nach Klasse — SLC-9X1 Klasse-B+D + SLC-9X2 Klasse-A+C.

Entscheidung: OQ-V812-slice-1 in /slice-planning.

## Dependencies

- V8.11 STABLE ✓ (RPT-605)
- assertAdmin() Helper-Function-Status (OQ-V812-arch-1)
