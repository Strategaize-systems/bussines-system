# SLC-761 — NL-Builder als 6. Workspace-Button (FEAT-761)

## Metadata
- **Slice ID:** SLC-761
- **Version:** V7.6
- **Feature:** FEAT-761 NL-Builder in KI-Workspace integrieren
- **Status:** planned
- **Priority:** High (Foundation-First, V6.6-Pattern-Verletzung im LIVE-State seit V7.5)
- **Created:** 2026-05-19
- **Estimated Effort:** ~2-3h Code + ~30 Min /qa + Live-Smoke = ~3-4h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (Frontend-Refactor, 6 Datei-Touches, kein Schema)
- **Pattern-Reuse:** 4-Karten-Sequenz aus V7.5 `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` 1:1 portiert. PipelineTabs-Discriminator-Pattern aus `AnswerPane.tsx` als Mode-Switch-Vorbild.
- **Reihenfolge-Pflicht:** Foundation-First. **MUSS vor SLC-762** abgeschlossen sein (FEAT-762 Custom-Reports nutzen das refactorierte Workspace).

## Why

V7.5 SLC-753 hat den NL-Rule-Builder als **separate Card** unter dem MeinTagKIWorkspace platziert ([cockpit/src/components/mein-tag/nl-rule-builder-card.tsx](cockpit/src/components/mein-tag/nl-rule-builder-card.tsx)). Das verletzt das V6.6-KI-Workspace-Pattern (`feedback_ki_workspace_pattern` + `feedback_no_extra_cards`): "alles laeuft ueber KI-Workspace, keine festen KPI-Cards/Goals/Top-N-Tabellen mehr".

User-Direktive 2026-05-18 (Post-V7.5-Deploy-UI-Inspektion, `feedback_nl_builder_belongs_in_workspace`): "Workflow per Klartext" muss als **6. Berichts-Button** in den `MeinTagKIWorkspace`. Klick triggert den Sculpt-Workflow **inline im Workspace**, nicht in einer Card daneben. Zusaetzlich: **Cost-Display + Modell-Anzeige raus aus User-UI** — Forensik bleibt im `audit_log` + V7.5-Inspection-Log auf `/settings/workflow-automation/nl-history` (SLC-756).

Architektur-Entscheidungen aus V7.6 /architecture (RPT-467):
- **DEC-212** Button-Label "Workflow bauen"
- **DEC-213** File-Location `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` + Komplett-Loeschung alte Card-Datei
- **DEC-214** Workspace-Input-Bar im NL-Builder-Mode `disabled` mit Hint
- **DEC-217** Mode-Switch im KIWorkspace, AnswerPane bleibt single-purpose Result-Renderer

Plus F-2 Doc-Hygiene aus RPT-462: `docs/AUDIT_SERVER_ACTIONS_V7.md` V7.5-Section mit 4 V7.5-Server-Actions (sculptNlRule/previewNlRule/applyNlRule/listNlSculptHistory) nachtragen, ~15 Min.

## Scope

**In Scope:**

- **MEIN_TAG_REPORTS-Registry-Update** ([cockpit/src/components/ki-workspace/reports/registry.ts](cockpit/src/components/ki-workspace/reports/registry.ts)):
  - 6. Eintrag `{ id: "nl-builder", label: "Workflow bauen", serverActionPath: "", cacheable: false }`.
- **KIWorkspace.tsx** ([cockpit/src/components/ki-workspace/KIWorkspace.tsx](cockpit/src/components/ki-workspace/KIWorkspace.tsx)):
  - Zusaetzlicher State `mode: "report" | "nl-builder"` (Default `"report"`).
  - `handleReportClick` short-circuited bei `report.id === "nl-builder"`: `setMode("nl-builder")` + `setSelectedReport(report)` ohne `reportRun.run()`.
  - Render-Switch: `mode === "nl-builder" ? <NLBuilderInline onClose={() => setMode("report")} /> : <AnswerPane ... />`.
  - Workspace-Input-Bar (Text + Mikro + Send-Button) `disabled` wenn `mode === "nl-builder"` + Placeholder-Hint "Workflow-Modus aktiv — verwende die NL-Eingabe unten".
- **NLBuilderInline.tsx** ([cockpit/src/components/ki-workspace/nl-builder-inline.tsx](cockpit/src/components/ki-workspace/nl-builder-inline.tsx) NEU):
  - 4-Karten-Sequenz aus V7.5 portiert (NL-Eingabe + Klarsprache-Karte + Schema-Karte + Trockenlauf+Apply-Confirm-Modal).
  - **OHNE** Cost-Display, **OHNE** Modell-Hint, **OHNE** Card-Wrapper-Box.
  - Importiert weiterhin Sub-Komponenten `<ApplyConfirmModal>` + `<PreviewResultCard>` aus `cockpit/src/components/mein-tag/` (V7.5-Reuse).
  - `onClose`-Prop fuer Sonner-Toast-Erfolg + Mode-Reset.
- **mein-tag-client.tsx** ([cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx](cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx)):
  - Standalone-`<NLRuleBuilderCard />`-Sibling-Render unter dem Workspace komplett entfernen.
- **Alte Card-Datei Loeschen:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` LOESCHEN.
  - `cockpit/src/components/mein-tag/__tests__/nl-rule-builder-card.test.tsx` LOESCHEN.
  - Sub-Komponenten `apply-confirm-modal.tsx` + `preview-result-card.tsx` BLEIBEN (V7.5-Reuse).
- **F-2 Doc-Hygiene** ([cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md](cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md)):
  - V7.5-Section ergaenzen: `sculptNlRule`, `previewNlRule`, `applyNlRule`, `listNlSculptHistory` (Pattern aus ISSUE-069/V7.1).

**Out of Scope:**

- NL-Builder auf `/deal/[id]` oder `/dashboard` — Defer V7.7+.
- Voice-Input-Pfad-Vereinheitlichung (`useVoiceCapture` im NL-Builder vs `ki-workspace-voice-button`) — Defer V7.7+, im NL-Builder-Mode ist die Workspace-Input-Bar disabled, daher kein Konflikt.
- F-3 COMPLIANCE.md V7.5+V7.6-Section — Pre-Production-Compliance-Gate, User-Direktive 2026-05-01 "kommt viel spaeter".
- BL-478 ISSUE-078 Sonner-Toast-Hydration — Defer V7.7+.

## Acceptance Criteria

- **AC1** `MEIN_TAG_REPORTS` in `cockpit/src/components/ki-workspace/reports/registry.ts` enthaelt einen 6. Eintrag `{ id: "nl-builder", label: "Workflow bauen", serverActionPath: "", cacheable: false }`. Standard-5 unveraendert.
- **AC2** Auf `/mein-tag` rendert der `MeinTagKIWorkspace` 6 Buttons (5 Standard + 1 NL-Builder).
- **AC3** Klick auf "Workflow bauen"-Button setzt `mode === "nl-builder"` (Vitest assertion via Setter-Spy oder DOM-Marker) UND triggert KEINEN `reportRun.run()`-Call (`useReportRun.isLoading` bleibt `false`).
- **AC4** Im NL-Builder-Mode rendert KIWorkspace `<NLBuilderInline />` statt `<AnswerPane />`. NL-Eingabe-Textarea + Sculpt-Button + Mikro-Button sichtbar.
- **AC5** Im NL-Builder-Mode ist die Workspace-Input-Bar `disabled` mit Placeholder "Workflow-Modus aktiv ...". Send-Button + Workspace-Mikro-Button ebenfalls `disabled`.
- **AC6** Klick auf einen Standard-Berichts-Button (1 der 5) wechselt `mode` zurueck auf `"report"` und triggert `reportRun.run()` wie bisher.
- **AC7** Cost-Display + Modell-Anzeige sind im NL-Builder-UI **nicht sichtbar** (`screen.queryByText(/Bedrock Claude Sonnet/) === null`, `screen.queryByText(/\\$0\\.\\d/) === null`).
- **AC8** Apply-Workflow End-to-End (NL → Sculpt → Preview → Apply-Confirm) funktioniert identisch zu V7.5 — gleiche Server-Actions, gleicher `audit_log`-Trail (`sculpt_attempt` + `create_via_nl`).
- **AC9** `/mein-tag` rendert KEINE Standalone-`<NLRuleBuilderCard />` mehr (DOM-Check: kein `data-testid="nl-rule-builder-card"` ausserhalb des Workspace-Containers).
- **AC10** Datei `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` + `__tests__/nl-rule-builder-card.test.tsx` sind komplett geloescht (`grep -r "nl-rule-builder-card" cockpit/src` zeigt 0 Treffer ausser ggf. in legacy-Reports).
- **AC11** Sub-Komponenten `apply-confirm-modal.tsx` + `preview-result-card.tsx` bleiben unter `cockpit/src/components/mein-tag/` und werden vom neuen `nl-builder-inline.tsx` importiert.
- **AC12** Inspection-Log auf `/settings/workflow-automation/nl-history` (V7.5 SLC-756) bleibt funktional unveraendert — alle V7.5-Audit-Actions weiterhin sichtbar.
- **AC13** Vitest gruen: `npm run test:all` 1078+/1078+ PASS (V7.5-Baseline + ggf. neue V7.6-Tests, -1 alter Card-Test).
- **AC14** TSC + Lint + Build clean (`npm run build`).
- **AC15** Playwright-MCP-Live-Smoke gegen Coolify-Deployment: Admin-Login → `/mein-tag` → Workspace zeigt 6 Buttons → Klick "Workflow bauen" → NL-Eingabe inline → Sculpt → Trockenlauf → Apply → audit_log Eintraege erscheinen. Cleanup-DELETE-Transaktion analog SLC-754/757.
- **AC16** `docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt V7.5-Section mit 4 Server-Actions (sculptNlRule/previewNlRule/applyNlRule/listNlSculptHistory). F-2 closed.

## Micro-Tasks

#### MT-1: F-2 Doc-Hygiene AUDIT_SERVER_ACTIONS_V7.md V7.5-Section (Setup-MT)

- Goal: Audit-Doku ist auf Stand von V7.5-Code, bevor V7.6-Refactor anfaengt. F-2-Carryover aus RPT-462 schliessen.
- Files:
  - `cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md` (MOD)
- Expected behavior:
  - Neue Section "V7.5 Server-Actions" mit 4 Eintraegen:
    - `sculptNlRule(formData)` — Sculpt via Bedrock + audit_log `automation_rule.sculpt_attempt`
    - `previewNlRule(schemaJson)` — Trockenlauf (read-only, V6.2 DEC-132-Reuse)
    - `applyNlRule(schemaJson, sculpt_audit_id)` — INSERT automation_rules + audit_log `automation_rule.create_via_nl`
    - `listNlSculptHistory(limit?, userId?)` — Admin-only Listing aus audit_log
  - Format-Pattern aus existierender V7.1/V7.2-Section uebernehmen (Action-Name + assertRole + Side-Effects + Audit-Trail).
- Verification:
  - `grep -nE 'sculptNlRule|previewNlRule|applyNlRule' cockpit/docs/AUDIT_SERVER_ACTIONS_V7.md` zeigt 1+ Treffer pro Action.
- Dependencies: none

#### MT-2: KIWorkspace Mode-State + Short-Circuit + Render-Switch

- Goal: KIWorkspace bekommt `mode`-State, `handleReportClick` short-circuited bei `nl-builder`, Render-Switch zwischen `<NLBuilderInline>` und `<AnswerPane>`.
- Files:
  - `cockpit/src/components/ki-workspace/KIWorkspace.tsx` (MOD)
  - `cockpit/src/components/ki-workspace/reports/registry.ts` (MOD — 6. Eintrag)
  - `cockpit/src/components/ki-workspace/__tests__/KIWorkspace.test.tsx` (MOD — neue Tests fuer Mode-Switch)
- Expected behavior:
  - `MEIN_TAG_REPORTS` hat 6 Eintraege, NL-Builder ist letzter.
  - `KIWorkspace.tsx`: `const [mode, setMode] = useState<"report" | "nl-builder">("report")`.
  - `handleReportClick(report)`:
    - Wenn `report.id === "nl-builder"`: `setMode("nl-builder"); setSelectedReport(report); return;` (KEIN `reportRun.run()`).
    - Sonst: `setMode("report"); setSelectedReport(report); await reportRun.run(report, scope);`.
  - JSX: `{mode === "nl-builder" ? <NLBuilderInline onClose={() => setMode("report")} /> : <AnswerPane ... />}`.
  - Input-Bar: `disabled={mode === "nl-builder"}`. Placeholder ternary: `mode === "nl-builder" ? "Workflow-Modus aktiv — verwende die NL-Eingabe unten" : "Frage stellen ..."`. Voice-Button + Send-Button ebenfalls `disabled`.
  - data-testid: `ki-workspace-report-nl-builder` etabliert.
- Verification:
  - Vitest: Klick auf NL-Builder-Button → kein `mockReportRunner` aufgerufen, `mode` per Spy/DOM `"nl-builder"`.
  - Vitest: Klick auf Standard-Berichts-Button danach → `mockReportRunner` aufgerufen, Input-Bar nicht-disabled.
  - TSC + `npm run build` clean.
- Dependencies: MT-1 (parallel moeglich)

#### MT-3: NLBuilderInline.tsx 1:1-Port aus V7.5 ohne Cost-Display

- Goal: Neue Inline-Komponente unter `ki-workspace/` mit 4-Karten-Sequenz, OHNE Cost-Hint + OHNE Modell + OHNE Wrapper-Card-Box.
- Files:
  - `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` (NEU)
  - `cockpit/src/components/ki-workspace/__tests__/nl-builder-inline.test.tsx` (NEU)
- Expected behavior:
  - Header-Kommentar: `// Pattern aus V7.5 cockpit/src/components/mein-tag/nl-rule-builder-card.tsx (DEC-213).`
  - Use Client.
  - 4-Karten-Sequenz: NL-Eingabe + Sculpt-Button + Mic-Button → Klarsprache-Echo → editierbares Schema-Formular → Trockenlauf-Anzeige + Apply-CTA.
  - Importiert `<ApplyConfirmModal>` aus `@/components/mein-tag/apply-confirm-modal`.
  - Importiert `<PreviewResultCard>` aus `@/components/mein-tag/preview-result-card`.
  - Importiert Server-Actions `sculptNlRule`/`previewNlRule`/`applyNlRule` aus `@/app/(app)/mein-tag/actions/*`.
  - **NICHT** gerendert: jegliche Cost-Strings (`~$0.003`, `Bedrock Claude Sonnet`, `~$0.009 fuer 1 Versuch`).
  - **NICHT** gerendert: Card-Wrapper-Box mit `border border-border bg-card rounded-xl p-4` ueber dem ganzen Block — die einzelnen Karten der Sequenz behalten ihren visuellen Container, aber kein doppelter Wrapper.
  - `onClose`-Prop wird nach Apply-Success aufgerufen (Toast + Workspace-Mode-Reset).
- Verification:
  - Vitest: Render mit `canSculpt={true}` zeigt Textarea + Sculpt-Button.
  - Vitest: Cost-Strings NICHT im DOM (`expect(screen.queryByText(/\\$0\\.\\d/)).toBeNull()`, `expect(screen.queryByText(/Bedrock Claude Sonnet/i)).toBeNull()`).
  - Vitest: Apply-Mock-Success → `onClose` aufgerufen.
  - TSC clean.
- Dependencies: MT-2 (Registry + KIWorkspace muessen vorhanden sein, damit die Inline-Komponente im Render-Switch greift)

#### MT-4: mein-tag-client.tsx Card-Sibling-Loeschung + Alte-Card-Dateien-Loeschung

- Goal: Standalone-NLRuleBuilderCard ist weg, alte Datei ist geloescht. `/mein-tag` zeigt nur noch den Workspace mit 6 Buttons.
- Files:
  - `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` (MOD — `<NLRuleBuilderCard />`-Render entfernen + ggf. ungenutzten Import wegputzen)
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (DELETE)
  - `cockpit/src/components/mein-tag/__tests__/nl-rule-builder-card.test.tsx` (DELETE)
- Expected behavior:
  - `mein-tag-client.tsx` hat keinen Sibling-`<NLRuleBuilderCard />`-JSX-Block mehr.
  - Import `NLRuleBuilderCard` ist aus `mein-tag-client.tsx` entfernt (sonst TSC-Error).
  - `grep -r "nl-rule-builder-card" cockpit/src` zeigt 0 Treffer (ausser ggf. in legacy reports).
  - Sub-Komponenten-Dateien `apply-confirm-modal.tsx` + `preview-result-card.tsx` + `.test.tsx` BLEIBEN — sie werden weiterhin vom neuen `nl-builder-inline.tsx` konsumiert.
- Verification:
  - TSC clean.
  - `npm run build` clean.
  - `grep -n NLRuleBuilderCard cockpit/src/app/\(app\)/mein-tag/mein-tag-client.tsx` zeigt 0 Treffer.
- Dependencies: MT-3 (Inline-Komponente muss als Ersatz existieren)

#### MT-5: Build + Test + Lint + Records-Sync

- Goal: Code-side komplett, alle Project-Records aktualisiert vor /qa.
- Files:
  - `cockpit/docs/STATE.md` (MOD — Current Focus auf "SLC-761 code-side done, /qa next")
  - `cockpit/slices/INDEX.md` (MOD — V7.6-Section + SLC-761 Eintrag, Status `in_progress` bis /qa, dann `done`)
  - `cockpit/features/INDEX.md` (MOD — FEAT-761 Status `planned` → `in_progress`)
- Expected behavior:
  - `npm run build` clean.
  - `npm run lint` keine neuen Findings (Baseline V7.5).
  - `npm run test:all` 1078+/1078+ PASS (Delta = +new Inline-Tests +new KIWorkspace-Tests -1 alter Card-Test).
- Verification: alle drei Commands PASS.
- Dependencies: MT-4

#### MT-6: /qa + Live-Smoke + Slice-Done

- Goal: Slice DONE nach Vitest-Suite + Coolify-Live-Smoke + Records-Final-Update.
- Files:
  - `cockpit/reports/RPT-XXX.md` (NEU — /qa-Report mit Live-Smoke-Log, naechste verfuegbare RPT-Nummer)
  - `cockpit/slices/INDEX.md` (MOD — SLC-761 Status → `done`)
  - `cockpit/features/INDEX.md` (MOD — FEAT-761 bleibt `in_progress` bis SLC-762+763 done, dann `done`)
  - `cockpit/planning/backlog.json` (MOD — BL-479 Status `in_progress` → `done`)
  - `cockpit/docs/STATE.md` (MOD — Current Focus → "SLC-761 DONE, naechster Schritt /backend SLC-762")
- Expected behavior:
  - Vitest 1078+/1078+ PASS.
  - Playwright-MCP-Live-Smoke gegen Coolify-Deployment (Push main → Coolify-Auto-Redeploy → Smoke-Run):
    - Admin-Login → `/mein-tag`.
    - Workspace zeigt 6 Buttons inkl. "Workflow bauen".
    - Klick "Workflow bauen" → Input-Bar disabled mit Hint + NL-Eingabe inline sichtbar + keine Bedrock-Cost-Anzeige im DOM.
    - NL eingeben "Wenn Deal in Phase Angebot wechselt, Task in 2 Tagen" → Sculpt-Button.
    - Schema-Karte erscheint → Trockenlauf-Button.
    - Apply-CTA → Confirm-Modal → Pflicht-Checkbox → Submit.
    - Toast "Regel aktiviert" + Workspace-Mode wechselt zurueck auf `"report"` (Input-Bar wieder enabled).
  - SQL-Verifikation: 1 neue Rule `automation_rules WHERE created_via='nl_sculptor'`, 1 audit_log `sculpt_attempt`, 1 audit_log `create_via_nl`.
  - Cleanup-DELETE-Transaktion (analog SLC-754/757-Pattern).
- Verification:
  - DOM-Snapshot via Playwright-MCP zeigt 6 Buttons.
  - Cost-Text NICHT im DOM.
  - Inspection-Log auf `/settings/workflow-automation/nl-history` zeigt den Sculpt-Attempt — funktional unveraendert.
- Dependencies: MT-5 PASS

## Risks & Mitigations

- **R1** NL-Builder-Inline importiert Sub-Komponenten aus `mein-tag/` — wenn diese Sub-Komponenten Type-Probleme haben oder Default-Imports anders sind, brechen Tests. **Mitigation:** vor MT-3 die Sub-Komponenten lesen und Import-Pfade verifizieren. SLC-754-Tests sind Referenz fuer Apply-Confirm-Modal-Usage.
- **R2** `MEIN_TAG_REPORTS` Type-Constraint: `serverActionPath: string` (siehe `KIWorkspaceReport`-Interface). Leer-String `""` kann TS-tolerieren — Mitigation: explicit Type-Cast in Registry oder Interface auf `string | null` lockern. **Pruefen in MT-2.**
- **R3** Sub-Komponenten `apply-confirm-modal.tsx` + `preview-result-card.tsx` waren in V7.5-Tests Mock-erzeugt. Wenn das neue `nl-builder-inline.tsx` sie real importiert, koennen integrative Test-Pfade brechen. **Mitigation:** Vitest fuer NLBuilderInline kann ApplyConfirmModal mocken (vi.mock).
- **R4** `mein-tag-client.tsx` koennte server-side `serverProps.canSculpt` als Pflicht-Prop an `<NLRuleBuilderCard>` durchgereicht haben — beim Loeschen muss diese Prop entweder weiter durchgereicht werden (an Workspace) oder im NLBuilderInline aus AsyncLocalStorage geholt werden. **Mitigation:** in MT-2 entscheiden ob die `canSculpt`-Logik in den Workspace-Server-Component-Wrapper wandert oder im Inline-Component erneut via `assertRole(["admin","teamlead"])` geholt wird.
- **R5** Wenn die Card heute lazy-rendered war (z.B. nur fuer Admin+Teamlead), kann ein Server-Side-Guard im Workspace fehlen — Mitigation: `MEIN_TAG_REPORTS` Filter im Server-Component oder `NLBuilderInline` server-side `assertRole(["admin","teamlead"])` als first-line (analog V7.5-Pattern, Render leerer Hinweis fuer Member).
- **R6** Browser-Cache nach Coolify-Redeploy kann den 6. Button verzoegert anzeigen — User-Hinweis "Hard-Refresh Ctrl+F5 oder Inkognito" als Live-Smoke-Pre-Step.

## Dependencies

- **V7.5 FEAT-751** Backend-Server-Actions (sculptNlRule, previewNlRule, applyNlRule) bleiben **komplett unangetastet**.
- **V7.5 SLC-756** Inspection-Log `/settings/workflow-automation/nl-history` bleibt funktional unveraendert.
- **V7.6 DEC-212..214 + DEC-217** als Architektur-Vorgabe.
- **Pattern-Reuse-Quelle** `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` muss in MT-3 als Quell-Datei gelesen und referenziert werden (Header-Kommentar Pflicht).

## Verification & Tests

- TSC clean
- Vitest 1078+/1078+ PASS
- `npm run build` clean
- `npm run lint` keine neuen Findings
- Playwright-MCP-Live-Smoke MT-6 PASS
- DOM-Check: 0 Treffer fuer Cost-Anzeige im NL-Builder-DOM
- Inspection-Log unveraendert
- audit_log-Trail end-to-end identisch V7.5

## Open Points

- RPT-Nummer fuer den Slice-Done-Report wird in MT-6 vergeben (vermutlich RPT-469, falls keine Zwischen-RPTs).
- Falls MT-2 ergibt dass `serverActionPath: ""` Type-Probleme macht: optional in eigenem Sub-Step auf `string | null` lockern oder `KIWorkspaceReport`-Interface erweitern (nicht-blockierend).

## Files Reviewed (Slice-Planning)

- [cockpit/src/components/ki-workspace/KIWorkspace.tsx](cockpit/src/components/ki-workspace/KIWorkspace.tsx) — bestaetigt Short-Circuit-Punkt fuer `nl-builder`
- [cockpit/src/components/ki-workspace/AnswerPane.tsx](cockpit/src/components/ki-workspace/AnswerPane.tsx) — Discriminator-Pattern-Referenz
- [cockpit/src/components/ki-workspace/reports/registry.ts](cockpit/src/components/ki-workspace/reports/registry.ts) — MEIN_TAG_REPORTS-Schema
- [cockpit/src/components/ki-workspace/types.ts](cockpit/src/components/ki-workspace/types.ts) — KIWorkspaceReport-Interface
- [features/FEAT-761-nl-builder-in-workspace.md](features/FEAT-761-nl-builder-in-workspace.md) — Requirements + 4 OQs
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) V7.6-Section — Components-Diagramm + DEC-212..214 + DEC-217 + Mode-Switch-Code-Skizze
- [docs/DECISIONS.md](docs/DECISIONS.md) DEC-212..214 + DEC-217 — Slice-Boundary-Definitionen
- [reports/RPT-467.md](reports/RPT-467.md) — Architecture-Done-Report
- Memory `feedback_native_html_form_pattern.md`, `feedback_v2_sidebar_pflicht.md`, `feedback_no_intermediate_coolify_switches.md`, `feedback_slice_merge_at_end.md`, `feedback_no_coolify_branch_switch_ever.md`, `feedback_ki_workspace_pattern.md`, `feedback_nl_builder_belongs_in_workspace.md`

## Recommended Implementation Skill

`/frontend` MT-1 + MT-2 + MT-3 + MT-4 + MT-5 (Doc-Hygiene + Workspace-Refactor + Inline-Port + Cleanup + Records-Sync).
`/qa` MT-6 (Live-Smoke + Slice-Done).
Nach MT-6: **SLC-761 DONE.** Naechster Schritt: `/backend SLC-762` (Custom-Reports Backend).
