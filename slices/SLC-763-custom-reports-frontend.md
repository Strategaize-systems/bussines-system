# SLC-763 — Custom-Reports Frontend (FEAT-762 Frontend)

## Metadata
- **Slice ID:** SLC-763
- **Version:** V7.6
- **Feature:** FEAT-762 Custom-Reports im KI-Workspace
- **Status:** planned
- **Priority:** High (schliesst V7.6, FEAT-762 End-to-End)
- **Created:** 2026-05-19
- **Estimated Effort:** ~2-4h Code + ~30 Min /qa + Live-Smoke = ~3-5h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (4 neue Komponenten + 1 AnswerPane-Patch + 1 KIWorkspace-Wire-Up)
- **Pattern-Reuse:**
  - Native HTML Form-Pattern aus `feedback_native_html_form_pattern` (Save-Modal nutzt `<form action={saveCustomReport}>` + `useTransition`).
  - V2-Sidebar-Layout-Treue aus `feedback_v2_sidebar_pflicht`.
  - Brand-Tokens aus V6.5 Theming-Sprint (kein neuer Custom-Hex).
  - Type-Ahead-Filter-Pattern: einfache case-insensitive `.toLowerCase().includes()`-Filter, kein extra Lib.
- **Reihenfolge-Pflicht:** SLC-761 + SLC-762 DONE als Voraussetzung. **Letzter V7.6-Slice** — nach DONE folgt Gesamt-/qa V7.6 + /final-check.

## Why

FEAT-762 Frontend baut auf SLC-762 Backend (5 Server-Actions + Schema) und SLC-761 Workspace-Refactor (Mode-Switch). User-Flow nach DONE: freie Frage stellen → KI-Antwort → "Als Bericht speichern" → Name vergeben → Bericht erscheint in "Meine Berichte"-Dropdown → spaeter wiederverwenden.

Architektur-Entscheidungen aus V7.6 /architecture (RPT-467):
- **DEC-216** Save-Trigger nach Bedrock-Result + nur bei Free-Form-Frage. Save-Button rendert NICHT bei Standard-Berichten, NL-Builder-Mode, oder Custom-Report-Ausfuehrung.
- **DEC-217** Mode-Switch im KIWorkspace bleibt aus SLC-761. AnswerPane bekommt nur eine kleine `onSaveAsReport`-Prop.
- **DEC-218** "Meine Berichte"-Dropdown rechts neben Standard-Buttons im KIWorkspace.

## Scope

**In Scope:**

- **AnswerPane.tsx** ([cockpit/src/components/ki-workspace/AnswerPane.tsx](cockpit/src/components/ki-workspace/AnswerPane.tsx)):
  - Zusaetzlicher optionaler Prop `onSaveAsReport?: () => void`.
  - Render-Block: wenn `onSaveAsReport && result` → "Als Bericht speichern"-Button neben "Aktualisieren"-Button (gleicher Header-Bar-Container).
  - data-testid `answer-pane-save-as-report`.
- **SaveCustomReportModal.tsx** ([cockpit/src/components/ki-workspace/save-custom-report-modal.tsx](cockpit/src/components/ki-workspace/save-custom-report-modal.tsx) NEU):
  - Native HTML Form (`<form action={saveCustomReport}>`) + `useTransition`.
  - Pflicht-Felder: `name` (text, 2-80 chars).
  - Optional: `description` (textarea).
  - Hidden Fields: `prompt_template`, `context_type` (aus Parent-Props).
  - Submit-Handler: ruft Server-Action, bei `{ ok: false, code: "duplicate_name" }` zeigt Error-Hint inline. Bei Success: schliesst Modal + ruft `onSaved`-Callback (Parent refresht Dropdown-Liste).
  - Brand-Tokens (kein neuer Hex), V6.5-Theme-konform.
- **MeineBerichteDropdown.tsx** ([cockpit/src/components/ki-workspace/meine-berichte-dropdown.tsx](cockpit/src/components/ki-workspace/meine-berichte-dropdown.tsx) NEU):
  - Trigger-Button rechts neben Standard-Workspace-Buttons (nach NL-Builder-Button).
  - Klick oeffnet Dropdown-Panel mit:
    - Empty-State (0 Items): Hint "Stelle eine freie Frage und speichere die Antwort als Bericht."
    - 1-5 Items: einfache Liste, jeder Eintrag = Name + last_used_at-Postfix ("vor 3 Tagen").
    - 6+ Items: Type-Ahead-Filter-Input am Top (`case-insensitive includes(name)`).
  - Klick auf Item: ruft `runCustomReport({ id })` → setzt `selectedReport`-State im Workspace-Parent → AnswerPane rendert Result.
  - ⋮-Sub-Menu pro Item: "Umbenennen" + "Loeschen" mit Confirm-Dialog ("Bericht 'XYZ' loeschen?").
  - Server-Side: `listCustomReports({ context_type })` als initialer Load via Server-Component-Wrapper.
- **CustomReportRenameInline.tsx** ([cockpit/src/components/ki-workspace/custom-report-rename-inline.tsx](cockpit/src/components/ki-workspace/custom-report-rename-inline.tsx) NEU oder Inline-Bestandteil von MeineBerichteDropdown):
  - Inline-Edit-Input fuer Rename. Bei Submit: `renameCustomReport({ id, name })`. Bei UNIQUE-Conflict: Inline-Error.
- **KIWorkspace.tsx** ([cockpit/src/components/ki-workspace/KIWorkspace.tsx](cockpit/src/components/ki-workspace/KIWorkspace.tsx)) (MOD):
  - Wire-Up: `<MeineBerichteDropdown>` rechts neben Standard-Buttons-Row.
  - `onSaveAsReport`-Prop an AnswerPane setzen nur wenn `selectedReport?.id === FREE_QUESTION_REPORT_ID && reportRun.result`.
  - Klick auf Save-Button oeffnet `<SaveCustomReportModal>` mit `prompt_template = inputText`, `context_type = context === "mein-tag" ? "mein-tag" : "cockpit"`.
  - Klick auf Dropdown-Item: setzt `selectedReport = { id: "custom-<id>", label: name, serverActionPath: "", cacheable: false }` + ruft Custom-Report-Runner via reportRunner-Injection-Pattern.
- **Tests:**
  - Vitest RTL fuer Save-Modal (Native Form Submit + 409-Error-Hint).
  - Vitest RTL fuer Dropdown (Empty + 1-5 Items + 6+ mit Type-Ahead + Rename + Delete-Confirm).
  - Vitest fuer AnswerPane Save-Button-Sichtbarkeit (4 Cases gemaess DEC-216).
  - Vitest fuer KIWorkspace Save-Button-Pass-Through.

**Out of Scope:**

- Custom-Reports auf `/deal-detail` oder `/team-cockpit` — Defer V7.7+.
- Team-Sharing / Export / Bulk-Operations — Defer V8.
- Per-User-Cost-Cap — Defer V7.7+ wenn Misuse-Pattern auftritt.

## Acceptance Criteria

- **AC1** `AnswerPane.tsx` rendert "Als Bericht speichern"-Button NUR wenn `onSaveAsReport` Prop gesetzt UND `result` vorhanden. Bei `selectedReport.id === FREE_QUESTION_REPORT_ID && reportRun.result` ist Button sichtbar. Bei Standard-Bericht ID nicht sichtbar.
- **AC2** Klick auf "Als Bericht speichern" oeffnet `<SaveCustomReportModal>` mit `prompt_template = inputText` (Free-Form-Frage-Text aus Workspace-Input).
- **AC3** Save-Modal hat Native Form mit `name` (Pflicht, 2-80 chars, Pattern: `[^\s].*[^\s]` minimal) + `description` (optional, Textarea).
- **AC4** Submit ruft `saveCustomReport` Server-Action. Bei Success: Modal schliesst + Toast (oder analoger Hinweis im Modal-Body) + Parent-Dropdown refresht via `router.refresh()` oder Server-State-Refetch.
- **AC5** Bei Duplicate-Name: Server-Action returnt `{ ok: false, code: "duplicate_name" }`, Modal zeigt Inline-Error "Name bereits vergeben". Modal bleibt offen, User kann Name aendern.
- **AC6** `<MeineBerichteDropdown>` rendert rechts neben Standard-Buttons im Workspace-Button-Row.
- **AC7** Empty-State: 0 Custom-Reports → Dropdown-Panel zeigt Hint "Stelle eine freie Frage und speichere die Antwort als Bericht."
- **AC8** 1-5 Items: einfache Liste, jeder Eintrag = Name + last_used_at-Zeitstempel.
- **AC9** 6+ Items: Type-Ahead-Filter-Input am Top, Eingabe filtert client-side case-insensitive auf `name`.
- **AC10** Context-Filter: Dropdown auf `/mein-tag` zeigt nur `context_type='mein-tag'`-Reports. Auf `/dashboard` nur `cockpit`-Reports (kein Mischen).
- **AC11** Klick auf Dropdown-Item triggert `runCustomReport({ id, scope })` → AnswerPane rendert Result. usage_count wird inkrementiert (siehe SLC-762 Backend).
- **AC12** ⋮-Sub-Menu pro Item: "Umbenennen" + "Loeschen". Umbenennen oeffnet Inline-Edit oder kleinen Sub-Modal. Loeschen oeffnet Confirm-Dialog "Bericht 'XYZ' loeschen?" + Submit → `deleteCustomReport`.
- **AC13** Vitest fuer AnswerPane (4 Cases Save-Button-Sichtbarkeit), Save-Modal (Submit + 409-Error-Hint), Dropdown (Empty + 1-5 + 6+ + Filter + Rename + Delete-Confirm) PASS.
- **AC14** Vitest gruen: `npm run test:all` 1100+/1100+ PASS (SLC-761+762-Baseline + V7.6-Frontend-Tests).
- **AC15** TSC + Lint + Build clean.
- **AC16** Playwright-MCP-Live-Smoke gegen Coolify-Deployment (End-to-End):
  - Admin-Login → `/mein-tag` → freie Frage stellen ("Welche Deals haben in den letzten 14 Tagen keine Aktivitaet?") → Send → AnswerPane zeigt Bedrock-Antwort.
  - "Als Bericht speichern"-Button sichtbar → Klick → Save-Modal → Name "Stagnierende Deals 14d" → Save → Toast + Modal zu.
  - "Meine Berichte"-Dropdown enthaelt neuen Eintrag → Klick auf Eintrag → AnswerPane rendert Bedrock-Antwort + usage_count+1 in DB.
  - Rename: ⋮-Sub-Menu → "Umbenennen" → "Stagnierende Deals (14 Tage)" → Save → Dropdown-Liste zeigt neuen Namen.
  - Delete: ⋮-Sub-Menu → "Loeschen" → Confirm → Eintrag weg.
  - SQL-Verifikation: audit_log enthaelt `custom_report.created`, `custom_report.executed`, `custom_report.renamed`, `custom_report.deleted`.
  - Cleanup-DELETE-Transaktion (1 Rule + 4 audit_log-Eintraege).
- **AC17** Context-Filter Live-Smoke: derselbe Custom-Report auf `/dashboard` NICHT sichtbar (Dropdown leer, weil context_type unterschiedlich).

## Micro-Tasks

#### MT-1: AnswerPane.tsx Save-Button-Render mit Sichtbarkeits-Regel

- Goal: AnswerPane rendert Save-Button bei `onSaveAsReport && result`. 4 Sichtbarkeits-Cases per Vitest gedeckt.
- Files:
  - `cockpit/src/components/ki-workspace/AnswerPane.tsx` (MOD)
  - `cockpit/src/components/ki-workspace/__tests__/AnswerPane.test.tsx` (MOD)
- Expected behavior:
  - Neue optionale Prop `onSaveAsReport?: () => void`.
  - Render-Block neben "Aktualisieren"-Button: wenn `onSaveAsReport && result` → `<button data-testid="answer-pane-save-as-report" onClick={onSaveAsReport}><BookmarkPlus className="h-3 w-3" /> Als Bericht speichern</button>`.
  - 4 Vitest-Cases:
    1. `selectedReport.id="freie-frage" && result` → Button sichtbar.
    2. `selectedReport.id="freie-frage" && !result` → Button nicht sichtbar.
    3. `selectedReport.id="tagesanalyse" && result` → Button nicht sichtbar (Parent passt onSaveAsReport nicht).
    4. NL-Builder-Mode → AnswerPane wird gar nicht gerendert (KIWorkspace-Mode-Switch), Test entfaellt.
- Verification:
  - Vitest `npm run test -- AnswerPane` PASS.
  - TSC + Build clean.
- Dependencies: SLC-761 DONE (Workspace-Mode-Switch live), SLC-762 DONE (Server-Actions live)

#### MT-2: SaveCustomReportModal.tsx — Native Form + 409-Handling

- Goal: Modal-Komponente mit Native HTML Form + zod-Validate-Spiegelung + Inline-409-Error.
- Files:
  - `cockpit/src/components/ki-workspace/save-custom-report-modal.tsx` (NEU)
  - `cockpit/src/components/ki-workspace/__tests__/save-custom-report-modal.test.tsx` (NEU)
- Expected behavior:
  - Use Client.
  - Native `<form action={saveCustomReport}>` + `useTransition` (kein react-hook-form, `feedback_native_html_form_pattern`).
  - Inputs: `<input name="name" minLength={2} maxLength={80} required />`, `<textarea name="description" maxLength={1000} />`, `<input type="hidden" name="prompt_template" value={...} />`, `<input type="hidden" name="context_type" value={...} />`.
  - Submit-Handler: Server-Action ruft, bei Success → schliesst Modal + ruft `onSaved`-Callback, bei `{ ok: false, code: "duplicate_name" }` → Inline-Error "Name bereits vergeben" sichtbar.
  - Cancel-Button schliesst Modal ohne Save.
  - Brand-Tokens: `brand-primary` fuer Submit-Button, `border-border` fuer Modal-Container.
- Verification:
  - Vitest: Submit mit gueltigem Name → `onSaved` aufgerufen.
  - Vitest: Submit mit Duplicate-Name (Mock-Server-Action returns 409) → Inline-Error im DOM.
  - TSC + Build clean.
- Dependencies: MT-1 (Pattern-Sync)

#### MT-3: MeineBerichteDropdown.tsx — Empty + Liste + Type-Ahead + Sub-Menu

- Goal: Dropdown-Komponente mit allen Render-States (0/1-5/6+) + Rename/Delete-Sub-Menu.
- Files:
  - `cockpit/src/components/ki-workspace/meine-berichte-dropdown.tsx` (NEU)
  - `cockpit/src/components/ki-workspace/__tests__/meine-berichte-dropdown.test.tsx` (NEU)
- Expected behavior:
  - Trigger-Button mit chevron + Label "Meine Berichte".
  - Klick togglet Dropdown-Panel.
  - Panel-States:
    - 0 Items → Hint "Stelle eine freie Frage und speichere die Antwort als Bericht."
    - 1-5 Items → einfache Liste, jeder Eintrag = Name + last_used_at-Postfix via `formatDistanceToNow`-Helper (oder einfache Diff-Berechnung).
    - 6+ Items → `<input placeholder="Filter ...">` am Top + gefilterte Liste (`.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()))`).
  - Klick auf Item: ruft `onSelect(report)`-Callback (Parent-Wire-Up in MT-4).
  - ⋮-Icon pro Item: oeffnet Sub-Menu "Umbenennen" / "Loeschen".
    - Umbenennen: Inline-Edit-Input (oder Sub-Modal) → `renameCustomReport({ id, name })`.
    - Loeschen: Confirm-Dialog "Bericht 'X' loeschen?" → `deleteCustomReport({ id })`.
  - Initial-Data: via Server-Component-Wrapper oder Client-Side Server-Action-Call mit `listCustomReports({ context_type })` (TBD in MT-4 wo das gefetched wird; entscheiden ob Workspace-Server-Component die Liste laedt und als Prop reinreicht oder Dropdown selbst Server-Action ruft).
- Verification:
  - Vitest: 0 Items → Hint sichtbar.
  - Vitest: 3 Items → 3 Eintraege.
  - Vitest: 7 Items + filter "stag" → 1 Eintrag (case-insensitive).
  - Vitest: Klick ⋮ → Loeschen → Confirm → `deleteCustomReport` aufgerufen.
- Dependencies: MT-2 (Modal-Pattern als Vorbild)

#### MT-4: KIWorkspace.tsx Wire-Up + Server-Component-Data-Loading

- Goal: KIWorkspace integriert Dropdown + Save-Modal + Save-Button-onClick + Custom-Report-Run-Pfad.
- Files:
  - `cockpit/src/components/ki-workspace/KIWorkspace.tsx` (MOD)
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD — `customReports`-Prop reinreichen)
  - `cockpit/src/app/(app)/mein-tag/page.tsx` (MOD — Server-Component-Side `listCustomReports({ context_type: "mein-tag" })`)
  - `cockpit/src/app/(app)/dashboard/page.tsx` (MOD — analog fuer `context_type: "cockpit"`)
  - `cockpit/src/components/ki-workspace/__tests__/KIWorkspace.test.tsx` (MOD)
- Expected behavior:
  - Server-Component `page.tsx` ruft `listCustomReports({ context_type })` und reicht als Prop in den Client.
  - `KIWorkspace.tsx` bekommt neue Prop `customReports: CustomReport[]`.
  - `<MeineBerichteDropdown reports={customReports} onSelect={handleCustomReportClick} onChanged={() => router.refresh()} />`.
  - `handleCustomReportClick(report)`: setzt `selectedReport = { id: \`custom-${report.id}\`, label: report.name, ... }` + ruft Custom-Report-Runner ueber `runCustomReport`-Server-Action-Wrapper (analog `useReportRun`-Pfad oder neue dedizierte Logik).
  - `onSaveAsReport` an AnswerPane: setzt nur wenn `selectedReport?.id === FREE_QUESTION_REPORT_ID && reportRun.result`. Bei Klick: `setSaveModalOpen(true)`.
  - `<SaveCustomReportModal>` als Sibling, controlled-Open-State. `onSaved`: `router.refresh()` triggert neuen Listing-Load.
  - Mode-Switch (SLC-761) bleibt unveraendert — Custom-Reports-Klick setzt `mode="report"` (analog Standard-Berichten).
- Verification:
  - Vitest: KIWorkspace mit 0 customReports → Dropdown zeigt Empty-State.
  - Vitest: Klick auf Custom-Report-Dropdown-Item → reportRunner-Mock fuer Custom-Path aufgerufen.
  - Vitest: Save-Button-Pass-Through korrekt (4 Cases AC1).
  - Build clean.
- Dependencies: MT-3 (Dropdown vorhanden), MT-2 (Modal vorhanden), MT-1 (AnswerPane-Prop vorhanden)

#### MT-5: Build + Test + Lint + Records-Sync

- Goal: Code-side komplett, Records aktualisiert, V7.6-Tests laufen.
- Files:
  - `cockpit/docs/STATE.md` (MOD — Current Focus "SLC-763 code-side done, /qa next + Gesamt-/qa V7.6")
  - `cockpit/slices/INDEX.md` (MOD — SLC-763 Status `in_progress`)
- Expected behavior:
  - `npm run build` clean.
  - `npm run lint` keine neuen Findings.
  - `npm run test:all` 1100+/1100+ PASS.
- Verification: alle Commands PASS.
- Dependencies: MT-4

#### MT-6: /qa + Live-Smoke + Slice-Done + FEAT-762-Done

- Goal: SLC-763 DONE + FEAT-762 DONE + V7.6-Aufgabe komplett. Live-Smoke End-to-End-Flow PASS.
- Files:
  - `cockpit/reports/RPT-XXX.md` (NEU — /qa-Report mit End-to-End-Live-Smoke-Log)
  - `cockpit/slices/INDEX.md` (MOD — SLC-763 Status → `done`)
  - `cockpit/features/INDEX.md` (MOD — FEAT-761 + FEAT-762 Status `in_progress` → `done`)
  - `cockpit/planning/backlog.json` (MOD — BL-442 V7.6 Status `in_progress` → `done`)
  - `cockpit/docs/STATE.md` (MOD — Current Focus "V7.6 alle Slices DONE, naechster Schritt Gesamt-/qa V7.6")
- Expected behavior:
  - Vitest 1100+/1100+ PASS.
  - Playwright-MCP-Live-Smoke gegen Coolify-Deployment (Push main → Coolify-Auto-Redeploy → Smoke-Run):
    - Admin-Login → `/mein-tag`.
    - Workspace 6 Buttons + "Meine Berichte"-Dropdown leer.
    - Frage stellen → Send → AnswerPane rendert Markdown.
    - "Als Bericht speichern"-Button sichtbar → Klick → Modal.
    - Name eingeben → Save → Modal zu, Dropdown zeigt 1 Eintrag.
    - Klick auf Eintrag → AnswerPane rendert Bedrock-Antwort + usage_count=1.
    - Duplicate-Name-Test: noch eine freie Frage → "Als Bericht speichern" → gleicher Name → 409-Inline-Error.
    - Rename: ⋮ → "Umbenennen" → neuer Name → Save → Dropdown updates.
    - Delete: ⋮ → "Loeschen" → Confirm → Dropdown wieder leer.
    - Context-Filter: Wechsel zu `/dashboard` → "Meine Berichte"-Dropdown leer (nur `cockpit`-Reports, der `mein-tag`-Report nicht sichtbar).
  - SQL-Verifikation: audit_log zeigt 4 V7.6-Actions (`created`, `executed`, `renamed`, `deleted`).
  - Cleanup-DELETE (idealerweise nichts zu cleanupen, da Delete-Step im Smoke selbst).
- Verification:
  - 8 Playwright-Smoke-Schritte alle PASS.
  - audit_log-Trail komplett.
  - 0 Test-Pollution.
- Dependencies: MT-5 PASS

## Risks & Mitigations

- **R1** `listCustomReports` als Server-Component-Call vs Client-Side-Call: Server-Component-Pfad ist robuster (RLS-implicit via auth.uid()), Client-Side erfordert Server-Action-Roundtrip. **Mitigation:** Server-Component in `page.tsx`, Prop-Pass-Through bevorzugt. Bei UX-Refresh-Pattern (z.B. Save → refresh): `router.refresh()` triggert Server-Component-Re-Render.
- **R2** Dropdown-State + Sub-Menu-State + Modal-State: drei separate UI-States koennen Race-Conditions erzeugen (Modal offen + Sub-Menu offen). **Mitigation:** `onOpenChange`-Sequencing, ein State zur Zeit.
- **R3** Type-Ahead-Filter ab 6+ — Threshold ist hartkodiert. **Mitigation:** Konstante `TYPE_AHEAD_THRESHOLD = 6` am Datei-Anfang, Test-Vitest deckt 5 vs 6 Items ab.
- **R4** Custom-Report-Runner braucht eigenen `serverActionPath` in `KIWorkspaceReport`. Heute ist serverActionPath ein statischer String pro Report. Custom-Reports haben dynamische IDs. **Mitigation:** Entweder generischer `custom-runner`-Path mit Wrapper-Logik die ID aus dem report-Object liest, oder dedizierte handle-Custom-Report-Logik in `KIWorkspace.tsx` ohne reportRunner-Pattern (analog NL-Builder-Mode-Short-Circuit aus SLC-761). **In MT-4 entscheiden** — Empfehlung: dedizierte handle-Logik (einfach, kein neuer Pattern).
- **R5** UNIQUE-Constraint-Error im Save-Modal: zod-Pre-Validate kann das nicht abfangen (DB-Race). **Mitigation:** Server-Action-Error-Code `duplicate_name` ist die einzige saubere Source-of-Truth — Modal zeigt Inline-Error bei diesem Code.
- **R6** `formatDistanceToNow` ist nicht im Cockpit-Stack vorhanden — Dateie sieht nach Mini-Helper aus. **Mitigation:** Einfache Inline-Helper-Function `function relativeTimeDE(date: Date): string` (kein `date-fns` als neue Dep, einfach Diff-Switch in Tagen/Stunden).
- **R7** Browser-Cache nach Coolify-Redeploy: Dropdown koennte stale-Liste zeigen. **Mitigation:** `router.refresh()` nach Save/Rename/Delete + User-Hinweis Ctrl+F5 als Smoke-Pre-Step.

## Dependencies

- **SLC-761 DONE** (Workspace-Mode-Switch + 6. Button live)
- **SLC-762 DONE** (5 Server-Actions live, MIG-037 applied, RLS-Live-Test PASS)
- **V7.6 DEC-216 + DEC-218** als Architektur-Vorgabe

## Verification & Tests

- TSC + Lint + Build clean
- Vitest neue Tests:
  - AnswerPane Save-Button-Sichtbarkeit (4 Cases)
  - SaveCustomReportModal Submit + 409-Error
  - MeineBerichteDropdown Empty + 1-5 + 6+ + Filter + Sub-Menu
  - KIWorkspace Save-Button-Pass-Through + Custom-Report-Klick
- Playwright-MCP-Live-Smoke MT-6 End-to-End-Flow PASS (8 Smoke-Schritte)
- audit_log-Trail mit allen 4 V7.6-Actions
- Context-Filter live-verifiziert

## Open Points

- RPT-Nummer fuer den Slice-Done-Report wird in MT-6 vergeben.
- Custom-Report-Runner-Wire-Up (R4): Entscheidung in MT-4 ob reportRunner-Pattern verwendet oder dedizierte Handle-Logik.
- `relativeTimeDE`-Helper (R6): Inline oder Utility-Datei — Entscheidung in MT-3 abhaengig von Wiederverwendbarkeit (bisher nur ein Verwendungsort).

## Files Reviewed (Slice-Planning)

- [features/FEAT-762-custom-reports.md](features/FEAT-762-custom-reports.md) — Requirements + 5 OQs + Frontend-Skizze
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) V7.6-Section — Components-Diagramm + DEC-216 + DEC-218
- [docs/DECISIONS.md](docs/DECISIONS.md) DEC-216 + DEC-218 — Save-Trigger + Slice-Cut
- [cockpit/src/components/ki-workspace/KIWorkspace.tsx](cockpit/src/components/ki-workspace/KIWorkspace.tsx) — Workspace-Wire-Up-Punkt
- [cockpit/src/components/ki-workspace/AnswerPane.tsx](cockpit/src/components/ki-workspace/AnswerPane.tsx) — Save-Button-Render-Punkt
- [cockpit/src/components/ki-workspace/types.ts](cockpit/src/components/ki-workspace/types.ts) — `KIWorkspaceReport`-Interface
- [reports/RPT-467.md](reports/RPT-467.md) — Architecture-Done-Report
- Memory `feedback_native_html_form_pattern.md`, `feedback_v2_sidebar_pflicht.md`, `feedback_slice_merge_at_end.md`, `feedback_no_intermediate_coolify_switches.md`, `feedback_ki_workspace_pattern.md`

## Recommended Implementation Skill

`/frontend` MT-1 + MT-2 + MT-3 + MT-4 + MT-5 (AnswerPane-Patch + Modal + Dropdown + Workspace-Wire-Up + Records-Sync).
`/qa` MT-6 (End-to-End-Live-Smoke + Slice-Done + Feature-Done + V7.6-Aufgabe-Done).
Nach MT-6: **SLC-763 DONE → FEAT-761 + FEAT-762 DONE → V7.6 Code-Done.** Naechster Schritt: **Gesamt-/qa V7.6** ueber alle 3 Slices → `/final-check V7.6` → `/go-live V7.6` → `/deploy` als REL-033.
