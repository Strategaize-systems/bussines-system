# SLC-572 — Skonto-Toggle UI-State-Drift Bugfix

## Meta
- Feature: FEAT-572
- Priority: Low
- Status: planned
- Created: 2026-05-04

## Goal

Den in V5.6 SLC-562 Live-Smoke (RPT-277) entdeckten UI-State-Drift-Bug fixen: nach mehreren Auto-Save-Errors in der SkontoSection flippt der Toggle visuell auf OFF, obwohl die DB den vorherigen gueltigen State haelt. DB-State ist immer korrekt, das Problem ist rein UX-cosmetic. Fix per **Optimistic-Revert via useRef last-known-good** (DEC-126 Option A): bei jedem erfolgreichen Save wird ref auf neuen DB-State aktualisiert, bei Save-Error rollt der Callback den React-State auf den ref-Wert zurueck. Vitest fuer Save-Error-Pfad und Browser-Smoke gegen RPT-277-Repro.

## Scope

- **Investigation** (~10min): proposal-editor.tsx Zeile ~218ff (`<SkontoSection>`) + `handleProposalChange`/`debouncedPersist`-Pfad genau lesen + `validateSkonto` Verhalten bei Fehler verstehen + `useSkontoMutex` (V5.6) als bereits-existierende Teil-Mitigation einordnen.
- **`lastKnownGoodSkonto`-useRef einbauen**: initialisiert mit DB-State aus initialProposal-Prop, bei jedem successful Save aktualisiert.
- **`debouncedPersist`-Erweiterung**: bei Save-Error rolle React-State zurueck auf ref-Wert (nur die Skonto-Felder, nicht der gesamte proposal-State — andere Felder koennten parallel gueltig editiert werden).
- **Save-Status-Anzeige bleibt**: bei Error wird weiterhin `setSaveStatus('error')` gesetzt — der Revert ist Teil der Recovery, ueberschreibt nicht das Error-Feedback an den User.
- **Vitest fuer Save-Error-Pfad**: Mock saveProposal Server-Action mit `{error: 'validation'}`, simuliere 5x Save-Error in Folge mit ungueltigem Prozent-Wert (z.B. 10), pruefe dass Toggle-State und Input-Werte weiterhin den initial-DB-Wert halten.
- **Browser-Smoke gegen RPT-277-Repro**: Editor mit gueltigem Skonto (z.B. 2.0% / 7 Tage) oeffnen, Prozent-Input auf 10 setzen, debouncePersist feuert, Server lehnt ab — Toggle und Werte muessen weiterhin auf 2.0% / 7 Tage stehen. Wiederholung 5x.
- **Pattern-Erweiterung-Investigation** (Decision in MT-1): pruefen ob PaymentTermsDropdown (V5.6) und SplitPlanSection (V5.6) den gleichen Race-Bug haben. Falls ja: gleiches Pattern (useRef last-known-good + Revert) anwenden. Falls nein: out-of-scope, in QA-Smoke nur regression-frei verifizieren.
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-572 Status `planned -> done`
  - `features/INDEX.md`: FEAT-572 Status `planned -> done`
  - `planning/backlog.json`: BL-419 Status `open -> done`
  - `docs/STATE.md`: V5.7 alle Slices done, naechste = Gesamt-/qa V5.7

## Out of Scope

- Refactor der gesamten Save-Pipeline
- Server-Refetch-Pattern (DEC-126 hat Option A entschieden)
- UI-Lock-Pattern (DEC-126 hat Option A entschieden)
- Erweiterung auf andere Sections im Editor (PaymentTerms/SplitPlan) wenn dort kein Bug existiert (Investigation in MT-1 entscheidet)
- UX-Verbesserung der Skonto-Validation-Errors (separates Backlog wenn noetig)
- Default-Werte-Aenderung bei Toggle-On (V5.6-Verhalten bleibt: 2.0% / 7 Tage)
- Concurrent-Edit-Schutz fuer mehrere Tabs (V7+ Multi-User)

## Acceptance Criteria

- AC1: Investigation-Ergebnis dokumentiert (in MT-1 Verification): Race-Pfad konkret identifiziert, Pattern-Erweiterung-Entscheidung getroffen.
- AC2: `lastKnownGoodSkonto`-useRef in proposal-editor.tsx eingebaut, initialisiert mit `initialProposal.skonto_*`-Werten.
- AC3: Bei erfolgreichem Save wird ref auf neue DB-Werte aktualisiert.
- AC4: Bei Save-Error rolle React-State `skonto_percent` und `skonto_days` zurueck auf ref-Wert.
- AC5: Save-Status `'error'` wird weiterhin gesetzt (User sieht Error-Feedback).
- AC6: Andere proposal-Felder werden NICHT zurueckgerollt bei Save-Error (nur Skonto-Felder).
- AC7: Vitest-Test simuliert 5x Save-Error in Folge mit ungueltigem Prozent-Wert (10) — Toggle bleibt im konsistenten ON-State, Werte bleiben Default 2.0/7.
- AC8: Browser-Smoke gegen RPT-277-Repro: Toggle bleibt nach 5x Save-Error visuell auf ON, Werte bleiben sichtbar 2.0/7.
- AC9: Page-Reload zeigt unveraenderten DB-State (war schon vor V5.7 OK, regression-frei).
- AC10: PaymentTermsDropdown + SplitPlanSection (V5.6) regression-frei: gleiches Repro auf diese Sections angewendet zeigt entweder kein Bug (out-of-scope) oder gleiches Pattern angewendet (in scope, Vitest + Browser-Smoke).
- AC11: TypeScript-Build (`npm run build`) gruen.
- AC12: Vitest (`npm run test`) gruen — neue Test fuer Save-Error-Pfad + ggf. fuer PaymentTerms/SplitPlan.
- AC13: ESLint (`npm run lint`) gruen.

## Dependencies

- V5.6 SLC-562 Code-Stand (SkontoSection + useSkontoMutex existieren)
- V5.6 SLC-563 Code-Stand (SplitPlanSection + saveProposalPaymentMilestones existieren — fuer Pattern-Erweiterung-Investigation)
- V5.5 SLC-552 Editor-Workspace
- V5.5 SLC-554 Server-Action-Pattern
- SLC-571 done (V5.7 Reihenfolge: 571 zuerst)

## Risks

- **Risk:** Investigation findet Race-Bug an anderer Stelle (z.B. in `useDebouncedCallback` selbst), nicht im skizzierten setState-Pfad.
  Mitigation: MT-1 Investigation-Time-Box auf 30min setzen. Bei Pivot: in MT-1 Decision-Note dokumentieren und Fix-Strategie anpassen. Falls Investigation zeigt dass Option A nicht reicht: in /architecture-Re-Loop (DEC-126 supersede mit Option B oder C) statt blind durchzuziehen.
- **Risk:** useRef-Initialisierung mit `initialProposal`-Prop — wenn `initialProposal` waehrend Component-Lifetime aktualisiert wird (z.B. nach revalidatePath), drift der ref.
  Mitigation: useEffect synct ref auf neuen initialProposal-Wert bei Prop-Aenderung. Test-Case in Vitest.
- **Risk:** Revert nur fuer Skonto-Felder, nicht andere Felder — User-Mental-Model "Save-Error rollt nur den Skonto-Teil zurueck" koennte verwirrend sein wenn andere Feld-Aenderungen parallel verworfen werden weil das ganze Save-Payload abgelehnt wurde.
  Mitigation: tatsaechlich werden bei Save-Error alle State-Aenderungen verworfen (DB ist Source-of-Truth), aber der React-State zeigt sie weiter an. Pattern-Wahl: "wir stellen den letzten DB-State fuer Skonto wieder her, andere Felder zeigen weiterhin User-Eingaben". Das ist subtil, aber konsistent zum bisherigen Editor-Verhalten (User sieht eigene Eingaben bis erfolgreicher Save).
- **Risk:** PaymentTermsDropdown nutzt anderes Persist-Pattern (V5.6 schreibt `payment_terms`-Freitext, nicht via Toggle).
  Mitigation: Investigation in MT-1 entscheidet. Falls Pattern unterschiedlich: out-of-scope.
- **Risk:** Vitest-Mock fuer saveProposal-Action erfordert React-Testing-Library + Mock-Setup, der heute im Repo evtl. nicht existiert.
  Mitigation: bestehende Vitest-Tests fuer `validateSkonto` (V5.6) als Referenz. Falls React-Component-Tests nicht etabliert: Pattern als Pure-Function extrahieren (`createSkontoStateReducer(initial, action)`) und nur diese mit Vitest testen — keine Component-Tests noetig.
- **Risk:** Bug ist bereits durch andere V5.6/V5.7-Aenderungen behoben (z.B. Audit-Eintrag-Refactor) ohne explizite Massnahme.
  Mitigation: MT-1 Investigation startet mit Repro auf dem aktuellen V5.7-Stand (nach SLC-571-Deploy). Wenn Bug nicht reproduzierbar: AC8 als "verifiziert nicht reproduzierbar nach SLC-571" abhaken, Slice schliessen.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` | MODIFY: useRef + Revert-Logic in debouncedPersist |
| `cockpit/src/app/(app)/proposals/[id]/edit/__tests__/proposal-editor-skonto-revert.test.tsx` | NEU oder MODIFY: Vitest fuer Save-Error-Pfad |
| (optional) `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx` | MODIFY (wenn gleicher Bug): Pattern-Erweiterung |
| (optional) `cockpit/src/app/(app)/proposals/[id]/edit/split-plan-section.tsx` | MODIFY (wenn gleicher Bug): Pattern-Erweiterung |
| `slices/INDEX.md` | SLC-572 Status `planned -> done` |
| `features/INDEX.md` | FEAT-572 Status `planned -> done` |
| `planning/backlog.json` | BL-419 Status `open -> done` |
| `docs/STATE.md` | V5.7 alle Slices done, naechste = Gesamt-/qa V5.7 |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen (TypeScript)
  - `npm run test` gruen — incl. neue Vitest-Tests fuer Skonto-Revert
  - `npm run lint` gruen
- **Repro-Smoke (RPT-277-Reproduktion):**
  - Editor oeffnen mit Proposal das Skonto AN hat (skonto_percent=2.0, skonto_days=7)
  - Prozent-Input von 2.0 auf 10 setzen — debouncePersist feuert
  - Server-Reject (validateSkonto laesst max 9.99 durch)
  - **Vor V5.7-Fix:** Toggle flippt nach 2-3 Wiederholungen visuell auf OFF
  - **Nach V5.7-Fix:** Toggle bleibt auf ON, Input-Werte bleiben sichtbar 2.0/7 (oder zeigen letzten gueltigen DB-Wert)
  - Wiederholung 5x — Toggle muss konsistent bleiben
- **Vitest-Mock-Smoke:**
  - Save-Error-Mock fuer 5 aufeinanderfolgende Calls
  - `screen.getByRole('switch', { name: /skonto anbieten/i })` muss `aria-checked='true'` halten
  - `screen.getByLabelText('Prozent')` Wert muss bei 2.0 bleiben (oder letztem DB-Wert)
- **Page-Reload-Smoke:**
  - Nach 5x Save-Error: Page reloaden (`window.location.reload()`)
  - Editor zeigt Skonto AN mit 2.0/7 (DB-State, regression-frei)
- **PaymentTerms/SplitPlan-Investigation-Smoke (MT-1 Decision):**
  - Falls in MT-1 entschieden "gleicher Bug, in scope": gleicher Smoke-Pattern fuer beide Sections
  - Falls "out-of-scope": regression-frei verifizieren (V5.6 PaymentTerms-Save-Pfad funktioniert wie vor V5.7)
- **V5.7 SLC-571 Regression-Smoke:**
  - Reverse-Charge-Toggle aus SLC-571 funktioniert weiterhin
  - PDF-Render mit Reverse-Charge-Block weiterhin korrekt
  - Editor mit gemischtem State (Reverse-Charge + Skonto) funktioniert (auch wenn Skonto bei Vorkasse via useSkontoMutex disabled ist)

## Micro-Tasks

### MT-1: Investigation + Decision (Pattern-Erweiterung)
- Goal: Race-Pfad konkret identifizieren + Decision ob PaymentTermsDropdown/SplitPlanSection in scope
- Files: keine Code-Aenderung — nur Investigation, Notizen in Slice-Spec ergaenzen oder als Inline-Comment in proposal-editor.tsx
- Expected behavior: Konkreter setState-Race-Pfad in proposal-editor.tsx benannt. Repro auf V5.7-Stand (post SLC-571) verifiziert oder als "nicht reproduzierbar" abgehakt. Decision-Note ob PaymentTerms/SplitPlan-Pattern in scope.
- Verification: 30min-Time-Box. Repro im Browser gegen aktuelles main. Decision-Note schriftlich in MT-1-Verification dokumentiert (entweder im Slice-File-Update oder in MT-2-PR-Description).
- Dependencies: SLC-571 deployed (V5.7-Stand fuer Repro)

### MT-2: useRef + Revert-Logic in proposal-editor.tsx
- Goal: Optimistic-Revert via lastKnownGoodSkonto-useRef einbauen
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` (MODIFY)
- Expected behavior:
  - useRef initialisiert mit `initialProposal.skonto_percent` + `initialProposal.skonto_days`
  - useEffect synct ref auf Prop-Aenderung (initialProposal-Update via revalidatePath)
  - debouncedPersist-Callback: bei error → setProposal(prev => ({...prev, skonto_percent: ref.current.skonto_percent, skonto_days: ref.current.skonto_days}))
  - bei success → ref.current = { skonto_percent: next.skonto_percent, skonto_days: next.skonto_days }
- Verification: Browser-Repro RPT-277 zeigt Toggle bleibt konsistent (5x). Page-Reload regression-frei.
- Dependencies: MT-1 (Investigation-Decision)

### MT-3: Vitest fuer Save-Error-Revert + ggf. Pattern-Erweiterung
- Goal: Test-Coverage fuer Save-Error-Pfad + ggf. PaymentTerms/SplitPlan
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/__tests__/proposal-editor-skonto-revert.test.tsx` (NEU oder MODIFY), optional payment-terms-dropdown.tsx + split-plan-section.tsx (MODIFY wenn MT-1 in scope)
- Expected behavior:
  - 5 aufeinanderfolgende Save-Error-Calls werden korrekt revertiert
  - Toggle bleibt aria-checked=true
  - Inputs bleiben Default 2.0 / 7
  - Falls Pattern-Erweiterung in scope: gleiche Tests fuer PaymentTerms/SplitPlan
- Verification: `npm run test` gruen. Manueller Test-Run zeigt PASS.
- Dependencies: MT-2

### MT-4: Cockpit-Records-Update + Slice schliessen
- Goal: V5.7 SLC-572 abschliessen, Cockpit zeigt korrekten State
- Files: `slices/INDEX.md` (MODIFY: SLC-572 done), `features/INDEX.md` (MODIFY: FEAT-572 done), `planning/backlog.json` (MODIFY: BL-419 done), `docs/STATE.md` (MODIFY: V5.7 alle Slices done, naechste Gesamt-/qa)
- Expected behavior: Cockpit-View zeigt SLC-572 done, FEAT-572 done, BL-419 done. STATE.md fuehrt naechste Phase als "Gesamt-/qa V5.7".
- Verification: Cockpit visuell PRUEFEN. Counts addieren sich (siehe mandatory-completion-report Verification-Schritt).
- Dependencies: alle vorigen MTs, alle ACs erfuellt
