# SLC-757 — NL-Rule-Builder Apply-Polish (State-Reset + Toast, FEAT-751)

## Metadata
- **Slice ID:** SLC-757
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** Medium (Polish nach FEAT-751-Code-Done, schliesst ISSUE-077 vor V7.5-Gesamt-/qa)
- **Created:** 2026-05-18
- **Estimated Effort:** ~30-45 Min Code + ~30 Min /qa + Live-Smoke = ~70-80 Min Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (kleiner UI-Patch, 1 Komponente + 1 RootLayout + 1 neuer shadcn-Wrapper)
- **Pattern-Reuse:** Sonner-Setup 1:1 aus `strategaize-onboarding-plattform` (`src/components/ui/sonner.tsx` + `src/app/layout.tsx` Mount, Memory `strategaize-pattern-reuse.md`)
- **Reihenfolge-Pflicht:** **MUSS vor V7.5-Gesamt-/qa** abgeschlossen sein. Schliesst ISSUE-077 als letztes offenes UI-Item.

## Why

SLC-754 Live-Smoke (RPT-453, 2026-05-17) hat zwei UI-Diskrepanzen aufgedeckt — beide rein Client-Side, kein Daten-Bug:

1. Nach `applyNlRule()` Success bleibt die NL-Eingabe-Karte sichtbar (Textarea-Wert + Klarsprache + Schema-Karte + Preview-Resultat + Apply-Button noch klickbar). Der User koennte versehentlich die gleiche Rule erneut aktivieren — der Soft-Dedup-Pfad (AC6, SLC-754) faengt das technisch ab, aber UX-Confusion bleibt.
2. Kein Success-Toast nach Apply — `toastCount=0` in der Playwright-Smoke. Ursache: Sonner ist nicht installiert, kein `<Toaster />` im RootLayout gemountet, kein `toast.success(...)`-Call in `handleApply()`.

Server-Side war alles sauber (Rule + audit_log persistiert, V6.2-Trigger feuert End-to-End, Soft-Dedup verifiziert). Workaround Page-Reload setzt UI zurueck, aber das ist kein V7.5-Release-Stand.

User-Entscheidung 2026-05-18: eigener Mini-Slice statt Inline-Fast-Fix in SLC-754 nachtragen (User-Direktive Option B), damit der Polish-Schritt sauber dokumentiert + getestet + Live-Smoke-bestaetigt im Cockpit erscheint.

## Scope

**In Scope:**

- **`cockpit/package.json` + lock-file (MOD)** — Neue Dependencies:
  - `sonner@^2.0.7` (1:1 Version aus Onboarding-Plattform)
  - `next-themes@^0.4.6` (Pflicht-Dep des Sonner-Wrappers, 1:1-Pattern-Treue)
- **`cockpit/src/components/ui/sonner.tsx` (NEU)** — Shadcn-Toaster-Wrapper, 1:1 aus `strategaize-onboarding-plattform/src/components/ui/sonner.tsx` (use client + lucide-Icons + useTheme + classNames-Mapping). Header-Kommentar mit Quell-Pfad gemaess Pattern-Reuse-Rule.
- **`cockpit/src/app/layout.tsx` (MOD)** — `<Toaster />` als Sibling unter `{children}` im `<body>`. Mount-Position 1:1 aus Onboarding-RootLayout.
- **`cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD)** — `handleApply()` Success-Branch:
  - Aktuell: `setApplySuccess({ ruleId: res.rule_id })` + `setModalOpen(false)`.
  - Neu: `toast.success("Regel aktiviert")` + `handleNewRule()` (existierende Reset-Funktion direkt aufrufen, Zeile 299-304).
  - **Variante-A-Konsequenz:** Der gruene ApplySuccess-Banner faellt komplett weg, weil `handleNewRule()` `setActionResult(null)` aufruft — Toast ist alleiniges visuelles Feedback. Banner-Code (Zeile 651-674) + `applySuccess` State + `setApplySuccess` Setter werden entfernt. Saubere Loesung, kein Doppel-Feedback.
- **`cockpit/src/components/mein-tag/__tests__/nl-rule-builder-card.test.tsx` (MOD oder NEU)** — Vitest fuer:
  - RTL-Test: Apply-Success → Card-State-Reset (Textarea leer, Schema-Karte weg, Preview weg, Apply-Button weg) + Sonner-Mock prueft `toast.success` aufgerufen.
- **`cockpit/docs/KNOWN_ISSUES.md` (MOD)** — ISSUE-077 status `open` → `resolved`, Resolution-Notiz mit Commit-Hash + Slice-Ref.

**Out of Scope:**

- Dark-Mode-Theming des gesamten Cockpit — `next-themes` wird nur als Sonner-Dep mitinstalliert, kein ThemeProvider-Wrap im RootLayout. Sonner-default-Theme (light) reicht. Wenn Dark-Mode irgendwann gewollt, eigener Slice.
- Andere Toast-Calls im Cockpit (Save-Erfolg in anderen Forms, etc.) — bewusst nicht aufgenommen. Toast-Roll-out cross-Cockpit waere Hygiene-Slice und nicht V7.5-Scope.
- Sculpt-Quality-Issue aus RPT-453 (Sculptor erzeugte `conditions=[]` statt `stage_id='Angebot'`) — separater Sculptor-Tuning-Kandidat, nicht UI-Polish.
- V6.2-Dispatcher-Beobachtung aus RPT-453 (kein Owner-Scope auf automation_rules) — V8+ Multi-User-Scoping-Discussion.

## Acceptance Criteria

- **AC1** `sonner@^2.0.7` und `next-themes@^0.4.6` sind in `cockpit/package.json` dependencies eingetragen, `npm install` lief sauber durch, lock-file aktualisiert.
- **AC2** `cockpit/src/components/ui/sonner.tsx` existiert als 1:1-Port des Onboarding-Wrappers (Icon-Set + classNames-Mapping identisch, Header-Kommentar nennt Quell-Pfad).
- **AC3** `cockpit/src/app/layout.tsx` mounted `<Toaster />` im `<body>` (Position 1:1 wie Onboarding-Layout).
- **AC4** `handleApply()` ruft nach `res.ok` zuerst `toast.success("Regel aktiviert")`, dann `handleNewRule()`. `setApplySuccess`/`applySuccess`-State + Banner-Render-Block sind entfernt.
- **AC5** Card ist nach Apply-Success komplett leer: Textarea-Value `""`, kein Klarsprache-Block, keine Schema-Karte, kein Preview-Block, kein Apply-Button.
- **AC6** Vitest RTL-Test: Apply-Mock-Success → `screen.queryByTestId("nl-rule-builder-schema")` null, `screen.queryByTestId("nl-rule-builder-apply-cta")` null, Sonner-`toast.success` 1× mit String `"Regel aktiviert"` aufgerufen.
- **AC7** Volle Vitest-Suite gruen (`npm run test:all` 917 + Neu-Test = ~918 PASS).
- **AC8** TSC + Lint + Build clean (`npm run build` ohne neue Errors/Warnings).
- **AC9** Playwright-MCP-Live-Smoke gegen Coolify-Deployment:
  - Admin-Login → /mein-tag
  - NL-Eingabe + Sculpt + Trockenlauf + Apply mit Pflicht-Checkbox + Submit
  - Toast top-right sichtbar mit Text "Regel aktiviert" (waehrend ~3-5s) — Sonner-Standard-Auto-Dismiss
  - Card komplett leer nach Modal-Schluss (Textarea-Value `""`, kein Apply-Button-DOM)
  - SQL-Verifikation: 1 neue Rule in `automation_rules WHERE created_via='nl_sculptor'`, 1 neuer audit_log-Eintrag, identisch zu SLC-754-Live-Smoke-Pattern
  - **Cleanup**: 1 DELETE-Statement-Transaction wie in RPT-453 (Rule + audit_log)
- **AC10** `docs/KNOWN_ISSUES.md` ISSUE-077 hat `Status: resolved`, Resolution-Notiz mit Slice-Ref + Commit-Hash.

## Micro-Tasks

#### MT-1: Dependencies + Sonner-Wrapper portieren
- Goal: `sonner` + `next-themes` als Deps + `components/ui/sonner.tsx` als 1:1-Port mit Quell-Pfad-Kommentar verfuegbar.
- Files:
  - `cockpit/package.json` (MOD — `dependencies` ergaenzen)
  - `cockpit/package-lock.json` (auto-MOD via `npm install`)
  - `cockpit/src/components/ui/sonner.tsx` (NEU)
- Expected behavior: `npm install` lauft clean, kein Resolution-Konflikt. Import `import { Toaster } from "@/components/ui/sonner"` resolved.
- Verification:
  - `npm install` ohne Fehler
  - `npm run build` clean
  - `grep -r 'from "sonner"' cockpit/src` zeigt keinen Eintrag (Toaster wird ueber den Wrapper konsumiert)
- Dependencies: none

#### MT-2: Toaster im RootLayout mounten
- Goal: `<Toaster />` als Sibling unter `{children}` im body von `app/layout.tsx`.
- Files:
  - `cockpit/src/app/layout.tsx` (MOD)
- Expected behavior: Toaster ist auf jeder Route gemountet, kein Hydration-Warning, kein zusaetzlicher Wrapper. Mount-Position 1:1 wie Onboarding (`<body>{children}<Toaster /></body>`).
- Verification:
  - `npm run build` clean
  - Dev-Server-Smoke (`/login` oder `/mein-tag` aufrufen) — kein Console-Error, DOM enthaelt `[role="region"][aria-label*="Notification"]` (Sonner-Toaster-Root)
- Dependencies: MT-1

#### MT-3: handleApply Toast + Reset + Banner-Removal
- Goal: `nl-rule-builder-card.tsx` `handleApply()` Success-Branch ruft `toast.success("Regel aktiviert")` + `handleNewRule()` auf. `applySuccess`-State + Banner-Block sind entfernt.
- Files:
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD)
- Expected behavior:
  - `import { toast } from "sonner";` neu am Datei-Anfang
  - State-Deklarationen `setApplySuccess` + `applySuccess` weg
  - Success-Banner-Render-Block (aktuell Zeile 651-674) weg
  - `handleApply()` `res.ok`-Branch: `toast.success("Regel aktiviert"); handleNewRule();` (statt `setApplySuccess({ ruleId: res.rule_id }); setModalOpen(false);`). `handleNewRule()` ruft `resetDerivedState()` auf — das schliesst auch das Modal.
  - Lucide-Import `CheckCircle2` entfernen, falls nicht mehr verwendet (Banner-Only-Import)
- Verification:
  - TSC clean (`npx tsc --noEmit`)
  - `npm run build` clean
  - `grep -n 'applySuccess\|setApplySuccess' cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` zeigt 0 Treffer
- Dependencies: MT-2

#### MT-4: Vitest RTL-Test
- Goal: Component-Test belegt Toast-Call + State-Reset nach Apply-Success.
- Files:
  - `cockpit/src/components/mein-tag/__tests__/nl-rule-builder-card.test.tsx` (MOD oder NEU, je nach Bestand)
- Expected behavior:
  - `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))`
  - `vi.mock("@/app/(app)/mein-tag/actions/apply-nl-rule", () => ({ applyNlRule: vi.fn().mockResolvedValue({ ok: true, rule_id: "test-rule" }) }))`
  - Setup: sculptNlRule + previewNlRule schon mocked aus SLC-754-Tests (Pattern uebernehmen)
  - Test-Block "Apply-Success → state reset + toast":
    - Render `<NLRuleBuilderCard canSculpt={true} />`
    - User-Flow simulieren: Type NL → click "Regel bauen" → click "Trockenlauf" → click "Regel aktivieren" → click Pflicht-Checkbox → click Submit
    - Assert: `toast.success` called 1× with "Regel aktiviert"
    - Assert: `screen.queryByTestId("nl-rule-builder-schema")` null
    - Assert: `screen.queryByTestId("nl-rule-builder-apply-cta")` null
    - Assert: `screen.queryByTestId("nl-rule-builder-apply-success")` null (Banner ist weg)
- Verification: `npm run test -- nl-rule-builder-card` PASS, danach `npm run test:all` ~918 PASS
- Dependencies: MT-3

#### MT-5: Build + Lint Final + Cockpit-Records-Sync
- Goal: Slice ist code-side komplett, alle Records aktualisiert vor /qa.
- Files:
  - `cockpit/docs/KNOWN_ISSUES.md` (MOD) — ISSUE-077 → resolved, Resolution-Block (Slice-Ref + Commit-Hash, Datum)
  - `cockpit/docs/STATE.md` (MOD) — Current Focus aktualisieren auf "SLC-757 code-side done, /qa next"
  - `cockpit/slices/INDEX.md` (MOD) — SLC-757 Zeile bleibt vorhanden, Status `in_progress` → `done` erst nach /qa
- Expected behavior:
  - `npm run build` clean
  - `npm run lint` keine neuen Findings
  - `npm run test:all` ~918 PASS
- Verification: alle drei Commands PASS
- Dependencies: MT-4

#### MT-6: /qa + Live-Smoke
- Goal: Slice DONE nach Live-Verifikation.
- Files:
  - `cockpit/reports/RPT-460.md` oder naechste verfuegbare RPT-Nummer (NEU) — /qa-Report mit Live-Smoke-Log
  - `cockpit/slices/INDEX.md` (MOD) — SLC-757 status → done
  - `cockpit/features/INDEX.md` (MOD) — FEAT-751 bleibt done (kein State-Change, da Feature-Code schon done; SLC-757 ist Polish)
  - `cockpit/planning/backlog.json` (MOD) — BL-477 status `open` → `done`
  - `cockpit/docs/STATE.md` (MOD) — Current Focus → "SLC-757 DONE 2026-05-XX, V7.5 ready for Gesamt-/qa"
  - `cockpit/docs/KNOWN_ISSUES.md` (MOD) — ISSUE-077 Resolution-Block mit Commit-Hash + RPT-Ref
- Expected behavior:
  - Vitest 918/918 PASS
  - Playwright-MCP-Live-Smoke gegen Coolify deployt von neuem main-Branch nach `git push origin main` (siehe Memo `feedback_no_intermediate_coolify_switches.md` — Live-Smoke aufs Slice-Ende verschieben)
  - 1 echte Rule + 1 echter audit_log-Eintrag aus Smoke + Cleanup-Statement durchgefuehrt
- Verification:
  - Toast sichtbar (Screenshot via Playwright-MCP)
  - Card komplett leer (DOM-Snapshot via Playwright-MCP)
  - SQL: 1 neue Rule mit `created_via='nl_sculptor'`
  - Post-Cleanup: 0 Test-Pollution in `automation_rules`, `audit_log`, `automation_runs`, `activities`
- Dependencies: MT-5 PASS

## Risks & Mitigations

- **R1** `sonner@2.x` ist Major-Version-Sprung vs. Onboarding (das nutzt explizit `^2.0.7`) — Mitigation: identische Major-Version 2.x, gleiche API. Risk niedrig, da der Wrapper das `<Sonner>`-API kapselt.
- **R2** `next-themes` ohne ThemeProvider liefert `theme="system"` als Default — Mitigation: useTheme im Wrapper greift, Sonner-Toaster rendert mit System-Theme (in Cockpit-Light-CSS-Context = light-Theme-Optik). Gleiches Verhalten wie in Onboarding, da Onboarding ebenfalls keinen ThemeProvider hat (verifiziert via Read).
- **R3** `handleNewRule()` schliesst Modal nicht explizit — Mitigation: `handleNewRule()` ruft `resetDerivedState()` auf, das setzt `setModalOpen(false)`. Verifiziert via Code-Read.
- **R4** Vitest RTL-Test fuer asynchronen Form-Flow ist umstaendlich — Mitigation: SLC-753 + SLC-754 haben bereits Test-Patterns mit `vi.mock` fuer Server-Actions + `userEvent.click`-Sequenzen. Pattern wiederverwenden.
- **R5** Sonner-CSS-Inject koennte mit globals.css kollidieren — Mitigation: Sonner verwendet eigenen CSS-Namespace (`.toaster .toast`), das Onboarding-Setup hat dieselben globals.css-Tailwind-Base-Styles ohne Konflikt. Risk niedrig.

## Dependencies

- **SLC-754** Apply-Pfad und ApplyConfirmModal existieren bereits — wird hier nur angepasst.
- **Pattern-Reuse-Quelle:** `strategaize-onboarding-plattform/src/components/ui/sonner.tsx` + `src/app/layout.tsx`. Pflicht-Lesung in MT-1 vor dem Port (Pattern-Reuse-Rule).

## Verification & Tests

- TSC clean
- Vitest +1 neuer Test gruen
- `npm run build` clean
- `npm run lint` keine neuen Findings
- Playwright-MCP-Live-Smoke MT-6 PASS

## Open Points

- RPT-Nummer fuer den Slice-Done-Report wird in MT-6 vergeben (vermutlich RPT-460, falls keine Zwischen-RPTs gezogen werden).

## Files Reviewed (Slice-Planning)

- `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (handleApply + handleNewRule + applySuccess-Banner)
- `cockpit/src/app/layout.tsx` (RootLayout, kein Toaster gemountet)
- `cockpit/src/app/(app)/layout.tsx` (AppLayout, kein Toaster)
- `cockpit/package.json` (kein sonner, kein next-themes, kein anderes Toast-Lib)
- `cockpit/src/components/ui/` (keine sonner.tsx vorhanden)
- `cockpit/reports/RPT-453.md` (SLC-754 Live-Smoke, ISSUE-077-Discovery)
- `cockpit/docs/KNOWN_ISSUES.md` (ISSUE-077-Eintrag mit Next-Action)
- `strategaize-onboarding-plattform/src/components/ui/sonner.tsx` (Pattern-Reuse-Quelle)
- `strategaize-onboarding-plattform/src/app/layout.tsx` (Mount-Pattern)
- `strategaize-onboarding-plattform/package.json` (Dep-Versionen `sonner@^2.0.7` + `next-themes@^0.4.6`)
- Memory `strategaize-pattern-reuse.md` (Pattern-Reuse-Pflicht-Workflow)
- Memory `feedback_no_intermediate_coolify_switches.md` (Live-Smoke aufs Slice-Ende verschieben)
- Memory `feedback_slice_deploy_procedure.md` (Push+Merge-master+Redeploy-Sequenz vor Live-Smoke)

## Recommended Implementation Skill

`/frontend` MT-1 + MT-2 + MT-3 + MT-4 + MT-5 (Sonner-Port + Apply-Pfad + Vitest + Records-Sync).
`/qa` MT-6 (Live-Smoke + Slice-Done).
Nach MT-6: **V7.5 komplett.** Naechster Schritt: Gesamt-/qa V7.5 → /final-check V7.5 → /go-live V7.5 → /deploy als REL-032.
