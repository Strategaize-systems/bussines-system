# SLC-631 — V6.3 Polish-Bündel

## Metadata
- **Slice ID:** SLC-631
- **Version:** V6.3
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-06
- **Estimated Effort:** ~3-4h (1 Session)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Begründung: alle 7 MTs sind unabhängige Low-Risk-Cleanups, keine kritischen Pfade, Rollback per Commit-Revert trivial)

## Goal

V6.2-Polish-Sprint: 5 V6.2-/qa-Findings + 1 V5.6-Carryover (ISSUE-050) + Backlog-Hygiene in einer Session bündeln. Keine neuen Features, kein Schema-Change, keine neuen Routes, keine architektur-relevanten Entscheidungen.

## Scope

**In Scope (7 MTs):**
- BL-426 Sub-Items 1-3: Workflow-Builder Lint + Settings-Sub-Nav + Primary-Button-Position
- BL-422: Reverse-Charge-Toggle UI-State-Drift Fix (Pattern aus SLC-572)
- ISSUE-050: Audit-Log UI-Renderer für nested-changes
- L4: trigger-sources.ts AC12-Wortlaut Doku-Update
- L5 + Housekeeping: npm audit Investigation + 3 doppelte BL-Einträge bereinigen

**Out of Scope:**
- npm audit fix --force (Breaking-Change-Risk, defer als BL-V6.4 wenn nötig)
- BL-397 GitHub-App Org-Anbindung (separater Compliance-Sprint)
- BL-420/421 VAT-Themen (separater Tax-Sprint)
- BL-423/424/425 V6.3-Items mit echtem Aufwand (Cleanup-Cron + Source-Migration + Multi-Touch-Tab — bleiben offene V6.3-Items für separaten späteren Sprint)
- ISSUE-042 OpenAI-Key-Rotation (User-Direktive 2026-05-01: "Pre-Production-Compliance-Gate kommt viel später")

## Acceptance

- AC-1: V6.2-spezifischer Lint-Error in `rule-builder.tsx:57` ist behoben (`npm run lint` zeigt keinen V6.3-spezifischen Error mehr).
- AC-2: Settings-Sub-Nav zeigt Workflow-Automation als eigenen Eintrag, klickbar, navigiert zu `/settings/automation`.
- AC-3: `/settings/automation` und `/settings/payment-terms` haben Primary-Button im selben visuellen Slot.
- AC-4: Reverse-Charge-Toggle Drift-Fix: bei Server-Reject rolled UI auf last-known-good zurück, Inputs bleiben gemountet.
- AC-5: Audit-Log-Page rendert `update`-Eintraege mit `{before, after}` als formatierten Diff (`field: oldValue → newValue`) statt `[object Object]`.
- AC-6: trigger-sources.ts notes-Felder + ggf. SLC-622-Spec spiegeln Code-Realität wider (4 von ~12 Pfaden dispatchen, V1-Reduktion plausibel).
- AC-7: `npm audit` ist analysiert — entweder reduzierte Findings oder dokumentierte Defer-Entscheidung in V6.4-Backlog.
- AC-8: BL-427/428/429 als Duplikate bereinigt (`done` mit Resolution "Duplicate of BL-423/424/425").
- AC-9: Build success, Vitest min. 361/361 (vor-V6.3) + neue Vitest aus MT-4 + MT-5 (~10-12 + ~5-8) = ~376-381 PASS.
- AC-10: V6.3 Live-Smoke nach Coolify-Redeploy: alle 6 funktionalen MTs (1-6) im Browser bestätigt.

## Reuse

- **SLC-572 Pattern**: `lastKnownGood<X>Ref` + `revertPatchIf<X>Failed`-Pure-Function (aus skonto-revert.ts) wird auf RC-Toggle übertragen (MT-4)
- **ISSUE-052/055 Pattern**: base-ui SelectValue render-callback (bereits etabliert seit V5.7-Hotfix + V6.2-Hotfix) — nicht weiter benötigt in V6.3, aber als Referenz im Sub-Nav-Layout-Pattern relevant
- **Audit-Log-Format-Pattern**: existing `tax_rate: 9 → 0`-Renderer als Vorlage für nested-Diff (MT-5)

## Risks

- **MT-5 (ISSUE-050)**: Renderer-Pattern-Wechsel könnte andere Audit-Renderer beeinflussen → Pre-Scan ob es weitere Stellen gibt die das Pattern ähnlich verwenden.
- **MT-7 (npm audit)**: `--force` ausgeschlossen ohne explizites User-OK. Investigation-Only-Strategie, dokumentierte Defer falls non-trivial.
- **MT-4 (BL-422)**: Pattern-Übertragung von Skonto auf RC könnte subtile Unterschiede in den Reject-Pfaden offenbaren — Vitest abdeckt 4 Reject-Pfade aus `validateReverseCharge` + den Optimistic-Revert.

## Verification Strategy

### Pre-Implementation
- Pre-Scan für MT-5: alle Stellen finden die `audit_log.changes` rendern (Grep auf `changes` in `cockpit/src/app/(app)/audit-log/`)
- Pre-Scan für MT-2: aktuelle `/settings/*`-Sidebar-Implementation finden + Pattern verstehen

### Per-MT Verification
Siehe Micro-Tasks unten.

### Slice-Level Verification
- `npm run lint` — V6.3-Lint-Findings = 0
- `npm run test` — alle Tests grün, Anzahl = 361 + neue (MT-4: ~10-12, MT-5: ~5-8)
- `npm run build` — compile success
- Live-Smoke nach Coolify-Redeploy: Browser-Walk-Through aller 6 funktionalen MTs

---

## Micro-Tasks

### MT-1: BL-426 Sub-Item 1 — rule-builder.tsx:57 Lint-Cleanup
- **Goal:** React-hooks/set-state-in-effect Warning beheben via useState-Initializer-Function statt useEffect.
- **Files:**
  - `cockpit/src/app/(app)/settings/automation/_components/rule-builder.tsx` (MODIFY)
- **Expected behavior:** `useState`-Initializer-Function (`useState(() => mediaQuery.matches)`) ersetzt den useEffect-MQ-Init-Pfad. Lint-Error verschwindet, Funktion identisch.
- **Verification:**
  1. `npm run lint` — der V6.2-Lint-Error für `rule-builder.tsx:57` muss weg sein
  2. `npm run build` — success
  3. Vitest 361/361 unverändert
- **Dependencies:** none

### MT-2: BL-426 Sub-Item 2 — Settings-Sub-Nav Workflow-Automation-Eintrag
- **Goal:** Sidebar in /settings/* zeigt Workflow-Automation als eigenen Sub-Menu-Eintrag.
- **Files:**
  - `cockpit/src/app/(app)/settings/layout.tsx` ODER `cockpit/src/app/(app)/settings/_components/settings-sidebar.tsx` (Pfad während Implementation verifizieren) (MODIFY)
- **Expected behavior:** Im Settings-Sidebar erscheint "Workflow-Automation" als klickbarer Link analog zu existierenden Sub-Nav-Eintraegen (Branding, Zahlungsbedingungen, etc.). Routing zu `/settings/automation` funktioniert.
- **Verification:**
  1. Browser-Smoke nach Redeploy: `/settings/branding` öffnen → Sidebar zeigt Workflow-Automation-Link
  2. Click navigiert zu `/settings/automation`
  3. Active-State des Sidebar-Links ist korrekt auf Workflow-Page
- **Dependencies:** none

### MT-3: BL-426 Sub-Item 3 — Primary-Button-Position vereinheitlichen
- **Goal:** Konsistenz zwischen `/settings/automation` (Page-Header rechts) und `/settings/payment-terms` (innerhalb Card-Header). Default-Pattern: Page-Header rechts. `/settings/payment-terms` anpassen.
- **Files:**
  - `cockpit/src/app/(app)/settings/payment-terms/page.tsx` (MODIFY) — `/settings/automation` bleibt unverändert (Referenz-Pattern)
- **Expected behavior:** Beide Pages haben Primary-Button (Neuer Workflow / Neue Vorlage) im selben visuellen Slot (Page-Header rechts).
- **Verification:**
  1. Browser-Smoke: beide Pages öffnen + side-by-side Vergleich der Button-Position
  2. Funktionalität (Click → Modal/New-Page) unverändert
- **Dependencies:** none

### MT-4: BL-422 — Reverse-Charge-Toggle UI-State-Drift Fix
- **Goal:** Pattern aus SLC-572 (Skonto) auf RC-Toggle anwenden — `lastKnownGoodReverseChargeRef` + `revertPatchIfReverseChargeFailed`-Pure-Function. Inputs bleiben gemountet bei Server-Reject, State rolled zurück.
- **Files:**
  - `cockpit/src/lib/proposal/reverse-charge-revert.ts` (NEU — Pure-Function analog `skonto-revert.ts`)
  - `cockpit/src/lib/proposal/reverse-charge-revert.test.ts` (NEU — Vitest analog `skonto-revert.test.ts`)
  - `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` (MODIFY — useRef-Init + Save-Success-Update + Save-Error-Revert)
- **Expected behavior:**
  - Pure-Function `revertPatchIfReverseChargeFailed(currentState, lastKnownGoodRef, error)` returnt Revert-Patch wenn RC-Touching-Patch und error vorhanden
  - `lastKnownGoodReverseChargeRef` initialisiert mit `proposal.reverse_charge` + `proposal.tax_rate`
  - Bei Save-Success: Ref aktualisiert mit neuen Werten
  - Bei Save-Error für RC-Touching-Patch: `onProposalChange(revert)` mit last-known-good-Werten
  - Inputs bleiben gemountet weil isOn-Inferenz analog ISSUE-051-Fix robust ist
- **Verification:**
  1. `npm run test` — neue Vitest 10-12/10-12 PASS, Pure-Function-Tests in node-env
  2. Vitest deckt 4 Reject-Pfade aus `validateReverseCharge` ab (kein vat_id, kein company-vat_id, EU-Country falsch, Cross-Border-Check)
  3. Live-Smoke nach Redeploy: Test-Proposal anlegen ohne Branding-vat_id → RC-Toggle ON → Server-Error-Toast → Toggle visuell zurück auf OFF nach max 500ms
  4. DB-State immer korrekt (verify via psql nach Test)
- **Dependencies:** none

### MT-5: ISSUE-050 — Audit-Log UI-Renderer für nested-changes
- **Goal:** Audit-Log-Page rendert `update`-Eintraege mit `{before, after}` als formatierten Diff statt `[object Object]`.
- **Files:**
  - `cockpit/src/app/(app)/audit-log/page.tsx` (MODIFY — Changes-Cell-Renderer)
  - `cockpit/src/lib/audit/format.ts` (NEU — Helper-Funktion `formatAuditChanges`)
  - `cockpit/src/lib/audit/format.test.ts` (NEU — Vitest)
- **Expected behavior:**
  - `formatAuditChanges(changes, action)` returnt strukturierten Diff:
    - Bei `action='update'` mit `{before:{...}, after:{...}}`: zeilenweise `field: before → after`
    - Bei flat-Action (`reverse_charge_toggled`, `tax_rate: 9 → 0`): unverändert wie aktuell
    - Bei `action='create'` mit `{after:{...}}`: nur `after`-Werte als Liste
    - Bei `action='delete'` mit `{before:{...}}`: nur `before`-Werte als Liste
  - `audit-log/page.tsx` Changes-Cell ruft `formatAuditChanges` auf
- **Verification:**
  1. Vitest neue Tests PASS (~5-8 Cases inkl. update-nested + flat-action + create + delete)
  2. Pre-Scan zeigt alle Stellen die changes rendern → konsistente Anwendung
  3. Live-Smoke: `/audit-log` öffnen → 1× Workspace-Auto-Save (z.B. Title-Edit) → Audit-Eintrag rendert lesbar (z.B. `title: "Old" → "New"`) statt `[object Object] → [object Object]`
  4. Bestehender `tax_rate: 9 → 0`-Render bleibt korrekt (V5.7-Audit-Eintraege)
- **Dependencies:** none. Pre-Scan-Risk: ggf. mehrere Sub-Tasks wenn weitere Renderer betroffen.

### MT-6: L4 — trigger-sources.ts AC12-Wortlaut Doku-Update
- **Goal:** AC12-Wortlaut-Diskrepanz aus RPT-321 Medium-Finding klären.
- **Files:**
  - `cockpit/src/lib/automation/trigger-sources.ts` (MODIFY — notes-Felder klarer formulieren)
  - `slices/SLC-622-automation-engine.md` (MODIFY — AC12-Wortlaut präziser)
- **Expected behavior:** Doku spiegelt Code-Realität wider:
  - notes-Felder explizit: "V1 nicht verdrahtet — system-getriggerte Activities aus Cron-Pfaden lösen V1 keine Workflows aus"
  - SLC-622-Spec AC12 umformuliert: "alle aktiven primären User-Pfade haben dispatchAutomationTrigger-Aufruf integriert (V1-Reduktion: 4 von ~12 dispatchen, 8 sind dokumentiert mit dispatches_now:false + Begründung)"
  - Keine Code-Funktion-Änderung
- **Verification:**
  1. Doku-Review: trigger-sources.ts notes-Felder + SLC-622 AC12 stimmen mit Code-Realität überein
  2. Lint clean (keine TypeScript-Errors durch Comment-Änderungen)
  3. Vitest 361/361 unverändert
- **Dependencies:** none

### MT-7: L5 + Housekeeping — npm audit Investigation + Backlog-Dedup
- **Goal:** Zwei unabhängige Hygiene-Aktionen.
- **Files:**
  - `cockpit/package.json` + `cockpit/package-lock.json` (nur falls `npm audit fix` non-breaking) (MODIFY)
  - `planning/backlog.json` (MODIFY — BL-427/428/429 → done mit Duplicate-Resolution)
  - ggf. `docs/KNOWN_ISSUES.md` (MODIFY — Vuln-Status-Dokumentation falls defer)
- **Expected behavior:**
  - **L5 (npm audit)**:
    1. `npm audit` analysieren — die 9 Vulnerabilities (8 moderate + 1 high)
    2. Wenn `npm audit fix` non-breaking → ausführen, Lock-File aktualisieren
    3. Wenn `--force` mit Breaking-Change (next 9.3.3, shadcn 3.8.4) nötig → defer als BL-V6.4-Item dokumentieren
    4. Falls bestehende Findings nicht ohne Force fixbar: Status-Update in KNOWN_ISSUES.md mit Defer-Begründung
  - **Housekeeping**: 3 doppelte BL-Einträge dedupliziern:
    - BL-427 → status `done`, description: "Duplicate of BL-423 — bereinigt im V6.3-Slice SLC-631 MT-7"
    - BL-428 → status `done`, description: "Duplicate of BL-424 — bereinigt im V6.3-Slice SLC-631 MT-7"
    - BL-429 → status `done`, description: "Duplicate of BL-425 — bereinigt im V6.3-Slice SLC-631 MT-7"
- **Verification:**
  1. `npm audit` zeigt entweder weniger oder gleich viele Findings (kein neues)
  2. Build success, Vitest 361/361
  3. Backlog-Status-Check: BL-427/428/429 alle `done`, BL-423/424/425 weiter `open` (V6.3-Folge-Items)
- **Dependencies:** none. **Risk:** `npm audit fix --force` ist ausgeschlossen ohne explizites User-OK.

---

## Execution Order

Empfohlene Reihenfolge nach Risk + Test-Coverage:

1. **MT-7** (Housekeeping zuerst) — schafft sauberen Backlog-Stand
2. **MT-1** (Lint-Fix) — schnellster Win
3. **MT-6** (Doku-Update) — kein Code, schnell durch
4. **MT-2 + MT-3** (UI-Polish-Block) — beides in Settings-Sub-Tree
5. **MT-4** (BL-422 RC-Toggle) — größter MT mit Pure-Function + Test + Editor-Wiring
6. **MT-5** (ISSUE-050 Audit-Log) — letzter MT, evtl. Pattern-Scan zeigt mehrere Stellen

## Definition of Done

- AC-1..10 alle erfüllt
- Vitest grün (alle existing + neue)
- Build success
- Lint clean (keine V6.3-Findings)
- Live-Smoke nach Coolify-Redeploy: Browser-Walk-Through bestätigt MT-2 + MT-3 + MT-4 + MT-5
- Records aktualisiert: SLC-631 done, KNOWN_ISSUES (ISSUE-050 resolved + ggf. Vuln-Defer), Backlog-Dedup, STATE.md, V6.3-roadmap stable

## Recommended Next Step

**`/frontend SLC-631`** — überwiegend Frontend-Cleanups + Pure-Function-Library. Backend-Touch nur in MT-7 (package.json/Lock-File). Nach Implementation: `/qa SLC-631` → `/final-check V6.3` → `/go-live` → `/deploy als REL-025`.
