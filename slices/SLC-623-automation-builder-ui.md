# SLC-623 — Workflow-Automation Builder-UI (Listing + 4-Step-Form + Trockenlauf)

## Meta
- Feature: FEAT-621
- Priority: High
- Status: planned
- Created: 2026-05-05
- Estimated Effort: 5-7h

## Goal

Den letzten V6.2-Workflow-Slice live schalten: User-faehige Builder-UI zum Anlegen, Editieren, Aktivieren und Pausieren von Automation-Rules. Listing unter `/settings/automation` zeigt alle Regeln mit Status-Badge, last_run_at, Erfolgs-Quote letzte 7 Tage. Editor unter `/settings/automation/[id]/edit` (oder `/new`) ist ein Forms-basierter 4-Step-Builder (Trigger → Conditions → Actions → Aktivieren+Trockenlauf). Trockenlauf-Modul (`dry-run.ts`) macht read-only SQL-Query gegen Source-Tabellen (audit_log, deals, activities) der letzten 30 Tage und zeigt Treffer-Liste in Step 4 ohne Schreib-Side-Effects (DEC-132). Style Guide V2 verbindlich (Card-Layout, Form-Field-Pattern, Badge-Komponente aus `/settings/payment-terms`).

Mit Abschluss von SLC-623 ist FEAT-621 vollstaendig — Engine + UI live, V6.2 zu 50% durch (Workflow-Block fertig). Anschliessend SLC-624 + SLC-625 fuer FEAT-622 Attribution-Block.

## Scope

- **Trockenlauf-Modul** (`cockpit/src/lib/automation/dry-run.ts` neu, DEC-132):
  ```typescript
  export interface DryRunHit {
    entity_id: string;
    entity_label: string;  // z.B. "Deal: Neuer Kunde X" oder "Activity: Call vom 2026-04-12"
    entity_url: string;    // Link zur Entity im Workspace
    matched_at: string;    // ISO timestamp aus audit_log oder created_at
    would_run_actions: ActionPreview[];
  }
  export interface ActionPreview {
    type: ActionType;
    summary: string;  // z.B. "create_task: 'Angebot vorbereiten' an Deal-Owner"
  }
  export async function dryRunRule(rule: AutomationRule, daysBack: number = 30): Promise<DryRunHit[]>;
  ```
  - Source-Query je nach trigger_event:
    - `deal.stage_changed` → SELECT FROM audit_log WHERE entity_type='deal' AND action='stage_change' AND created_at > now() - interval '$daysBack days' LIMIT 5000
    - `deal.created` → SELECT FROM deals WHERE created_at > ... LIMIT 5000
    - `activity.created` → SELECT FROM activities WHERE created_at > ... LIMIT 5000
  - Fuer jeden Treffer: App-Level-Condition-Match via condition-engine.ts (Reuse aus SLC-621)
  - Result: Liste aller Treffer mit `would_run_actions` (Action-Preview-Render ohne Execute)
  - Result-Limit fuer UI: 100 Eintraege (slice + count "+ N weitere")
  - **Read-only**: KEINE INSERT/UPDATE waehrend Dry-Run. Test-AC verifiziert das via DB-Snapshot vor und nach.
- **Listing-Page** (`cockpit/src/app/(app)/settings/automation/page.tsx` neu):
  - Header: "Workflow-Automation" + Description + "Neue Regel"-Button
  - Tabelle/Card-Liste aller Regeln (Style Guide V2 Card-Layout):
    - Name + Description-Snippet
    - Status-Badge (active|paused|disabled mit Color-Coding)
    - paused_reason (wenn paused)
    - Trigger-Event-Label (deutsche Uebersetzung: "Wenn Deal in Stage X")
    - last_run_at relative (z.B. "vor 2 Stunden") + last_run_status-Badge
    - Erfolgs-Quote letzte 7 Tage: `success / (success + partial_failed + failed)` als Percentage-Badge
    - Action-Buttons: Edit (Link), Toggle (Pause/Activate Server-Action mit optimistic update), Delete (Confirm-Dialog)
  - Empty-State: "Keine Regeln angelegt — Lege deine erste Workflow-Regel an um Routine-Reaktionen zu automatisieren." + Primary-Button
  - Loading-State + Error-State (Style Guide V2 patterns)
- **Editor-Page** (`cockpit/src/app/(app)/settings/automation/[id]/edit/page.tsx` + `cockpit/src/app/(app)/settings/automation/new/page.tsx` neu):
  - 4-Step-Form-Wizard mit Step-Indicator oben (Style Guide V2 Stepper-Pattern oder fallback Card-Header-Tabs)
  - **Step 1 — Trigger waehlen**:
    - Radio-Group mit 3 Trigger-Typen + Beschreibung: deal.stage_changed, deal.created, activity.created
    - Sub-Form je nach Auswahl:
      - deal.stage_changed → Pipeline-Picker (existing Component) + Stage-Picker (filtered nach Pipeline)
      - deal.created → Pipeline-Picker (optional, default: alle Pipelines)
      - activity.created → Activity-Type-Multiselect (call|email|meeting|note|task|briefing)
  - **Step 2 — Conditions**:
    - Add-Row-Liste: Field-Picker + Op-Picker + Value-Input (3 columns Card-Layout). Field-Picker zeigt entity-spezifische Felder ungroupiert mit Help-Tooltips.
    - 0..N Conditions, AND-only (UI-Hint "Alle Bedingungen muessen erfuellt sein")
    - Remove-Row-Button pro Condition
  - **Step 3 — Actions**:
    - Add-Row-Liste mit 4 Action-Type-Buttons (Plus-Icons): create_task, send_email_template, create_activity, update_field
    - Pro Action: Sub-Form (Title-Input mit {{var}}-Placeholder-Tipp, Owner-Picker fuer create_task, Template-Picker fuer send_email_template usw.)
    - Reorder via Up/Down-Buttons (UI-Drag&Drop nicht V1-Scope)
    - Remove-Action-Button
  - **Step 4 — Aktivieren + Trockenlauf**:
    - Save-Draft-Button (status='paused')
    - Save-and-Activate-Button (status='active')
    - "Trockenlauf 30 Tage"-Button — ruft `dryRunRule(rule)` Server-Action, zeigt Result inline:
      - "Letzte 30 Tage haetten 14 Mal getriggert:"
      - Liste max 100 Hits mit entity_label + matched_at + Action-Preview
      - "+ N weitere..." Hint wenn mehr
    - Empty-Trockenlauf: "In den letzten 30 Tagen waeren keine Treffer entstanden — pruefe Trigger und Conditions"
  - Server-Action-Submit: ruft existing saveAutomationRule (SLC-621), revalidatePath, redirect zu /settings/automation
  - Cancel-Button kehrt zu Listing zurueck (Confirm-Dialog wenn ungesicherte Aenderungen)
- **Step-Indicator-Component** (`cockpit/src/app/(app)/settings/automation/_components/step-indicator.tsx` neu):
  - Zeigt 4 Steps mit current-Highlight, completed-Checkmarks
  - Click-to-jump-back zu vorherigem Step
- **Field-Picker-Component** (`cockpit/src/app/(app)/settings/automation/_components/field-picker.tsx` neu):
  - Dropdown-Liste der entity-Felder fuer Conditions
  - Pro Field: deutsche Label-Uebersetzung + Tooltip mit Datentyp + Beispielwert
  - Reused fuer Field-Whitelist von update_field-Action
- **Action-Form-Components** (4 Sub-Forms in `cockpit/src/app/(app)/settings/automation/_components/actions/`):
  - `CreateTaskForm.tsx`, `SendEmailTemplateForm.tsx`, `CreateActivityForm.tsx`, `UpdateFieldForm.tsx`
- **Trockenlauf-Render-Component** (`cockpit/src/app/(app)/settings/automation/_components/dry-run-result.tsx` neu):
  - Rendert DryRunHit-Array als Card-Liste (Style Guide V2)
  - Pro Hit: entity_label (Link zur Entity), matched_at (relative Zeit), Action-Preview-Liste
  - Skeleton-Loader waehrend `dryRunRule` runs
- **Wiring zu Server-Actions** (existing aus SLC-621 + neue in SLC-623):
  - listAutomationRules (existing) — fuer Listing-Page (Server Component oder useSWR)
  - saveAutomationRule (existing) — Editor-Submit
  - pauseAutomationRule + activateAutomationRule (existing) — Toggle-Button im Listing
  - deleteAutomationRule (existing) — Delete-Confirm-Dialog
  - **Neu:** Server Action `runDryRun(rule)` als thin Wrapper um `dryRunRule(rule)` (kein DB-Schreib, nur Read)
- **Permissions / Auth**: Routen unter `/settings/automation` schon via existing layout-auth-check geschuetzt.
- **Style Guide V2 verbindlich** (per `feedback_style_guide_v2_mandatory.md`): Card-Layout, Badge-Component, Form-Field-Pattern, Toast-Component aus `/settings/payment-terms` als Referenz.
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-623 Status `planned -> done`
  - `features/INDEX.md`: FEAT-621 Status `in_progress -> done` (Workflow-Block komplett)
  - `planning/backlog.json`: BL-135 Status `in_progress -> done`
  - `docs/STATE.md`: naechste = SLC-624

## Out of Scope

- Drag&Drop-Node-Graph-Editor (V6.2 Out-of-Scope laut FEAT-621)
- OR/Gruppierung-Conditions (V6.2 Out-of-Scope)
- Multi-Step-Sequence mit Wartezeiten (V6.2 Out-of-Scope)
- Regel-Templates-Marketplace (V6.2 Out-of-Scope)
- A/B-Testing (V6.2 Out-of-Scope)
- Trigger-Audit-Log-Detail-View pro Run (eventuell V6.3 Backlog wenn UX-Wunsch)
- Mobile-Optimierung der Builder-UI (Desktop-first, Mobile-View muss zumindest Listing rendern, Editor darf Desktop-only sein in V1)

## Acceptance Criteria

- AC1: `/settings/automation` rendert Listing aller Regeln mit Status-Badge, last_run_at, Erfolgs-Quote.
- AC2: Empty-State zeigt aussagekraeftigen Hint + Primary-Button "Neue Regel".
- AC3: Toggle-Button im Listing pausiert/aktiviert ohne Editor-Roundtrip (optimistic update).
- AC4: Delete-Button mit Confirm-Dialog loescht Regel + automation_runs (CASCADE).
- AC5: Editor unter `/new` rendert leere 4-Step-Form.
- AC6: Editor unter `/[id]/edit` rendert vorhandene Regel-Daten in 4-Step-Form (Round-Trip-Save behaviour).
- AC7: Step 1 zeigt 3 Trigger-Optionen mit Sub-Form fuer deal.stage_changed (Pipeline + Stage-Picker), deal.created (Pipeline-Picker), activity.created (Activity-Type-Multiselect).
- AC8: Step 2 erlaubt 0..N Conditions, jede mit Field-Picker + Op-Picker + Value-Input. AND-only Hint.
- AC9: Step 3 erlaubt 1..N Actions mit 4 Action-Type-Buttons. Pro Action passendes Sub-Form. Reorder via Up/Down.
- AC10: Step 4 zeigt Save-Draft + Save-and-Activate Buttons. Trockenlauf-Button laeuft `dryRunRule` und zeigt Result inline.
- AC11: Trockenlauf macht KEINE DB-Schreibvorgaenge (verifiziert via Vitest mit DB-Snapshot vor/nach).
- AC12: Trockenlauf zeigt max 100 Hits + Counter "+ N weitere..." wenn mehr.
- AC13: Trockenlauf bei leerer Result-Set zeigt "Keine Treffer in letzten 30 Tagen — pruefe Trigger und Conditions".
- AC14: Save-Submit ruft saveAutomationRule mit serverseitiger Validation, revalidatePath, redirect zu Listing.
- AC15: Cancel mit ungesicherten Aenderungen zeigt Confirm-Dialog.
- AC16: Field-Picker zeigt nur entity-relevante Felder mit deutschen Labels + Tooltips.
- AC17: update_field-Action-Form zeigt nur Whitelist-Felder (verifiziert gegen field-whitelist.ts).
- AC18: send_email_template-Action-Form rendert Template-Picker mit V5.3 email_templates-Liste.
- AC19: TypeScript-Build (`npm run build`) gruen.
- AC20: Vitest (`npm run test`) gruen — neue Tests fuer dry-run.ts, plus Server-Component-Tests (Pages rendern ohne Crash).
- AC21: ESLint (`npm run lint`) gruen.
- AC22: Browser-Smoke Desktop: Vollstaendiger Workflow durchfuehrbar (Listing → New → 4 Steps durch → Save → Trockenlauf → Activate).
- AC23: Browser-Smoke Mobile: Listing rendert sauber, Editor zeigt Hinweis "Builder fuer Desktop optimiert" wenn Mobile.

## Dependencies

- SLC-621 (Foundation) — Schema, Server Actions, Types, condition-engine
- SLC-622 (Engine) — Engine ist live, sodass Activate auch echt triggert
- V5.3 SLC-531 email_templates-Tabelle + Template-Picker-Pattern (Reuse)
- V5.6 BL-403 Style Guide V2 Definitionen + Card/Badge/Form-Field Patterns aus `/settings/payment-terms`
- V2 Pipeline-Settings — Stage-Picker-Component (Reuse)

## Risks

- **Risk:** Dry-Run gegen audit_log liefert keine Resultate weil audit_log historisch nur sparsam befuellt wurde.
  Mitigation: V5.x hat audit_log breit befuellt (deal-stage-change, activity-create, etc.). Wenn doch Luecken vorhanden sind: User-Test in /qa zeigt das, Test-Cases in audit_log_v5x sind ausreichend dokumentiert. Trockenlauf-Empty-State erklaert "Keine Treffer".
- **Risk:** Builder-UI rendert auf Mobile broken (4-Step-Form mit langen Listen).
  Mitigation: Listing ist responsive (Card-Layout passt sich an). Editor zeigt Hinweis "Builder fuer Desktop optimiert" wenn Mobile (per useMediaQuery). User kann am Desktop fortsetzen. AC23 verifiziert das.
- **Risk:** Field-Picker zeigt veraltete Felder weil Schema-Migration neue Felder einfuehrt.
  Mitigation: Field-Picker liest aus field-whitelist.ts (single source of truth). Schema-Aenderungen erfordern Whitelist-Update im selben PR. Reviewable.
- **Risk:** Trockenlauf-Performance auf grosseren audit_log (>50k Eintraege).
  Mitigation: SQL-Query mit LIMIT 5000 + Index auf audit_log(entity_type, action, created_at) (existing). V1 Single-User mit ~10k audit_log = OK.
- **Risk:** Save-Submit mit invalider Rule (z.B. Trigger leer) crashed Server-Action.
  Mitigation: Form-Validation client-side (mandatory fields per Step), serverseitig saveAutomationRule rejected mit aussagekraeftiger Error. AC14 verifiziert Roundtrip.
- **Risk:** Toggle-Button optimistic update zeigt Status falsch wenn Server-Action failed.
  Mitigation: Toggle nutzt useOptimistic (React 18+) mit Revert bei Error. Toast zeigt Error wenn nicht persistiert. AC3 verifiziert das.
- **Risk:** UI ist nicht style-guide-V2-konform und sieht fragmentiert aus.
  Mitigation: Reuse-Components aus `/settings/payment-terms` als 1:1-Vorlage. Code-Review pruepft Karten-Padding, Badge-Color, Form-Field-Spacing. AC22 verifiziert Browser-Smoke.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/lib/automation/dry-run.ts` | NEU — dryRunRule mit Source-Query + Condition-Eval |
| `cockpit/src/lib/automation/__tests__/dry-run.test.ts` | NEU — Vitest gegen Coolify-DB (Read-Only-Verifikation) |
| `cockpit/src/app/(app)/settings/automation/page.tsx` | NEU — Listing-Page (Server Component) |
| `cockpit/src/app/(app)/settings/automation/new/page.tsx` | NEU — Editor-Page fuer neue Regel |
| `cockpit/src/app/(app)/settings/automation/[id]/edit/page.tsx` | NEU — Editor-Page fuer existierende Regel |
| `cockpit/src/app/(app)/settings/automation/_components/rule-list.tsx` | NEU — Listing-Component |
| `cockpit/src/app/(app)/settings/automation/_components/rule-toggle.tsx` | NEU — Toggle-Button mit useOptimistic |
| `cockpit/src/app/(app)/settings/automation/_components/rule-delete-button.tsx` | NEU — Delete + Confirm-Dialog |
| `cockpit/src/app/(app)/settings/automation/_components/rule-builder.tsx` | NEU — 4-Step-Form-Wizard (Container) |
| `cockpit/src/app/(app)/settings/automation/_components/step-indicator.tsx` | NEU — 4-Step Progress-Indicator |
| `cockpit/src/app/(app)/settings/automation/_components/step-trigger.tsx` | NEU — Step 1 |
| `cockpit/src/app/(app)/settings/automation/_components/step-conditions.tsx` | NEU — Step 2 |
| `cockpit/src/app/(app)/settings/automation/_components/step-actions.tsx` | NEU — Step 3 |
| `cockpit/src/app/(app)/settings/automation/_components/step-activate.tsx` | NEU — Step 4 mit Trockenlauf-Button |
| `cockpit/src/app/(app)/settings/automation/_components/field-picker.tsx` | NEU — Wiederverwendbar fuer Conditions + update_field-Action |
| `cockpit/src/app/(app)/settings/automation/_components/actions/create-task-form.tsx` | NEU |
| `cockpit/src/app/(app)/settings/automation/_components/actions/send-email-template-form.tsx` | NEU |
| `cockpit/src/app/(app)/settings/automation/_components/actions/create-activity-form.tsx` | NEU |
| `cockpit/src/app/(app)/settings/automation/_components/actions/update-field-form.tsx` | NEU |
| `cockpit/src/app/(app)/settings/automation/_components/dry-run-result.tsx` | NEU — Trockenlauf-Result-Renderer |
| `cockpit/src/app/(app)/settings/automation/actions.ts` | MODIFY — runDryRun Server-Action ergaenzen |
| `cockpit/src/app/(app)/settings/automation/_components/__tests__/rule-builder.test.tsx` | NEU — Component-Tests |
| `slices/INDEX.md` | MODIFY |
| `features/INDEX.md` | MODIFY — FEAT-621 done |
| `planning/backlog.json` | MODIFY — BL-135 done |
| `docs/STATE.md` | MODIFY — naechste = SLC-624 |

## Micro-Tasks

#### MT-1: Dry-Run-Modul implementieren
- Goal: `dryRunRule(rule, daysBack)` mit Source-Query je Trigger + Condition-Eval.
- Files: `cockpit/src/lib/automation/dry-run.ts`, `cockpit/src/lib/automation/__tests__/dry-run.test.ts`
- Expected behavior: Async-Function mit 3 Source-Branches (audit_log, deals, activities). LIMIT 5000 in Query, App-Side Condition-Match, Result-Slice 100 Hits. Read-Only-Verifikation: Vitest snapshot der Tabellen vor/nach Run.
- Verification: Vitest 3 Cases — deal.stage_changed Hit, deal.created Hit, leere Result-Set. DB-Snapshot vor/nach identisch.
- Dependencies: SLC-621 + SLC-622 abgeschlossen

#### MT-2: Listing-Page + Components
- Goal: `/settings/automation` Listing mit Card-Liste + Toggle + Delete.
- Files: `cockpit/src/app/(app)/settings/automation/page.tsx`, `_components/rule-list.tsx`, `_components/rule-toggle.tsx`, `_components/rule-delete-button.tsx`
- Expected behavior: Server-Component holt Rules via listAutomationRules, rendert Card-Liste. Toggle-Component nutzt useOptimistic + Server-Action pauseAutomationRule/activateAutomationRule. Delete-Button mit AlertDialog + Server-Action deleteAutomationRule.
- Verification: Browser-Smoke Listing rendert > 0 Regeln, Toggle wechselt Status sichtbar (revalidatePath), Delete entfernt Card.
- Dependencies: none (Server-Actions aus SLC-621 existing)

#### MT-3: Step-Indicator + Editor-Container
- Goal: 4-Step-Wizard-Container mit step-state + navigation.
- Files: `cockpit/src/app/(app)/settings/automation/_components/step-indicator.tsx`, `_components/rule-builder.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`
- Expected behavior: rule-builder.tsx ist Client-Component mit useState (currentStep, ruleDraft). Pages laden initial-Daten (leer fuer /new, vorhandene Rule fuer /[id]/edit). Step-Indicator ist Stateless-Component, click-to-jump-back zu vorherigem Step.
- Verification: Browser-Smoke /new rendert Step 1, navigation Next geht zu Step 2, Back kommt zurueck. /[id]/edit lade existing Rule, alle 4 Steps zeigen vorbelegte Werte.
- Dependencies: MT-2 (Listing fuer Edit-Link)

#### MT-4: Step 1 — Trigger-Form
- Goal: Trigger-Auswahl + Sub-Form je nach Auswahl.
- Files: `cockpit/src/app/(app)/settings/automation/_components/step-trigger.tsx`
- Expected behavior: Radio-Group fuer 3 Trigger-Typen. Sub-Form: deal.stage_changed → existing Pipeline-Picker + Stage-Picker (per pipelineId state). deal.created → optional Pipeline-Picker. activity.created → Activity-Type-Multiselect.
- Verification: Browser-Smoke alle 3 Trigger-Optionen waehlbar, Sub-Form rendert korrekt. Form-Submit setzt rule.trigger_event + trigger_config.
- Dependencies: MT-3

#### MT-5: Step 2 — Conditions-Form mit Field-Picker
- Goal: Conditions-Liste mit Add/Remove-Row + Field-Picker.
- Files: `cockpit/src/app/(app)/settings/automation/_components/step-conditions.tsx`, `_components/field-picker.tsx`
- Expected behavior: Field-Picker als Dropdown mit deutschen Labels (zentrale Konstante `FIELD_LABELS`). Op-Picker abhaengig von Field-Type (string → eq/neq/in, number → eq/gt/lt/gte/lte, array → contains). Value-Input angepasst (text/number/multi-select). Add-Row append zu rule.conditions, Remove-Row splice.
- Verification: Browser-Smoke 0 Conditions waehlbar, 1 add → richtiges Sub-Form, Save persistiert. AND-only Hint sichtbar.
- Dependencies: MT-3

#### MT-6: Step 3 — Actions-Form mit 4 Sub-Forms
- Goal: Actions-Liste mit 4 Sub-Form-Components.
- Files: `cockpit/src/app/(app)/settings/automation/_components/step-actions.tsx`, `_components/actions/{create-task,send-email-template,create-activity,update-field}-form.tsx`
- Expected behavior: 4 Plus-Buttons fuer Action-Types. Pro Action: Sub-Form mit type-spezifischen Inputs. Reorder via Up/Down (rule.actions array swap). Remove-Button. update-field-form nutzt Field-Picker (Whitelist-only).
- Verification: Browser-Smoke 4 Actions waehlbar, jedes Sub-Form rendert. Reorder via Up/Down sichtbar. Remove entfernt Action.
- Dependencies: MT-5 (Field-Picker reused in update-field-form)

#### MT-7: Step 4 — Activate + Trockenlauf
- Goal: Save-Buttons + Trockenlauf-Button + Result-Render.
- Files: `cockpit/src/app/(app)/settings/automation/_components/step-activate.tsx`, `_components/dry-run-result.tsx`, `actions.ts` MODIFY (runDryRun)
- Expected behavior: Save-Draft-Button (status='paused') + Save-and-Activate-Button (status='active'). Trockenlauf-Button ruft Server-Action runDryRun, zeigt Result inline (Skeleton waehrend Loading, Card-Liste danach, Empty-State wenn 0 Hits).
- Verification: Browser-Smoke Save-Draft persistiert mit status='paused', Save-and-Activate mit status='active'. Trockenlauf zeigt Hits-Liste oder Empty-State.
- Dependencies: MT-1, MT-6

#### MT-8: Cancel-Confirm-Dialog
- Goal: Cancel-Button mit Confirm-Dialog wenn Aenderungen ungesichert.
- Files: `cockpit/src/app/(app)/settings/automation/_components/rule-builder.tsx` (MODIFY)
- Expected behavior: useState dirty-flag (true sobald rule.X aendert). Cancel-Button: wenn dirty → AlertDialog "Aenderungen verwerfen?". Wenn confirm → router.push zu /settings/automation.
- Verification: Browser-Smoke Cancel ohne Aenderungen → direkt zurueck. Cancel mit Aenderung → Confirm-Dialog.
- Dependencies: MT-3

#### MT-9: Component-Tests + Build-Smoke
- Goal: Vitest fuer kritische Components.
- Files: `cockpit/src/app/(app)/settings/automation/_components/__tests__/rule-builder.test.tsx`
- Expected behavior: Render-Tests fuer rule-builder mit 2 Mock-Rules (empty, vollstaendig). Field-Picker zeigt korrekte Labels. update-field-form zeigt nur Whitelist-Felder.
- Verification: `npm run test` gruen.
- Dependencies: MT-3..MT-7

#### MT-10: Mobile-Hint + Browser-Smoke
- Goal: Mobile-Hinweis + vollstaendiger Desktop-Smoke.
- Files: `cockpit/src/app/(app)/settings/automation/_components/rule-builder.tsx` (MODIFY)
- Expected behavior: useMediaQuery `(max-width: 768px)`, wenn Mobile + auf Editor-Page → Hint-Card "Builder fuer Desktop optimiert" mit Link zurueck zu Listing. Listing ist responsive Card-Layout.
- Verification: Browser-Smoke /new in Mobile-Viewport zeigt Hint, Listing rendert sauber. Desktop-Smoke vollstaendiger Workflow Listing → New → 4 Steps → Trockenlauf → Activate.
- Dependencies: MT-9

#### MT-11: Cockpit-Records aktualisieren + commit
- Goal: STATE.md, slices/INDEX.md, features/INDEX.md, backlog.json + RPT-XXX.
- Files: `slices/INDEX.md`, `features/INDEX.md`, `planning/backlog.json`, `docs/STATE.md`, `reports/RPT-XXX.md`
- Expected behavior: SLC-623 done, FEAT-621 done, BL-135 done, STATE.md naechste = SLC-624.
- Verification: git diff zeigt 5 modifizierte Files + 1 RPT. Commit-Push.
- Dependencies: MT-1..MT-10 abgeschlossen

## QA-Fokus (fuer /qa SLC-623)

- **Listing-Smoke**: `/settings/automation` rendert leeres Empty-State wenn 0 Rules; rendert Card-Liste mit Status-Badge wenn Rules existieren.
- **Editor-Workflow**: 4-Step-Form vollstaendig durchgehen mit Test-Regel "wenn Stage-Change zu Won dann create_task 'Onboarding starten'". Save-Draft + Save-and-Activate testen.
- **Trockenlauf-Smoke**: Trockenlauf gegen Test-Rule, Result-Liste rendert, DB unveraendert (manueller SELECT vor/nach).
- **Field-Picker-Tests**: Field-Picker zeigt Whitelist-Felder, KEINE PII-Felder fuer update_field-Action-Form.
- **Toggle-Smoke**: Toggle-Button im Listing aktiviert/pausiert ohne Roundtrip.
- **Delete-Smoke**: Delete-Confirm-Dialog erscheint, Confirm loescht Rule + automation_runs CASCADE.
- **Mobile-Smoke**: Listing rendert sauber, Editor zeigt Hint.
- **End-to-End**: Editor-Workflow → Activate → manueller Stage-Change auf Test-Deal → automation_runs-Entry + Action-Side-Effect (Activity-Insert) sichtbar.
- **TypeScript + Vitest + ESLint**: gruen.
- **Style Guide V2**: Card-Padding, Badge-Color, Form-Field-Spacing visuell konsistent zu `/settings/payment-terms`.
