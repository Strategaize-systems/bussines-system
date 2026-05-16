# SLC-754 — Trockenlauf-Karte + Apply-Confirmation-Modal (FEAT-751)

## Metadata
- **Slice ID:** SLC-754
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** High (schliesst NL→Active-Rule-Pfad, ohne diesen Slice ist V7.5 nicht functional)
- **Created:** 2026-05-16
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen
- **Architecture:** DEC-207 (Confirm-Modal mit Pflicht-Checkbox), DEC-132 (V6.2 Trockenlauf-Modul-Reuse)
- **Reihenfolge-Pflicht:** **nach SLC-753**. SLC-755 + SLC-756 koennen parallel.

## Goal

Karte 4 (Trockenlauf-Karte) sichtbar machen + Server-Action `previewNlRule()` + Apply-Confirmation-Modal mit Pflicht-Checkbox + Server-Action `applyNlRule()` mit Soft-Dedup + Audit-Log-Insert. Erstellte Regel wird von V6.2-Dispatcher 1:1 ausgefuehrt.

## Scope

**In Scope:**

- **`cockpit/src/app/(app)/mein-tag/actions/preview-nl-rule.ts` (NEU)** — Server Action:
  - assertRole(["admin","teamlead"])
  - Reuse V6.2 DEC-132 Trockenlauf-Modul (read-only SELECT-Query letzte 7 Tage)
  - Return `PreviewResult = {matched_events: Array<{event_date, event_summary, would_create: Action[]}>, total_matches: number}`
- **`cockpit/src/app/(app)/mein-tag/actions/apply-nl-rule.ts` (NEU)** — Server Action:
  - assertRole(["admin","teamlead"])
  - zod-Validate (Defense-in-Depth gegen geaenderte Schema-Felder im UI)
  - `assertNotDuplicateRule()` (SLC-752 sculptor-dedup)
  - INSERT `automation_rules` mit `status='active', created_by=auth.uid(), created_via='nl_sculptor'`
  - INSERT `audit_log` action=`automation_rule.create_via_nl` mit `metadata={nl_input, sculpt_audit_id, sculptor_cost_usd, edited_in_form}`
- **`cockpit/src/components/mein-tag/preview-result-card.tsx` (NEU)** — Karte 4 rendert PreviewResult.
- **`cockpit/src/components/mein-tag/apply-confirm-modal.tsx` (NEU)** — shadcn-Dialog-Reuse (`@/components/ui/dialog`):
  - Klarsprache-Echo (read-only)
  - Trigger-Event-Label
  - Action-Liste-Label
  - Pflicht-Checkbox "Ich bestaetige: Diese Regel wird ab jetzt auf alle neuen Stage-Wechsel angewandt."
  - Apply-Button disabled bis Checkbox aktiv
  - On-Apply → applyNlRule-Server-Action → Toast + Modal-Close + Card-Reset
- **`cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD)** — Karte 4 von SLC-753-Placeholder zu Live-Karte erweitern. Sequenz `Sculpt → Preview-Button → Karte 4 → Apply-Button → Confirm-Modal`. Keine Skip-Pfad.
- **Vitest:**
  - `preview-nl-rule.test.ts` — assertRole, V6.2-Reuse-Mock, 3 Test-Cases (kein-Match / 1-Match / 7-Tage-Window-Limit)
  - `apply-nl-rule.test.ts` — assertRole, dedup-throws, success-INSERT-Mock, audit-INSERT-Mock
  - `apply-confirm-modal.test.tsx` — RTL: Button disabled bei un-checked, enabled bei checked, Apply-Click-Handler-Call
  - `preview-result-card.test.tsx` — RTL: 0-Match / 3-Match Rendering

**Out of Scope:**

- Voice-Input + Mikro-Button-Funktion — SLC-755
- Inspection-Log-UI — SLC-756
- Edit-Existing-Rule-via-NL — V8+
- Bulk-NL-Input — V8+
- Skip-Pfad fuer Trockenlauf (User-Direktive: Pflicht) — out of scope by design

## Acceptance Criteria

- **AC1** Karte 4 (Trockenlauf-Karte) erscheint nach Sculpt-Success. Button "Trockenlauf anzeigen" aktiv.
- **AC2** Klick "Trockenlauf anzeigen" calls `previewNlRule(currentSchema)` → V6.2-DEC-132-Reuse → Karte 4 rendert "Diese Regel haette folgende Tasks erzeugt: ..." mit historischen Treffern aus letzten 7 Tagen.
- **AC3** "Regel aktivieren"-Button ist disabled bis Trockenlauf gelaufen ist (UI-State-Flag).
- **AC4** Klick "Regel aktivieren" → Confirm-Modal oeffnet sich mit:
  - Klarsprache-Echo
  - Trigger-Event-Label ("Bei Stage-Wechsel auf 'Angebot'")
  - Action-Liste-Label ("erzeuge Task 'Follow-up zu {{deal.name}}' in 2 Tagen")
  - Pflicht-Checkbox
  - Apply-Button (disabled bis Checkbox aktiv)
- **AC5** Apply-Klick → `applyNlRule()`:
  - assertRole(["admin","teamlead"])
  - zod-Validate (Re-Validate gegen current-form-state, Defense-in-Depth)
  - `assertNotDuplicateRule(rule, userId)` (Soft-Dedup gegen identical existing active Rule des Owners)
  - INSERT `automation_rules` mit `status='active', created_by=auth.uid(), created_via='nl_sculptor', trigger_event=..., trigger_config=..., conditions=..., actions=...`
  - INSERT `audit_log` action=`automation_rule.create_via_nl` mit metadata={nl_input, sculpt_audit_id, sculptor_cost_usd, edited_in_form (bool)}
  - Toast "Regel aktiviert" + Modal-Close + Card-State-Reset
- **AC6** Soft-Dedup-Check: 2. NL-Eingabe mit identischem Sculpt-Ergebnis returnt 409 mit Hinweis "Es gibt bereits eine identische Regel. Diese aktivieren?" + Link zur bestehenden Regel (DealLink-Pattern wenn Rule-Detail-Page existiert, sonst Plain-Text-ID).
- **AC7** Erstellte Regel funktioniert in V6.2-Dispatcher: bei naechstem `deal.stage_changed` auf Angebot-Stage feuert sie wie eine Click-Wizard-Regel. Live-Smoke verifiziert.
- **AC8** Vitest `npm run test:all` ~965 → ~965+8 PASS (3 preview + 4 apply + 1 modal-RTL).
- **AC9** Playwright-MCP-Live-Smoke (im /qa-Step):
  - Sculpt "Wenn Deal in Stage Angebot, leg mir Follow-up-Task in 2 Tagen an" → Schema-Karte rendert
  - Trockenlauf-Button → Karte 4 rendert mit Treffern aus letzten 7 Tagen
  - Apply-Button → Modal oeffnet
  - Pflicht-Checkbox aktivieren → Apply-Button enabled
  - Apply-Klick → Toast "Regel aktiviert", Modal schliesst
  - SQL-Verifikation: `SELECT * FROM automation_rules WHERE created_via='nl_sculptor' ORDER BY created_at DESC LIMIT 1` returnt die neue Rule. `SELECT * FROM audit_log WHERE action='automation_rule.create_via_nl' ORDER BY created_at DESC LIMIT 1` returnt audit-Eintrag.
  - **End-to-End-V6.2-Trigger:** Manuelles Move eines Deals nach Stage-Angebot in der Pipeline-UI → Task-INSERT in DB verifiziert.

## Micro-Tasks

### MT-0: Worktree-Branch + V6.2 Trockenlauf-Modul-Lookup
- **Goal:** V6.2 Trockenlauf-Funktion finden (war in SLC-622 oder SLC-623 implementiert per DEC-132). Verstehen wie sie aufgerufen wird.
- **Files (Review-only):**
  - `cockpit/src/lib/automation/dry-run.ts` (vermuteter Pfad)
  - `cockpit/src/app/(app)/settings/workflow-automation/...` (Pre-V7.5 Wizard-Step-4-Trockenlauf)
- **Verification:** Reusable Function `dryRunRule(rule): DryRunResult` identifiziert. Falls nicht: minimal inline-Reuse-Helper.
- **Dependencies:** none

### MT-1: previewNlRule-Server-Action
- **Goal:** Wrapper um V6.2-Trockenlauf-Modul mit assertRole.
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/actions/preview-nl-rule.ts` (NEU)
  - Tests in `__tests__/preview-nl-rule.test.ts`
- **Verification:** Vitest 3 Cases (0-match, n-match, role-reject).
- **Dependencies:** MT-0

### MT-2: applyNlRule-Server-Action
- **Goal:** assertRole + zod-validate + dedup + 2x INSERT (rules + audit_log).
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/actions/apply-nl-rule.ts` (NEU)
  - Tests in `__tests__/apply-nl-rule.test.ts`
- **Expected behavior:**
  ```typescript
  "use server";
  export async function applyNlRule(input: ApplyNlRuleInput): Promise<{rule_id: string}> {
    await assertRole(["admin","teamlead"]);
    const user = await getCurrentUser();
    const parsed = SculptSuccessSchema.parse(input.schema);  // Re-Validate
    await assertNotDuplicateRule({name: input.name, trigger_event: parsed.trigger_event, conditions: parsed.conditions, actions: parsed.actions}, user.id);
    const rule = await insertAutomationRule({
      name: input.name,
      status: "active",
      created_by: user.id,
      created_via: "nl_sculptor",
      trigger_event: parsed.trigger_event,
      trigger_config: parsed.trigger_config,
      conditions: parsed.conditions,
      actions: parsed.actions,
    });
    await insertAuditLog({
      action: "automation_rule.create_via_nl",
      actor_id: user.id,
      entity_type: "automation_rule",
      entity_id: rule.id,
      metadata: {
        nl_input: input.nl_input,
        sculpt_audit_id: input.sculpt_audit_id,
        sculptor_cost_usd: input.sculptor_cost_usd,
        edited_in_form: input.edited_in_form,
      },
    });
    return {rule_id: rule.id};
  }
  ```
- **Verification:** Vitest 4 Cases (role-reject, dedup-throws, success-INSERT, audit-INSERT).
- **Dependencies:** MT-0, SLC-752 MT-7 (dedup), SLC-752 MT-0 (created_via Column existiert)

### MT-3: PreviewResultCard
- **Goal:** Karte 4-Renderer fuer PreviewResult.
- **Files:**
  - `cockpit/src/components/mein-tag/preview-result-card.tsx` (NEU)
  - Tests `preview-result-card.test.tsx`
- **Verification:** RTL 2 States (0-Match-Empty-State, 3-Match-List-Render).
- **Dependencies:** MT-1

### MT-4: ApplyConfirmModal (shadcn-Dialog-Reuse)
- **Goal:** Modal mit Klarsprache + Trigger-Label + Action-Liste + Pflicht-Checkbox + Apply-Button.
- **Files:**
  - `cockpit/src/components/mein-tag/apply-confirm-modal.tsx` (NEU)
  - Tests `apply-confirm-modal.test.tsx`
- **Expected behavior:**
  - Reuse `@/components/ui/dialog` (Dialog, DialogContent, DialogHeader, DialogFooter)
  - Local-State `checkboxChecked`
  - Apply-Button `disabled={!checkboxChecked || pending}`
  - On-Apply → `applyNlRule()` → Toast + Modal-close-Callback
- **Verification:** RTL: Button disabled bei un-checked, enabled bei checked, Apply-Click-Handler-Call mit korrekten Args.
- **Dependencies:** MT-2

### MT-5: NLRuleBuilderCard Karte 4 + Modal-Integration
- **Goal:** Sequenz `Sculpt → Preview-Button → Karte 4 → Apply-Button → Confirm-Modal` verdrahten.
- **Files:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD von SLC-753)
- **Expected behavior:**
  - State erweitert: `previewResult: PreviewResult | null`, `modalOpen: boolean`, `lastSculptAuditId: string | null`
  - Apply-Button disabled bis `previewResult !== null`
  - On-Apply-Success → `setSculptResult(null) + setPreviewResult(null) + setModalOpen(false)`
- **Verification:** RTL-Test: vollstaendige Sequenz simuliert (mock-server-actions).
- **Dependencies:** MT-3, MT-4

### MT-6: /qa Playwright-MCP-Live-Smoke
- **Goal:** AC9-Sequenz inkl. End-to-End-V6.2-Trigger.
- **Verification:** SQL-Verifikation `automation_rules` + `audit_log` post-Apply. End-to-End-Manual-Stage-Move triggert die Rule (Task-INSERT verifiziert).
- **Dependencies:** MT-1..MT-5 done + User-Coolify-Deploy

### MT-7: Cockpit-Records-Sync
- **Goal:** SLC-754 done. FEAT-751 bleibt in_progress (SLC-755 + SLC-756 noch offen).
- **Files:**
  - `slices/INDEX.md` (MOD)
  - `docs/DECISIONS.md` (MOD) — DEC-207 als `accepted` markieren wenn noch nicht
- **Dependencies:** MT-6 PASS

## Risks & Mitigations

- **R1** V6.2 Trockenlauf-Modul DEC-132-Reuse — falls Function-Signatur fuer V7.5-Schema-Input nicht passt (z.B. erwartet bereits-persisted Rule-ID statt Rule-Object), **Mitigation:** MT-1 wrappt mit Adapter `dryRunRulePure(ruleObject): DryRunResult`. Reuse-Logik bleibt.
- **R2** assertNotDuplicateRule (SLC-752 MT-7) hat noch nicht in /qa gelaufen — MT-2 testet es im Mock, aber Live-Smoke MT-6 ist der erste End-to-End-Test. **Mitigation:** /qa SLC-752 muss vor SLC-754 abgeschlossen sein, dedup-Funktion validated.
- **R3** shadcn-Dialog `useFormStatus` vs `useTransition` Pattern — falls Modal-Apply-Button-Handler nicht clean integriert: explicit `useTransition + state`.
- **R4** Re-Validate beim Apply (zod) — User koennte zwischen Sculpt und Apply die Schema-Karte editiert haben. Re-Validate ist Defense-in-Depth. **Mitigation:** AC5 verifiziert das.

## Dependencies

- **SLC-752** Sculptor-Core + MIG-036 + sculptor-dedup
- **SLC-753** NL-Surface + sculptNlRule Action + Card-Foundation
- **V6.2 FEAT-621** automation_rules-Schema + Trockenlauf-Modul (DEC-132) + Dispatcher

## Verification & Tests

- TSC clean
- Vitest 8 neue Tests gruen (3 preview + 4 apply + 1 modal-RTL)
- Live-Smoke MT-6 PASS inkl. End-to-End-V6.2-Trigger
- SQL-Verifikation: `automation_rules` enthaelt neue Rule mit `created_via='nl_sculptor'`. `audit_log` enthaelt `automation_rule.create_via_nl`-Eintrag.

## Open Points

- V6.2-Trockenlauf-Modul-Lookup-Outcome — MT-0 entscheidet ob Adapter noetig.

## Files Reviewed (Slice-Planning)

- `cockpit/src/components/ui/dialog.tsx` (shadcn-Dialog vorhanden, Reuse fuer Modal)
- `docs/ARCHITECTURE.md` V7.5-Section (DEC-207 Confirm-Modal-Skizze, DEC-209 sculptor-dedup)

## Recommended Implementation Skill

`/backend` fuer MT-0..MT-2 (Server-Actions + V6.2-Reuse-Wrapper).
`/frontend` fuer MT-3..MT-5 (PreviewCard + Modal + Integration).
`/qa` fuer MT-6 Live-Smoke + End-to-End-V6.2-Trigger-Verifikation.
