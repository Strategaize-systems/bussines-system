# SLC-563 — Split-Plan UI + PDF-Renderer-Erweiterung (Sub-Theme B + DEC-120)

## Meta
- Feature: FEAT-561 (Sub-Theme B)
- Priority: High
- Status: planned
- Created: 2026-05-01

## Goal

Proposal-Editor bekommt eine **Split-Plan-Section** zum Anlegen mehrerer Zahlungs-Milestones. Toggle "Teilzahlungen aktivieren" (default off, expandable). Bei aktivem Plan: Add/Remove/Reorder von Milestones mit Sequence + Prozent + Trigger-Typ + optionalen Days-Offset + freier Label-Text. **Live-Summen-Indikator** zeigt in Echtzeit die Summe aller Prozente — gruener Badge bei 100.00, roter Badge mit Diff bei != 100.00. **Save-Button ist disabled solange Sum != 100.00 (DEC-115 strict)**. Server Action `saveProposalPaymentMilestones` macht Validation App-Level (DB hat keinen Aggregate-CHECK). PDF-Renderer wird um den **Konditionen-Block** erweitert (DEC-120): wenn Milestones existieren, wird eine Tabelle "Teilzahlung | Faelligkeit | Betrag" gerendert. Skonto-Block (aus SLC-562) bleibt darunter unveraendert. **Snapshot-Test fuer "ohne Konditionen-Block" muss bit-identisch zu V5.5-PDF sein** (Regression-Schutz). `useSkontoMutex` Hook-Body wird erweitert: prueft jetzt echte Milestones auf Vorkasse-Trigger 100% — bei Match wird Skonto-Toggle auto-disabled (DEC-116).

## Scope

- **`<SplitPlanSection>`-Komponente:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/split-plan-section.tsx` (NEU)
  - Props: `{ proposalId: string, milestones: PaymentMilestone[], totalGross: number, onChange: (milestones: PaymentMilestone[]) => void, disabled?: boolean }`
  - Card-Wrapper mit Title "Teilzahlungen"
  - Toggle (`<Switch>`) "Teilzahlungen aktivieren":
    - Off: zeigt nur kurzen Hinweis "Bei Aktivierung kannst du das Angebot in mehrere Milestones aufteilen"
    - On: zeigt Liste + Add-Button + Live-Summen-Indikator
  - Toggle off setzt `milestones=[]` (clear) — Confirm-Dialog "Bestehende Milestones loeschen?"
  - Wenn Toggle on und `milestones.length === 0`: 1 leerer Milestone wird automatisch angelegt (UX-Convenience)
- **`<MilestoneRow>`-Komponente:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/milestone-row.tsx` (NEU)
  - Props: `{ milestone: PaymentMilestone, totalGross: number, onChange: (m: PaymentMilestone) => void, onDelete: () => void, dragHandleProps?: any }`
  - 6-Spalten-Layout (Mobile: 2-zeilig):
    - Drag-Handle (icon `GripVertical` aus lucide)
    - Sequence-Anzeige (read-only, automatisch berechnet)
    - Prozent-Input (`<Input type="number" min="0.01" max="100" step="0.01">`)
    - Berechneter Betrag (read-only, `totalGross * percent / 100`, formatiert mit `formatCurrency`)
    - `<Select>` Trigger: 4 Optionen (`on_signature`, `on_completion`, `days_after_signature`, `on_milestone`) mit lesbaren Labels
    - Tage-Input (sichtbar nur bei `due_trigger='days_after_signature'`)
    - Label-Input (free text, optional)
    - Delete-Button (icon `Trash`)
- **Drag-and-Drop Reorder via @dnd-kit/sortable:**
  - Bestehende Library aus V5.5 SLC-552 (DEC-105 indirekt — V5.5 hat es bereits installiert)
  - Sortable-Context wraps `<SplitPlanSection>` Liste
  - onDragEnd reordered `milestones`-Array, recalculate `sequence` (1-based)
- **Live-Summen-Indikator:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/sum-indicator.tsx` (NEU)
  - Props: `{ milestones: PaymentMilestone[] }`
  - Berechnung: `sum = milestones.reduce((s, m) => s + m.percent, 0)`
  - Display: 
    - sum === 100.00: gruener Badge "100% — gueltig"
    - sum !== 100.00: roter Badge "{sum.toFixed(2)}% — fehlt {(100-sum).toFixed(2)}%" (oder "ueberschreitet um ..." wenn > 100)
  - Reactive bei jedem `milestones`-Change (kein debounce — sofortiges Feedback)
- **`useSkontoMutex`-Hook erweitert:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` (MODIFY existing aus SLC-562)
  - SLC-563-Body:
    ```typescript
    return milestones.some(m => m.due_trigger === 'on_signature' && m.percent === 100);
    ```
  - Editor-Form aus SLC-562 wird automatisch das echte Mutex-Verhalten nutzen
- **Skonto-Auto-Clear bei Vorkasse-Trigger:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` (MODIFY existing aus SLC-562)
  - useEffect: bei Wechsel von `skontoMutex` von false auf true: `setSkontoPercent(null); setSkontoDays(null);` + Toast-Hinweis "Skonto wurde deaktiviert (Vorkasse erkannt)"
  - Save-Pfad ueberschreibt entsprechend
- **Server Action `saveProposalPaymentMilestones`:**
  - Datei: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
  - Signature: `saveProposalPaymentMilestones({proposalId, milestones, totalGross}): Promise<{ok: true} | {ok: false, error: string}>`
  - Auth-Check, SELECT Proposal (RLS implicit)
  - Wenn `milestones.length === 0`: DELETE alle existierenden Milestones (clear-Plan-Path)
  - Wenn `milestones.length > 0`: Validation:
    - `SUM(milestones.percent) === 100.00` strict (toFixed(2)-Vergleich, keine Toleranz)
    - Jeder Milestone hat valid `due_trigger` (Enum-Check)
    - Bei `due_trigger='days_after_signature'`: `due_offset_days IS NOT NULL && > 0`
    - Sonst: `due_offset_days IS NULL` (sauber)
    - Sequences: 1, 2, 3, ... (1-based, keine Luecken)
  - Bei Validation-Fehler: returnt `{ ok: false, error }`
  - Bei Validation OK: Transaction:
    - `DELETE FROM proposal_payment_milestones WHERE proposal_id=$1`
    - `INSERT INTO proposal_payment_milestones (proposal_id, sequence, percent, amount, due_trigger, due_offset_days, label) VALUES ...` (alle Milestones, `amount = totalGross * percent / 100` Snapshot)
  - Audit-Log: action='update', entity_type='proposal', context='Milestones updated (n={count})'
  - revalidatePath('/proposals/[id]/edit')
- **Server Action `getProposalMilestones(proposalId)`:**
  - Datei: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
  - SELECT alle Milestones eines Proposals ORDER BY `sequence ASC`
  - Used in Editor-Loader + PDF-Renderer
- **PDF-Renderer Konditionen-Block (DEC-120):**
  - Datei: `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY existing)
  - **Backwards-Compat-Pfad bit-identisch zu V5.5/SLC-562:**
    - Wenn `milestones.length === 0` UND `skonto_percent === null`: KEIN Konditionen-Block, PDF-Output bit-identisch zur Pre-V5.6-Logik
  - **Mit Milestones, ohne Skonto:**
    - Block "Konditionen / Teilzahlungen" mit Tabelle `["Teilzahlung", "Faelligkeit", "Betrag"]`
    - Pro Milestone Row: Label oder "Teilzahlung {sequence}" + Trigger-Label-Render + Betrag-formatiert
  - **Mit Skonto, ohne Milestones:**
    - Skonto-Block aus SLC-562 unveraendert
  - **Mit beidem:**
    - Konditionen-Tabelle erst, dann Skonto-Zeile darunter (z.B. "Skonto: 2% bei Zahlung innerhalb 7 Tagen — gilt fuer alle Teilzahlungen")
  - Trigger-Label-Render-Helper:
    - `'on_signature'` -> "Bei Vertragsabschluss"
    - `'on_completion'` -> "Bei Fertigstellung"
    - `'days_after_signature'` -> "{n} Tage nach Vertragsabschluss"
    - `'on_milestone'` -> "Bei Meilenstein" (oder Custom-Label aus `proposal_payment_milestones.label`)
  - Snapshot-Tests werden erweitert (siehe MT-7)
- **PDF-Renderer Signatur-Erweiterung:**
  - `renderProposalPdf(proposal, items, milestones, branding) => Buffer` — Milestones als neuer 3. Param
  - generateProposalPdf Server Action (V5.5 SLC-553) wird angepasst: lade Milestones via `getProposalMilestones` parallel zu existing items
- **Validation-Helper:**
  - Datei: `cockpit/src/lib/proposal/milestones-validation.ts` (NEU)
  - `validateMilestonesSum(milestones: PaymentMilestone[]): { ok: true } | { ok: false, error: string }`
  - `validateMilestoneTrigger(m: PaymentMilestone): { ok: true } | { ok: false, error: string }`
  - Pure Functions, von Server- und Client-Side importiert
- **Cockpit-Records-Update:**
  - `slices/INDEX.md`: SLC-563 done
  - `planning/backlog.json`: BL-415 done
  - `docs/STATE.md`: naechste = SLC-564

## Out of Scope

- Briefing-Cron + Settings-Page (das ist SLC-564)
- Skonto-Berechnung als automatischer Discount in `proposal_items` (PRD-Constraint)
- Multi-Currency Milestones (V7+)
- Conditional-Trigger (z.B. "wenn Customer akzeptiert vor X") (V7+)
- Milestone-PDF-Render mit Faelligkeitsdatum-Berechnung (z.B. "Faellig am 2026-06-15") — V5.6 zeigt nur Trigger-Label, kein Datum
- Auto-Re-Calculate `amount` wenn `proposals.total_gross` sich aendert (Manuel: User klickt "PDF generieren" -> `amount` wird beim naechsten Save snapshotted)
- Cancel-Plan-Auto-Restore von vorherigen Milestones (Toggle-Off ist destruktiv mit Confirm)
- Bulk-Import von Milestone-Templates (z.B. "30/30/40" als Quick-Apply) — V7+

## Acceptance Criteria

- AC1: Editor zeigt `<SplitPlanSection>` als eigene Card unter Konditionen-Bereich.
- AC2: Toggle off: zeigt nur Hinweis-Text. Toggle on: Liste + Add-Button + Sum-Indikator erscheint.
- AC3: Toggle off mit existierenden Milestones: Confirm-Dialog "Bestehende Milestones loeschen?", bei OK: clear.
- AC4: "Add Milestone"-Button: legt neuen Milestone mit Sequence=n+1 + Default-Werten an.
- AC5: "Delete Milestone": entfernt aus Liste, Sequenzen werden 1-based neu nummeriert.
- AC6: Drag-and-Drop reordert Liste, Sequenzen werden re-nummeriert.
- AC7: Live-Summen-Indikator zeigt aktuelle Summe in Echtzeit, gruen bei 100.00, rot mit Diff sonst.
- AC8: Save-Button ist disabled solange Sum != 100.00.
- AC9: Bei `due_trigger='days_after_signature'`: Tage-Input wird sichtbar. Bei anderen Triggern: Tage-Input wird ausgeblendet (und auf NULL gesetzt im State).
- AC10: Server Action `saveProposalPaymentMilestones` validiert Sum strict (=== 100.00, kein Toleranz).
- AC11: Bei Validation-Fehler im Server: returnt `{ ok: false, error }` mit klarer Message.
- AC12: Bei Validation OK: Transaction DELETE+INSERT, Audit-Log-Eintrag.
- AC13: `useSkontoMutex` returnt true wenn ein Milestone mit `due_trigger='on_signature'` und `percent === 100` existiert.
- AC14: Skonto-Toggle wird auto-disabled bei Vorkasse-Trigger; vorhandene Skonto-Werte werden auf null gesetzt mit Toast-Hinweis.
- AC15: PDF-Renderer rendert Konditionen-Tabelle wenn Milestones existieren mit allen Spalten korrekt.
- AC16: PDF-Renderer rendert Skonto-Block (aus SLC-562) unveraendert wenn `skonto_percent !== null`.
- AC17: PDF-Renderer-Output **ohne Milestones UND ohne Skonto** ist bit-identisch zu V5.5-Snapshot (DEC-120). Snapshot-Diff = 0 Bytes.
- AC18: Trigger-Label-Render-Helper wandelt alle 4 Enum-Werte korrekt in lesbare DE-Strings.
- AC19: `amount`-Snapshot wird beim Save persistiert (`amount = totalGross * percent / 100`).
- AC20: Re-Generieren PDF einer V5.5-Proposal (vor V5.6 erstellt, ohne Milestones+Skonto): bit-identisch zu altem PDF.
- AC21: Browser-Smoke (Desktop + Mobile): alle Pfade funktional.
- AC22: TypeScript-Build (`npm run build`) gruen.
- AC23: Vitest (`npm run test`) gruen — neue Tests fuer `validateMilestonesSum`, `validateMilestoneTrigger`, 4 neue Snapshot-Tests fuer Renderer (ohne, nur-Milestones, nur-Skonto, beide).
- AC24: ESLint (`npm run lint`) gruen.

## Dependencies

- SLC-561 abgeschlossen + deployed (`proposal_payment_milestones`-Tabelle existiert)
- SLC-562 abgeschlossen + deployed (`useSkontoMutex` Hook + `<SkontoSection>` + PDF-Skonto-Block existieren)
- V5.5 SLC-552 (Editor-Workspace) — Add/Remove/Reorder-Pattern aus Position-Liste wiederverwendet
- V5.5 SLC-553 (PDF-Renderer + Snapshot-Tests) — Snapshot-Test-Erweiterung als Regression-Schutz
- @dnd-kit/sortable bereits installiert (V5.5 SLC-552)

## Risks

- **Risk:** Sum-Validation strict 0% blockt User bei Rundungs-Tippfehler (z.B. 33+33+33=99).
  Mitigation: Live-Summen-Indikator zeigt Diff explizit. UI-Mental-Model "User korrigiert bewusst auf 100.00". Pattern wie Lohnabrechnung. Per User-Direktive 2026-05-01 (DEC-115).
- **Risk:** Drag-and-Drop ueber-schreibt Sequenzen-State asynchron — Race mit Add/Remove.
  Mitigation: Sequenz-Re-Nummerierung passiert nur in `onDragEnd` und `onDelete`. State-Update ist single-source. Pattern aus V5.5 SLC-552 Position-Liste wiederverwendet.
- **Risk:** Toggle-Off-Confirm-Dialog wird User-Reflex-uebergangen, persistente Daten gehen verloren.
  Mitigation: Confirm-Dialog mit Destructive-Button-Style. Audit-Log-Eintrag bei Clear. User-Mental-Model "Off = clear" konsistent.
- **Risk:** PDF-Renderer-Snapshot-Drift bei "ohne Konditionen-Block".
  Mitigation: Strikte Conditional-Logik in Renderer: `if (milestones.length > 0 || skonto_percent !== null) { ... }`. Kein else-Branch. Snapshot-Test in Vitest ist Pflicht. CI-Pflicht: Diff zu V5.5-Snapshot = 0.
- **Risk:** `useSkontoMutex`-Refactor von SLC-562 Stub auf SLC-563 Real-Body bricht Editor-Flow.
  Mitigation: Hook-API ist gleichgeblieben. `milestones=[]` returnt false, `milestones=[{trigger:'on_signature', percent:100}]` returnt true. Smoke-Test in beiden Modi.
- **Risk:** `amount`-Snapshot wird stale wenn `proposals.total_gross` nach Milestone-Save aktualisiert wird (z.B. neue Position hinzugefuegt).
  Mitigation: Akzeptiert. Beim naechsten Save (User klickt explizit "Speichern" auf Milestones): Re-Compute. Beim "PDF generieren": Server Action koennte vor Render die `amount`s re-computen. Out-of-Scope-Diskussion: Per V5.6-Design: User-Mental-Model "Plan = Snapshot", `total_gross` ist beim Save fixiert. Wenn User `total_gross` aendert, muss er den Plan neu speichern.
- **Risk:** Trigger `on_milestone` ohne klare Faelligkeitsdefinition macht PDF-Output unklar.
  Mitigation: Label-Feld wird genutzt fuer freie Beschreibung ("Bei Meilenstein 'Kickoff'"). PDF rendert Label wenn vorhanden, sonst "Bei Meilenstein".
- **Risk:** Validation Client- vs Server-Drift (z.B. Client erlaubt 100.005, Server prueft 100.00).
  Mitigation: `validateMilestonesSum` ist pure Function in `lib/proposal/milestones-validation.ts`. Beide Seiten importieren. NUMERIC(5,2)-DB-Typ erzwingt 2 Nachkomma. Save-Path serialisiert via `toFixed(2)`.
- **Risk:** Mobile-Layout (Tabs aus V5.3) ist zu eng fuer 6-Spalten-MilestoneRow.
  Mitigation: Mobile-Layout: 2-zeilig (Row 1: Drag + Sequence + Prozent + Betrag, Row 2: Trigger + Tage-Input + Label + Delete). CSS-Grid mit `md:grid-cols-7` Breakpoint.
- **Risk:** Mehrere Milestones mit identischem `due_trigger='on_signature'` (z.B. 50% + 50%) — semantisch verwirrend.
  Mitigation: Out-of-Scope-Hinweis im UI ("Mehrere Vorkasse-Milestones sind ungewoehnlich"). Keine Hard-Blockierung.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/proposals/[id]/edit/split-plan-section.tsx` | NEU: Section-Wrapper |
| `cockpit/src/app/(app)/proposals/[id]/edit/milestone-row.tsx` | NEU: Row-Komponente mit Drag-Handle |
| `cockpit/src/app/(app)/proposals/[id]/edit/sum-indicator.tsx` | NEU: Live-Summen-Indikator |
| `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` | MODIFY: Stub-Body durch Real-Implementation ersetzen |
| `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` | MODIFY: SplitPlanSection einbinden + Skonto-Auto-Clear-useEffect |
| `cockpit/src/lib/proposal/milestones-validation.ts` | NEU: Pure Validation-Functions |
| `cockpit/src/lib/proposal/__tests__/milestones-validation.test.ts` | NEU: Vitest-Tests |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: saveProposalPaymentMilestones + getProposalMilestones |
| `cockpit/src/lib/pdf/proposal-renderer.ts` | MODIFY: Konditionen-Block + Trigger-Label-Render |
| `cockpit/src/lib/pdf/__tests__/proposal-renderer.test.ts` | MODIFY: 4 neue Snapshot-Tests |
| `slices/INDEX.md` | SLC-563 done |
| `planning/backlog.json` | BL-415 done |
| `docs/STATE.md` | SLC-563 done, naechste SLC-564 |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test` gruen (incl. neue Vitest-Tests + 4 Snapshot-Tests)
  - `npm run lint` gruen
- **SplitPlanSection-Smoke:**
  - Toggle off: kein UI sichtbar ausser Hinweis
  - Toggle on: 1 leerer Milestone, Sum-Indikator zeigt 0%, Save disabled
  - Add 2 Milestones (50/50): Sum 100, gruen, Save enabled
  - Add 3 Milestones (33+33+33=99): Sum 99, rot mit Diff, Save disabled
  - Add 3 Milestones (50+50+50=150): Sum 150, rot, Save disabled
- **Reorder-Smoke:**
  - 3 Milestones (Sequence 1,2,3): Drag Position 3 auf Position 1
  - Sequenzen werden re-nummeriert (1=alt-3, 2=alt-1, 3=alt-2)
- **Trigger-Smoke:**
  - Wechsel auf `days_after_signature`: Tage-Input erscheint
  - Wechsel auf anderen Trigger: Tage-Input verschwindet, Wert auf null
  - Validation: bei `days_after_signature` ohne Tage-Wert -> Save blockiert (Inline-Error)
- **Skonto-Mutex-Smoke:**
  - Skonto-Toggle on, dann Milestone mit `on_signature` 100% anlegen
  - useEffect: Toast erscheint "Skonto deaktiviert", Skonto-Toggle wird disabled
  - Skonto-Werte werden auf null gesetzt (DB-Smoke)
- **Server-Action-Smoke:**
  - Save mit valid Plan (50/50): persistiert, Audit-Log-Eintrag
  - Save mit invalid Plan (99): returnt error, kein DB-Write
  - Save mit empty milestones: DELETE bestehender Milestones, kein INSERT
- **PDF-Renderer-Smoke:**
  - PDF mit 0 Milestones, 0 Skonto: Snapshot-Diff zu V5.5-PDF = 0 (CRITICAL)
  - PDF mit 3 Milestones, 0 Skonto: Konditionen-Tabelle sichtbar mit allen 3 Rows
  - PDF mit 0 Milestones, Skonto: Skonto-Block sichtbar (aus SLC-562)
  - PDF mit 3 Milestones + Skonto: Tabelle + Skonto-Zeile darunter
  - Trigger-Labels korrekt: "Bei Vertragsabschluss", "Bei Fertigstellung", "30 Tage nach Vertragsabschluss", "Bei Meilenstein"
  - Visueller Check in Adobe Reader + Chrome PDF Viewer
- **V5.5-Regression-Smoke:**
  - Existing V5.5-Proposal (ohne Milestones+Skonto): "PDF generieren" produziert PDF-Output bit-identisch zu V5.5-Generation (Smoke vor V5.6-Apply gespeichert + after)
  - Versionerstellung (V5.5 DEC-109): V2 wird ohne Milestones angelegt, PDF rendert ohne Konditionen-Block (V5.5-Verhalten)
- **Audit-Log-Smoke:**
  - Save mit Milestones: Eintrag mit `context='Milestones updated (n=3)'`
  - Save mit empty: Eintrag mit `context='Milestones updated (n=0)'`
- **Mobile-Smoke:**
  - Editor in Mobile-Tabs: SplitPlanSection in "Erfassen"-Tab funktional
  - MilestoneRow rendert 2-zeilig auf Mobile
  - Drag-Handle funktioniert auf Touch-Geraeten

## Micro-Tasks

### MT-1: `validateMilestonesSum` + `validateMilestoneTrigger` Pure Functions + Vitest-Tests
- Goal: Validation-Helpers als Single-Source-of-Truth
- Files: `cockpit/src/lib/proposal/milestones-validation.ts` (NEU), `cockpit/src/lib/proposal/__tests__/milestones-validation.test.ts` (NEU)
- Expected behavior:
  - `validateMilestonesSum(milestones)`: returnt `{ok: true}` wenn `Number(sum.toFixed(2)) === 100`, sonst `{ok: false, error}`
  - `validateMilestoneTrigger(m)`: enum-check + `due_offset_days`-Check fuer `days_after_signature`
  - Vitest-Cases: 8+ Cases (empty, single 100, split 50/50, 33+33+33=99, 50+50+50=150, days_after_signature ohne days, etc.)
- Verification: `npm run test milestones-validation.test.ts` gruen
- Dependencies: SLC-561 (Type `PaymentMilestone`)

### MT-2: `useSkontoMutex`-Hook Real-Implementation
- Goal: Stub-Body durch echte Logik ersetzen
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` (MODIFY)
- Expected behavior:
  - Body: `return milestones.some(m => m.due_trigger === 'on_signature' && m.percent === 100);`
  - Code-Kommentar entfernen (kein TODO mehr)
- Verification: TypeScript-Build gruen, Smoke: Editor mit Milestone (on_signature, 100) -> Skonto-Toggle disabled
- Dependencies: SLC-561, SLC-562 (Stub-Hook existiert)

### MT-3: `<SumIndicator>`-Komponente
- Goal: Live-Summen-Anzeige
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/sum-indicator.tsx` (NEU)
- Expected behavior:
  - Berechnung sum auf Render
  - Visual: gruener `<Badge>` bei 100.00, roter `<Badge>` mit Diff sonst
  - Format: `{sum.toFixed(2)}%`
- Verification: Komponentenrender mit unterschiedlichen Inputs
- Dependencies: keine

### MT-4: `<MilestoneRow>`-Komponente
- Goal: Single-Row-UI mit Drag-Handle
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/milestone-row.tsx` (NEU)
- Expected behavior:
  - 6-Spalten-Layout (Desktop) / 2-zeilig (Mobile)
  - Inputs fuer Prozent, Tage (conditional), Label
  - Trigger-Select mit 4 Optionen
  - Berechneter Betrag (read-only, auto-update bei Prozent-Change)
  - Drag-Handle via @dnd-kit/sortable `useSortable`-Hook
  - Delete-Button
- Verification: Browser-Smoke
- Dependencies: SLC-561 (Type), MT-3

### MT-5: `<SplitPlanSection>`-Komponente
- Goal: Section-Wrapper mit Toggle + Liste + Add-Button + SumIndicator
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/split-plan-section.tsx` (NEU)
- Expected behavior:
  - Card mit Title + Toggle
  - Toggle off mit Hinweis-Text
  - Toggle on: Liste (DndContext + SortableContext) + Add-Button + SumIndicator
  - State-Management: `milestones`-Array, onChange propagated up
  - Drag-End-Handler: re-numeriert sequences
  - Toggle off mit existierenden Milestones: AlertDialog Confirm
- Verification: Browser-Smoke alle Toggle-Pfade
- Dependencies: MT-3, MT-4

### MT-6: Editor-Form-Integration + Skonto-Auto-Clear
- Goal: SplitPlanSection einbinden + Skonto-Mutex-Effect
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` (MODIFY)
- Expected behavior:
  - `<SplitPlanSection>` unter Konditionen-Bereich
  - State `milestones: PaymentMilestone[]`, geloadet via `getProposalMilestones(proposalId)`
  - useEffect:
    - `useSkontoMutex(milestones)` -> wenn von false zu true wechselt: `setSkontoPercent(null); setSkontoDays(null); toast.info('Skonto deaktiviert (Vorkasse erkannt)')`
  - Save-Pfad: ruft beide Actions parallel (`updateProposal` + `saveProposalPaymentMilestones`)
  - Save-Button-Disabled-Logic: Sum != 100 -> disabled, Skonto-Validation-Error -> disabled
- Verification: Browser-Smoke E2E
- Dependencies: MT-2, MT-5

### MT-7: Server Actions `saveProposalPaymentMilestones` + `getProposalMilestones`
- Goal: Backend-Persistierung + Read-Path
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - `getProposalMilestones(proposalId)`: SELECT alle ORDER BY sequence, returnt Array
  - `saveProposalPaymentMilestones({proposalId, milestones, totalGross})`:
    - Wenn `milestones.length === 0`: DELETE all
    - Sonst: validateMilestonesSum + validateMilestoneTrigger fuer alle
    - Bei Validation-Fehler: returnt `{ok: false, error}`
    - Transaction: DELETE + INSERT (mit `amount = totalGross * percent / 100` snapshotted)
    - Audit-Log
    - revalidatePath
- Verification: DevTools-Smoke + DB-Check `SELECT * FROM proposal_payment_milestones WHERE proposal_id=...`
- Dependencies: MT-1

### MT-8: PDF-Renderer Konditionen-Block + 4 Snapshot-Tests
- Goal: PDF-Output erweitern + Regression-Schutz
- Files: `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY), `cockpit/src/lib/pdf/__tests__/proposal-renderer.test.ts` (MODIFY)
- Expected behavior:
  - Renderer-Signatur erweitert: `renderProposalPdf(proposal, items, milestones, branding) => Buffer`
  - Trigger-Label-Helper: 4 Enum-Werte -> DE-Strings
  - Conditional-Block:
    ```
    if (milestones.length > 0 || skonto !== null) {
      const block = [];
      if (milestones.length > 0) block.push(milestonesTable);
      if (skonto !== null) block.push(skontoLine);
      content.push({ ... block });
    }
    ```
  - **Striktly: Wenn beide leer/null, KEIN Block, KEIN zusaetzlicher Whitespace**
  - 4 Snapshot-Tests:
    - Test 1: ohne beides -> Diff zu V5.5-Snapshot = 0 (CRITICAL)
    - Test 2: nur Milestones (3) -> neuer Snapshot
    - Test 3: nur Skonto -> identisch zu SLC-562-Snapshot
    - Test 4: beides -> neuer Snapshot
  - generateProposalPdf Server Action (V5.5 SLC-553) wird angepasst um `getProposalMilestones` parallel zu laden
- Verification: `npm run test proposal-renderer.test.ts` gruen, Diff zu V5.5 = 0 fuer Test 1
- Dependencies: MT-7

### MT-9: Browser-Smoke + Cockpit-Records-Update
- Goal: End-to-End Verifikation + Tracking
- Files: `slices/INDEX.md` (MODIFY), `planning/backlog.json` (MODIFY), `docs/STATE.md` (MODIFY)
- Expected behavior:
  - Smoke-Suite (laut QA Focus) auf Hetzner nach Coolify-Redeploy:
    - Mindestens 5 PDFs generieren (ohne, nur-Milestones, nur-Skonto, beide, V5.5-Regression)
    - Visueller Check in Adobe Reader oder Chrome
    - Audit-Log-Smoke + DB-Smokes
  - Records-Update:
    - `slices/INDEX.md`: SLC-563 done
    - `planning/backlog.json`: BL-415 done
    - `docs/STATE.md`: Current Focus auf "V5.6 SLC-563 done, naechste SLC-564 (Pre-Call Briefing)"
- Verification: Smoke-Cases dokumentiert in QA-Report. Cockpit-Refresh zeigt SLC-563 done.
- Dependencies: MT-1..MT-8

## Schaetzung

~5-7h:
- MT-1 (Validation + Tests): ~30min
- MT-2 (useSkontoMutex Refactor): ~10min
- MT-3 (SumIndicator): ~20min
- MT-4 (MilestoneRow): ~60min
- MT-5 (SplitPlanSection): ~60min
- MT-6 (Editor-Integration + Mutex-Effect): ~45min
- MT-7 (Server Actions): ~45min
- MT-8 (PDF-Renderer + 4 Snapshots): ~60-90min (Snapshot-Diff-Verifikation kritisch)
- MT-9 (Smoke + Records): ~45min
- Buffer + Bug-Fix: ~45-60min
