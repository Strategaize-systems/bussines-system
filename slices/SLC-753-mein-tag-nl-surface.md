# SLC-753 — Mein-Tag NL-Surface + Sculpt-Server-Action (FEAT-751)

## Metadata
- **Slice ID:** SLC-753
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** High (first User-Facing Slice — Bringt NL-UI nach Mein Tag)
- **Created:** 2026-05-16
- **Estimated Effort:** ~3-5h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (neue Mein-Tag-Komponente + Server-Action)
- **Architecture:** Mein-Tag KI-Workspace-Hybrid-Layout (V6.6), V7.1-Permission-Matrix
- **Reihenfolge-Pflicht:** **nach SLC-752**. SLC-754 baut darauf auf.

## Goal

NL-Rule-Builder-Card auf Mein Tag mounten (Admin+Teamlead-only). Sculpt-Server-Action verdrahten (`sculptNlRule`). Klarsprache-Karte + editierbare Schema-Karte rendern. Bedrock-Cost-Display nach Sculpt. KEIN Trockenlauf, KEIN Apply (kommt SLC-754).

## Scope

**In Scope:**

- **`cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (NEU)** — 4-Karten-Sequenz, in V7.5 nur Karten 1+2+3 sichtbar:
  - Karte 1 **NL-Eingabe**: Textarea + Sculpt-Button "Regel bauen" (Mikro-Button-Placeholder fuer SLC-755 — disabled)
  - Karte 2 **Klarsprache-Karte**: Echo "Du moechtest folgende Regel: <Bedrock-Intent>"
  - Karte 3 **Schema-Karte**: Editierbare Form-Felder (Trigger-Dropdown, Condition-Builder, Action-Builder) — Pattern aus V6.2-Wizard-Step-4
  - Karte 4 Placeholder "Trockenlauf folgt — SLC-754" (disabled CTA)
  - Bedrock-Cost-Anzeige nach Sculpt: `~$0.003 fuer 1 Versuch` / `~$0.006 fuer 2 Versuche` (DEC-208)
  - Reject-Karte bei `reject_reason="out_of_domain"` mit Explanation + Vorschlag
- **`cockpit/src/app/(app)/mein-tag/actions/sculpt-nl-rule.ts` (NEU)** — Server Action:
  - `"use server"` (Top), aus dem File nur async functions + Types exportieren (per `feedback_use_server_value_export_forbidden`)
  - Steps: assertRole(["admin","teamlead"]) → sculptRule(nlInput, auth.uid()) → return SculptResult
  - audit_log-Insert passiert in `sculptRule()` selbst (SLC-752 MT-6)
- **`cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD)** — `<NLRuleBuilderCard canSculpt={serverProps.canSculpt} />` im KI-Workspace-Bereich gemountet.
- **`cockpit/src/app/(app)/mein-tag/page.tsx` (MOD)** — Server-Component liest Rolle, setzt `canSculpt = ["admin","teamlead"].includes(role)` und gibt es als Prop weiter.
- **Vitest:**
  - `nl-rule-builder-card.test.tsx` (NEU) — RTL-Test: 3 Karten-States (initial / success / reject). Mock `sculptNlRule`-Server-Action.
  - `sculpt-nl-rule.test.ts` (NEU) — assertRole-Reject fuer Member, success fuer Admin/Teamlead, calls sculptRule mit korrektem User-ID.
- **Native HTML Form + useTransition + Server Action** Pattern (per `feedback_native_html_form_pattern`), KEIN react-hook-form.

**Out of Scope:**

- Trockenlauf-Karte (Karte 4) — Placeholder disabled, kommt SLC-754
- Apply-Confirmation-Modal — SLC-754
- assertNotDuplicateRule — SLC-754
- Voice-Input + Mikro-Button-Funktion — SLC-755 (Mikro-Button als disabled-Placeholder zeigen)
- Inspection-Log auf /settings/workflow-automation/nl-history — SLC-756
- created_via-Persist — SLC-754 (kein INSERT in V7.5-SLC-753, nur Sculpt+Render)

## Acceptance Criteria

- **AC1** Auf `/mein-tag` ist im KI-Workspace-Bereich (rechts oder unten — analog V6.6-Layout) der `NLRuleBuilderCard` sichtbar fuer Admin + Teamlead.
- **AC2** Fuer Member ist die Card NICHT gerendert (Server-Side: `canSculpt=false`). Member sieht keinen DOM-Knoten der Card. Live-Smoke via Playwright-MCP-Login als Member.
- **AC3** Sculpt-Server-Action `sculptNlRule(formData)`:
  - Member-Aufruf wirft `RoleForbiddenError` (assertRole-first-line)
  - Admin/Teamlead-Aufruf calls `sculptRule(nlInput, auth.uid())` aus SLC-752
- **AC4** Klarsprache-Echo: Nach Sculpt-Success wird Karte 2 mit "Du moechtest folgende Regel: <Echo>" gerendert. Echo ist heuristisch aus `payload.trigger_event` + `payload.actions[0].type` formuliert (z.B. "Bei Stage-Wechsel auf 'Angebot' wird eine Follow-up-Task erzeugt").
- **AC5** Schema-Karte editierbar: Trigger-Dropdown (3 Optionen), Condition-Builder (Add/Remove), Action-Builder (Type-Dropdown + Params). State ist React-useState, kein Server-Roundtrip beim Edit.
- **AC6** Reject-Karte bei out-of-domain: rendert `<RejectCard explanation={...} />`. Schema-Karte erscheint NICHT.
- **AC7** Bedrock-Cost-Anzeige: nach Sculpt-Call (1 Versuch) zeigt UI `~$0.003`. Nach Re-Prompt-Loop (2 Versuche) zeigt `~$0.006`. Berechnung aus SLC-752 `totalCostUsd`.
- **AC8** Native HTML Form + useTransition: Submit-Button hat `disabled={pending}`. KEIN react-hook-form.
- **AC9** Vitest `npm run test:all` ~960 → ~960+5 PASS (5 = 3 Card-States + 2 Server-Action-Tests).
- **AC10** Playwright-MCP-Live-Smoke (im /qa-Step):
  - Login als Admin → /mein-tag → Card sichtbar
  - Eingabe "Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task in 2 Tagen an" + Sculpt-Klick
  - Karte 2+3 rendern mit korrektem Trigger=`deal.stage_changed` + Action=`create_task`
  - Cost-Display zeigt ~$0.003
  - Login als Member → /mein-tag → Card NICHT sichtbar (DOM-Assertion `expect.findByTestId('nl-rule-builder-card').not.toBeInTheDocument()`)

## Micro-Tasks

### MT-0: Worktree-Branch + Read existing Mein-Tag-Layout
- **Goal:** Verstehen wo der KI-Workspace-Bereich auf Mein Tag rendert (V6.6 FEAT-661).
- **Files (Review-only):**
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx`
  - `cockpit/src/components/ki-workspace/` (Foundation-Component)
- **Verification:** Mount-Punkt klar (rechts oder unten — Architecture-Skizze hatte das offen gelassen).
- **Dependencies:** none

### MT-1: Server-Action `sculptNlRule()`
- **Goal:** Pure-Server-Action mit assertRole + sculptRule-Call. Aus `"use server"`-File nur async functions exportieren.
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/actions/sculpt-nl-rule.ts` (NEU)
  - `cockpit/src/app/(app)/mein-tag/actions/sculpt-nl-rule.test.ts` (NEU)
- **Expected behavior:**
  ```typescript
  "use server";
  import { sculptRule, SculptResult } from "@/lib/automation/sculptor";
  import { assertRole } from "@/lib/auth/assert-role";
  import { getCurrentUser } from "@/lib/auth/session";

  export async function sculptNlRule(formData: FormData): Promise<SculptResult> {
    await assertRole(["admin","teamlead"]);
    const user = await getCurrentUser();
    const nlInput = String(formData.get("nlInput") ?? "").trim();
    if (nlInput.length < 5) throw new Error("Eingabe zu kurz");
    return sculptRule(nlInput, user.id);
  }
  ```
- **Verification:** Vitest 2 Tests (Member-throws, Admin-passes-to-sculptRule).
- **Dependencies:** SLC-752 MT-6 done

### MT-2: NLRuleBuilderCard-Component
- **Goal:** 4-Karten-Sequenz-Renderer mit useState + useTransition.
- **Files:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (NEU)
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.test.tsx` (NEU)
- **Expected behavior:**
  - Props: `canSculpt: boolean` (von Server-Side-Auth)
  - State: `sculptResult: SculptResult | null`, `editableSchema: ...`, `pending`, `error`
  - Render:
    - Wenn `canSculpt===false` → `return null`
    - Karte 1 immer sichtbar
    - Karte 2 sichtbar wenn `sculptResult?.status==="success"` ODER `sculptResult?.status==="reject"`
    - Karte 3 sichtbar nur wenn `sculptResult?.status==="success"` (editierbare Form-Felder)
    - Karte 4 Placeholder mit `disabled` Trockenlauf-Button (kommt SLC-754)
    - Cost-Display rendert wenn `sculptResult?.totalCostUsd > 0`
  - Native HTML form mit `action={sculptNlRule}` (Server-Action-Direct-Binding) ODER `onSubmit` + `useTransition`
- **Verification:** RTL-Tests 3 States (initial / success / reject).
- **Dependencies:** MT-1 done

### MT-3: Mount in Mein-Tag-Layout + Server-Side canSculpt-Prop
- **Goal:** Card im V6.6-KI-Workspace-Bereich der Mein-Tag-Page.
- **Files:**
  - `cockpit/src/app/(app)/mein-tag/page.tsx` (MOD) — `const canSculpt = ["admin","teamlead"].includes(role)` + Prop-Weitergabe
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD) — `<NLRuleBuilderCard canSculpt={canSculpt} />` im KI-Workspace-Wrapper
- **Verification:** TSC clean. Lokal `next dev` → /mein-tag rendert Card fuer Admin, nicht fuer Member.
- **Dependencies:** MT-2 done

### MT-4: Bedrock-Cost-Display
- **Goal:** UI-String formatieren: `~$0.003 fuer 1 Versuch` / `~$0.006 fuer 2 Versuche`.
- **Files:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (Erweiterung in MT-2 oder eigene Helper)
- **Expected behavior:** Helper `formatBedrockCost(totalCostUsd, attemptCount): string`. Renders inline unter Karte 1 oder 2.
- **Verification:** RTL-Test: Cost=0.0028 + attempts=1 → `"~$0.003 fuer 1 Versuch"`. Cost=0.0058 + attempts=2 → `"~$0.006 fuer 2 Versuche"`.
- **Dependencies:** MT-2

### MT-5: /qa Playwright-MCP-Live-Smoke
- **Goal:** AC10-Sequenz verifizieren.
- **Verification:** Screenshot + Network-Capture des Sculpt-Calls. Member-Sicht-DOM-Assertion via `browser_evaluate`.
- **Dependencies:** MT-1..MT-4 done + User-Coolify-Deploy

### MT-6: Cockpit-Records-Sync
- **Goal:** SLC-753 done, FEAT-751 bleibt in_progress.
- **Files:**
  - `slices/INDEX.md` (MOD) — SLC-753 → done
- **Dependencies:** MT-5 PASS

## Risks & Mitigations

- **R1** Mein-Tag KI-Workspace-Bereich-Position unklar (Architecture liess offen "rechts oder unten") — **Mitigation:** MT-0 reviewt bestehendes Layout, dann pragmatische Entscheidung (vermutlich rechts, V6.6-Pattern).
- **R2** Server-Action-Direct-Binding via `<form action={sculptNlRule}>` Next.js 15-Pattern — falls Typing-Issues: Fallback auf `onSubmit + useTransition`.
- **R3** Native HTML Form + Server-Action mit Object-Return (`SculptResult`) — Next.js erwartet bei `<form action>` `void | string`-Return. **Mitigation:** Verwende `useTransition + state`-Pattern statt `<form action>` (Pattern aus `feedback_native_html_form_pattern`).

## Dependencies

- **SLC-752 MT-6** Sculptor-Core done
- **V7.1 FEAT-711** Settings-Permission-Layer (`assertRole`-Helper)
- **V6.6 FEAT-661** Mein-Tag KI-Workspace-Hybrid-Layout

## Verification & Tests

- TSC clean
- Vitest 5 Tests gruen (3 Card-States + 2 Action-Tests)
- Live-Smoke MT-5 PASS
- Cost-Anzeige korrekt formatiert
- Member-Hide verifiziert

## Open Points

- Schema-Karten-Form-Component-Reuse: gibt es schon einen V6.2-Wizard-Step-4-Component? **Antwort wird in MT-0 geklaert.** Wenn ja: Reuse. Wenn nein: minimal inline-Form mit shadcn-Inputs.

## Files Reviewed (Slice-Planning)

- Memory `feedback_native_html_form_pattern.md` (Form-Pattern)
- Memory `feedback_use_server_value_export_forbidden.md` (Server-Action-Export-Regel)
- Memory `feedback_ki_workspace_pattern.md` (V6.6-KI-Workspace-Layout)
- `docs/ARCHITECTURE.md` V7.5-Section (Mein-Tag-Mount-Punkt)

## Recommended Implementation Skill

`/frontend` fuer MT-0..MT-4 (Component + Server-Action-Wire + Mount).
`/qa` fuer MT-5 Live-Smoke.
