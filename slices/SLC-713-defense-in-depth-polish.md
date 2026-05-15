# SLC-713 — V7-Defense-in-Depth Polish (Guards + Audit-Doc-Sync)

## Metadata
- **Slice ID:** SLC-713
- **Version:** V7.1
- **Feature:** FEAT-713
- **Status:** planned
- **Priority:** Medium (Hygiene, kein Live-Exploit-Pfad heute)
- **Created:** 2026-05-15
- **Estimated Effort:** ~30 min - 1h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (kleiner Patch, geringes Regression-Risiko)
- **Architecture:** DEC-189 (V7 assertNotReadOnlyContext-Pattern), DEC-201 (Vitest-Pattern)
- **Reihenfolge-Pflicht:** **nach SLC-712b** ODER **parallel zu 712b** (kein Code-Konflikt). Letzter V7.1-Slice.

## Goal

Schliesst zwei zusammenhaengende Hygiene-Items aus /final-check V7 (RPT-410):

1. **ISSUE-070** — 4 Mutate-Server-Actions ohne `await assertNotReadOnlyContext()`-Guard als first line. Heute kein Live-Exploit (ISSUE-066 AsyncLocalStorage-Gap macht den Guard ohnehin nicht greifbar in Drilldown-Context, V7.5-Mitigation). Aber bei zukuenftiger Drilldown-Erweiterung wichtig — und Symmetrie zu V7-DEC-189-Pattern.

2. **ISSUE-069** — `docs/AUDIT_SERVER_ACTIONS_V7.md` hat 5 fehlende Eintraege + 1 Fehlklassifizierung. Reine Doc-Hygiene fuer Compliance-Gate-Auditoren.

## Scope

**In Scope:**

Defense-in-Depth-Guards (4 Files):
- `cockpit/src/lib/team/bulk-reassign-actions.ts` (MOD) — `bulkReassignApply` bekommt `await assertNotReadOnlyContext()` als first line
- `cockpit/src/components/insights/insight-actions.ts` (MOD) — `saveInsight` bekommt Guard
- `cockpit/src/lib/settings/working-hours-actions.ts` (MOD) — `updateWorkingHoursSettings` bekommt Guard
- `cockpit/src/lib/ki-workspace/reports/winloss.ts` (MOD) — `persistManualRun` bekommt Guard

Vitest-Tests (4 neue, alle nach DEC-201-Pattern):
- `cockpit/src/lib/team/bulk-reassign-actions.test.ts` (NEU oder MOD) — Test `bulkReassignApply throws when read-only context is active`
- `cockpit/src/components/insights/insight-actions.test.ts` (NEU oder MOD) — Test `saveInsight throws ...`
- `cockpit/src/lib/settings/working-hours-actions.test.ts` (NEU oder MOD) — Test `updateWorkingHoursSettings throws ...`
- `cockpit/src/lib/ki-workspace/reports/winloss.test.ts` (NEU oder MOD) — Test `persistManualRun throws ...`

Audit-Doc-Sync:
- `docs/AUDIT_SERVER_ACTIONS_V7.md` (MOD) — 5 neue Eintraege + 1 Fehlklassifizierung korrigiert:
  - Bulk-Reassign-Server-Actions (`bulkReassignPreview`, `bulkReassignApply`) — bisher in Section 8 "Out-of-Scope", muss in Live-Section nachgetragen werden
  - `lib/team/bulk-reassign.ts` Audit-Helpers (`writeInitiatedAudit`, `writeAppliedAudit`)
  - `lib/settings/working-hours-actions.ts` (V6.6)
  - `lib/ki-workspace/reports/winloss.ts persistManualRun` (V6.6)
  - `lib/audit.ts logAudit + logAuditWithId` (zentrale Audit-Insertion)
  - Fehlklassifizierung in `components/insights/insight-actions.ts:201` korrigieren ("wrapper" → "macht selbst INSERT")

**Out of Scope:**
- ISSUE-066 AsyncLocalStorage-Drilldown-Gap-Fix (V7.5-Mitigation via Middleware-Header)
- Audit-Trail-Erweiterung auf Settings-Update-Actions (V7.2-Defer, DEC-197)

## Acceptance Criteria

- **AC1** 4 Server-Actions haben `await assertNotReadOnlyContext()` als first line (Code-Inspection).
- **AC2** 4 Vitest-Tests gruen, Pattern DEC-201: `runWithReadOnlyContext({...}, async () => action())` wrapped + Assertion `rejects.toThrow(/Mutation blocked: read-only context active/)`.
- **AC3** Jeder Test bestaetigt zusaetzlich, dass keine echte DB-Mutation passiert ist (`expect(stubPgClient.query).not.toHaveBeenCalled()` o.ae.).
- **AC4** `npm run test:all` clean (760+ Tests gruen).
- **AC5** `docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt 5 neue Eintraege + 1 korrigierte Klassifizierung. Manuelle Doc-Review.
- **AC6** Kein Live-Smoke noetig (kein UI-Touch, kein Verhalten-Aenderung fuer Normal-User; nur Defense-in-Depth + Doc).

## Micro-Tasks

### MT-1: 4× assertNotReadOnlyContext-Guard einsetzen
- **Goal:** Jede der 4 Mutate-Server-Actions bekommt `await assertNotReadOnlyContext()` als first line der Function-Body. Pattern aus existierenden V7-Mutate-Actions (z.B. `cockpit/src/app/actions/meetings.ts` oder `bulkReassignApply` wo schon partiell vorhanden).
- **Files (4):**
  - `cockpit/src/lib/team/bulk-reassign-actions.ts` — `bulkReassignApply`
  - `cockpit/src/components/insights/insight-actions.ts` — `saveInsight`
  - `cockpit/src/lib/settings/working-hours-actions.ts` — `updateWorkingHoursSettings`
  - `cockpit/src/lib/ki-workspace/reports/winloss.ts` — `persistManualRun`
- **Expected behavior:**
  - Jede Function: erste Code-Zeile nach `"use server"` und Imports ist `await assertNotReadOnlyContext()`. Throw bei aktivem Context. Sonst no-op (Normal-User-Pfad).
  - Import-Statement `import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context"` ergaenzt wo fehlend.
- **Verification:**
  - TSC clean
  - `npm run test:all` gruen (Regression-Check, kein neuer Test noch)
- **Dependencies:** none

### MT-2: 4 Vitest-Tests nach DEC-201-Pattern
- **Goal:** Jede der 4 Actions bekommt 1 Vitest-Test der das Guard-Throw-Verhalten bestaetigt. Pattern aus `read-only-context.test.ts` (MT-6 SLC-706).
- **Files (4):**
  - `cockpit/src/lib/team/bulk-reassign-actions.test.ts`
  - `cockpit/src/components/insights/insight-actions.test.ts`
  - `cockpit/src/lib/settings/working-hours-actions.test.ts`
  - `cockpit/src/lib/ki-workspace/reports/winloss.test.ts`
- **Expected behavior (Template pro Test):**
  ```typescript
  import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";
  // ggf. vi.mock fuer Supabase-Client/pg-Client damit keine echte DB-Mutation versucht wird

  it("<actionName> throws when read-only context is active", async () => {
    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "teamlead-id", targetUserId: "member-id" },
        async () => actionName(/* minimale params */),
      ),
    ).rejects.toThrow(/Mutation blocked: read-only context active/);

    // Optional aber empfohlen: Assertion dass keine echte DB-Mutation passiert ist
    expect(stubPgClient.query).not.toHaveBeenCalled();
  });
  ```
- **Verification:**
  - `cd cockpit && npm run test -- bulk-reassign-actions insight-actions working-hours-actions winloss` gruen
  - `npm run test:all` 760+ → 764+ gruen
- **Dependencies:** MT-1

### MT-3: AUDIT_SERVER_ACTIONS_V7.md Doc-Sync
- **Goal:** 5 fehlende Eintraege in der Live-Section ergaenzen, 1 Fehlklassifizierung korrigieren. Konsistenz mit aktuellem Code-Stand.
- **Files:**
  - `docs/AUDIT_SERVER_ACTIONS_V7.md` (MOD)
- **Expected behavior:** Doc enthaelt nach Edit:
  - Bulk-Reassign-Pfad (preview + apply) als Live-Eintrag, nicht Out-of-Scope
  - `lib/team/bulk-reassign.ts:writeInitiatedAudit + writeAppliedAudit` als Audit-Helper-Eintrag
  - `lib/settings/working-hours-actions.ts:updateWorkingHoursSettings` als Mutate-Eintrag (V6.6)
  - `lib/ki-workspace/reports/winloss.ts:persistManualRun` als Mutate-Eintrag (V6.6)
  - `lib/audit.ts:logAudit + logAuditWithId` als zentrale Audit-Helper
  - `components/insights/insight-actions.ts` korrigiert: nicht "wrapper", sondern "macht selbst supabase.from('activities').insert(...)"
- **Verification:**
  - Manuelle Doc-Review (Stichprobe: Bulk-Reassign-Eintrag ist nicht mehr in Section 8)
  - Optional: grep nach den 5 neuen Symbolen → alle erscheinen in der Doc
- **Dependencies:** none (kann parallel zu MT-1 + MT-2 laufen)

### MT-4: Cockpit-Records-Sync + KNOWN_ISSUES Update
- **Goal:** Nach Slice-Done: ISSUE-069 + ISSUE-070 auf Status `resolved` setzen, SLC-713-Status auf `done`, BL-466 auf `done`.
- **Files:**
  - `docs/KNOWN_ISSUES.md` (MOD) — ISSUE-069 + ISSUE-070 Status `resolved` mit Resolved-Date 2026-05-15
  - `slices/INDEX.md` (MOD) — SLC-713 Status `done`
  - `features/INDEX.md` (MOD) — FEAT-713 Status `done`
  - `planning/backlog.json` (MOD) — BL-466 Status `done`
- **Expected behavior:**
  - Cockpit zeigt nach Reload: ISSUE-069 + ISSUE-070 als resolved
  - SLC-713 Status `done`
  - FEAT-713 Status `done`
  - BL-466 Status `done`
- **Verification:**
  - Cockpit-Manuell-Check oder Datei-Inspection
- **Dependencies:** MT-1 + MT-2 + MT-3 done

## Risks & Mitigations

- **Risk R1:** Bestehende `*.test.ts`-Files ggf. nicht existent — MT-2 muss NEW-Files anlegen mit korrektem Vitest-Setup-Pattern. **Mitigation:** Pattern aus `read-only-context.test.ts` aus V7 oder aus `lib/team/aggregate-queries.test.ts` (SLC-705) reusen.
- **Risk R2:** Supabase-Client-Mock-Pattern kann subtile Unterschiede zwischen den 4 Actions haben. **Mitigation:** /backend macht es action-by-action, copy-paste vom ersten erfolgreichen Test als Template.
- **Risk R3:** AUDIT_SERVER_ACTIONS_V7.md hat ein fixes Format das in V7 etabliert wurde. **Mitigation:** Doc lesen vor Edit, bestehende Eintraege als Template fuer neue.
- **Risk R4:** ISSUE-066-Context-Asymmetrie bedeutet: die Guards greifen in der Praxis HEUTE nicht (AsyncLocalStorage propagiert nicht in Server-Action-Request). **Mitigation:** AC2-Test wrapped die Action explizit mit `runWithReadOnlyContext`, bestaetigt also nur das Guard-Verhalten _wenn_ Context aktiv ist. Praxis-Realitaet bleibt V7.5-Mitigation, V7.1 schliesst nur die Code-Symmetrie.

## Dependencies

- **SLC-711** + **SLC-712a** + **SLC-712b** done (User-Reihenfolge sichtbar zuerst). Pragmatisch kann SLC-713 auch parallel zu SLC-712b laufen, weil kein Code-Konflikt.

## Verification & Tests

- TSC clean
- 4 neue Vitest-Tests gruen (AC2+AC3)
- `npm run test:all` 760+ → 764+ gruen (AC4)
- Doc-Review AUDIT_SERVER_ACTIONS_V7.md (AC5)
- Cockpit-Records-Sync (MT-4)

## Open Points

- MT-1 pruefen ob `bulkReassignApply` ggf. schon Guard hat (RPT-410 ist Quelle der ISSUE-070-Liste; aber Code kann sich seit dann geaendert haben). Wenn ja: MT-1 ist no-op fuer das File.
- MT-2 Mock-Pattern fuer pg-Client + Supabase-Client identifizieren

## Files Reviewed (Slice-Planning)

- `cockpit/src/lib/auth/read-only-context.ts` (Reuse-Quelle assertNotReadOnlyContext + runWithReadOnlyContext)
- `docs/KNOWN_ISSUES.md` (ISSUE-069 + ISSUE-070 Details)
- `docs/AUDIT_SERVER_ACTIONS_V7.md` (Doc-Sync-Stelle)

## Recommended Implementation Skill

`/backend` fuer MT-1 + MT-2 + MT-3 (Code-Patches + Tests + Doc).
`/qa` ist hier kein Live-Smoke (kein UI-Touch); `/qa` macht nur Vitest-Run + Doc-Review.
Nach SLC-713 PASS: V7.1 Gesamt-/qa starten, dann /final-check + /go-live + /deploy.
