# SLC-562 — Bedingungs-Dropdown im Editor + Skonto-Toggle (Sub-Themes A + C UI)

## Meta
- Feature: FEAT-561 (Sub-Themes A + C UI)
- Priority: High
- Status: planned
- Created: 2026-05-01

## Goal

Proposal-Editor (`/proposals/[id]/edit`) bekommt zwei neue UI-Bereiche:
1. **Bedingungs-Dropdown** ueber dem bestehenden `payment_terms`-Freitext-Feld. User waehlt aus den Templates aus SLC-561 — Auswahl fuellt das Freitext-Feld vor (= Body wird in `proposals.payment_terms` geschrieben). Manueller Override bleibt jederzeit moeglich. Default-Template wird beim Anlegen neuer Proposals automatisch vorbefuellt (verbleibt als Verhalten konsistent zu V5.5).
2. **Skonto-Toggle** als neue eigene Sektion mit zwei Feldern (Prozent + Tage). Default off — User aktiviert bewusst pro Angebot. UI-Mutex zu Vorkasse-Trigger: wenn der User in SLC-563 einen Vorkasse-Milestone (`on_signature` 100%) anlegt, wird Skonto-Toggle automatisch `disabled` mit Tooltip "Bei Vorkasse nicht anwendbar" (DEC-116). Da SLC-563 (Split-Plan) nach diesem Slice kommt, wird der Mutex-Hook bereits in diesem Slice in einer geteilten `useSkontoMutex`-Hook-Funktion vorbereitet — bei SLC-562-Standalone ist die Hook-Implementation einfach (immer false weil keine Milestones existieren). SLC-563 erweitert die Hook um die echte Milestone-Pruefung.

## Scope

- **`<PaymentTermsDropdown>`-Komponente:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx` (NEU)
  - Props: `{ value: string, onChange: (newBody: string) => void, disabled?: boolean }`
  - shadcn-`<Select>` mit Optionen aus `listPaymentTermsTemplates()` (SLC-561)
  - Erste Option "(eigene Eingabe)" — wenn ausgewaehlt: kein onChange-Trigger (User editiert Freitext-Feld direkt)
  - Andere Optionen: `<SelectItem>` pro Template mit Label als sichtbarem Text + Default-Badge wenn applicable
  - Auswahl ruft `onChange(template.body)` -> Parent setzt `payment_terms` State -> Save-Path nutzt diese (Backend bleibt: `proposals.payment_terms TEXT` aus V5.5)
  - Loader: Server-Component-Render mit `await listPaymentTermsTemplates()` ODER Client-Component mit `useEffect` + `useState` (Pattern siehe `template-actions.ts` aus V5.3)
- **`<SkontoSection>`-Komponente:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/skonto-section.tsx` (NEU)
  - Props: `{ skonto_percent: number | null, skonto_days: number | null, onChange: (percent: number | null, days: number | null) => void, disabled?: boolean }`
  - Toggle-Switch (shadcn `<Switch>`) "Skonto anbieten?" — checked wenn `skonto_percent !== null`
  - Bei `disabled=true` (Mutex): Toggle disabled + Tooltip "Bei Vorkasse nicht anwendbar"
  - Bei aktivem Toggle: zwei Inputs erscheinen
    - Prozent: `<Input type="number" min="0.01" max="9.99" step="0.01">` mit Suffix "%"
    - Tage: `<Input type="number" min="1" max="90" step="1">` mit Suffix "Tage"
  - Toggle-Off-Click clearts Werte (`onChange(null, null)`)
  - Toggle-On-Click setzt Defaults: `onChange(2.0, 7)`
  - Validation: bei Save (Parent-Handler): wenn Toggle on, beide Felder NICHT NULL und in Range. Bei Verstoss: Save blockiert mit Inline-Error-Hint.
- **`useSkontoMutex`-Hook:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` (NEU)
  - Signatur: `useSkontoMutex(milestones: PaymentMilestone[]): boolean`
  - SLC-562-Stub-Implementation: returns `false` immer (weil keine Milestones existieren bis SLC-563)
  - SLC-563 erweitert: `return milestones.find(m => m.due_trigger === 'on_signature' && m.percent === 100)` -> `boolean`
  - Hook ist abstrakt genug, dass SLC-563-Erweiterung trivial ist
- **Editor-Integration:**
  - Datei: `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` (oder existierender Editor-Hauptkomponenten-File aus SLC-552, MODIFY)
  - In der "Konditionen"-Sektion (oder wo `payment_terms` aktuell editierbar ist):
    - `<PaymentTermsDropdown value={paymentTermsBody} onChange={setPaymentTermsBody} />`
    - `<Textarea value={paymentTermsBody} onChange={...} placeholder="z.B. Zahlbar innerhalb von 30 Tagen netto" />` (existing, eventuell aus V5.5 SLC-552)
    - `<SkontoSection skonto_percent={skontoPercent} skonto_days={skontoDays} onChange={(p, d) => { setSkontoPercent(p); setSkontoDays(d); }} disabled={skontoMutex} />`
    - `const skontoMutex = useSkontoMutex(milestones);` // milestones=[] in SLC-562
- **Server-Action-Erweiterung:**
  - Datei: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY existing aus V5.5)
  - `updateProposal` Server Action erweitert um Skonto-Felder:
    - Eingabe: `{ id, ..., skonto_percent: number | null, skonto_days: number | null, payment_terms?: string }`
    - Validation: wenn `skonto_percent !== null` dann `skonto_percent > 0 && skonto_percent < 10` UND `skonto_days > 0 && skonto_days <= 90`. Wenn null: beide null (analog DB-CHECK)
    - UPDATE proposals SET skonto_percent, skonto_days, payment_terms (wenn vorhanden), updated_at=now()
    - Audit-Log: action='update', context='Updated skonto/payment_terms' (kompakt)
- **Initial-Default-Pre-Fill:**
  - Beim Anlegen eines neuen Proposals (`createProposal`-Action in V5.5 SLC-551):
    - Lookup: `SELECT body FROM payment_terms_templates WHERE is_default=true LIMIT 1`
    - Wenn vorhanden: `proposals.payment_terms = template.body`
    - Wenn keine Default-Template: `proposals.payment_terms = NULL` (V5.5-Behavior bleibt)
  - Dies ist ein V5.5-Verhalten-Refinement: bisher war `payment_terms` = Branding-Default-String. Jetzt = Default-Template-Body. Branding-Default-String aus V5.5 wird nicht mehr gelesen — die Default-Template ist Single-Source-of-Truth.
- **PDF-Renderer-Skonto-Block (Vorbereitung fuer SLC-563):**
  - Datei: `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY)
  - Conditional-Block: wenn `proposal.skonto_percent IS NOT NULL`: render Block "Skonto: {percent}% bei Zahlung innerhalb {days} Tagen"
  - Hinweis: Sub-Theme C wird in SLC-562 implementiert (UI-Felder), aber das PDF-Rendering passiert hier auch, weil:
    1. Wenn nur in SLC-563 (Split-Plan + PDF) implementiert: User kann zwischen SLC-562-Deploy und SLC-563-Deploy Skonto-Werte eingeben, aber PDF rendert sie nicht — Drift-Risiko.
    2. Skonto-Render ist trivial (3-Zeilen-Block) — keine starke Kopplung zu Split-Plan.
    3. Snapshot-Test fuer "ohne Skonto" bleibt bit-identisch zu V5.5 — kein Regression-Risiko.
  - Snapshot-Tests werden in diesem Slice um 2 Cases erweitert: (1) ohne Skonto = bit-identisch zu V5.5, (2) mit Skonto = neuer Snapshot.
- **Validation-Helper:**
  - Datei: `cockpit/src/lib/proposal/skonto-validation.ts` (NEU)
  - `validateSkonto(percent: number | null, days: number | null): { ok: true } | { ok: false, error: string }`
  - Pure Function fuer Server- und Client-Side
- **Cockpit-Records-Update:**
  - `slices/INDEX.md`: SLC-562 Status `planned -> done`
  - `planning/backlog.json`: BL-414 (SLC-562-Tracking) `planned -> done`
  - `docs/STATE.md`: naechste = SLC-563

## Out of Scope

- Split-Plan-Section (das ist SLC-563)
- Sum-Validation strict 100% (das ist SLC-563)
- Real-Mutex-Logik basierend auf Milestones (Stub-Hook in SLC-562, SLC-563 erweitert)
- proposal_payment_milestones-Tabelle-Operationen (SLC-563)
- PDF-Konditionen-Block fuer Milestones (SLC-563) — nur Skonto-Block hier
- Briefing-UI (SLC-564)
- Berechnung von Skonto-Beitrag in `proposal_items.discount_pct` — Skonto ist reine Bedingungs-Kommunikation (Out-of-Scope V5.6 PRD)
- Multi-Currency-Skonto (V7+)

## Acceptance Criteria

- AC1: `<PaymentTermsDropdown>` rendert in Editor ueber dem `payment_terms`-Textfeld mit allen Templates aus SLC-561.
- AC2: Erste Dropdown-Option "(eigene Eingabe)" — bei Auswahl wird Textfeld nicht ueberschrieben.
- AC3: Auswahl eines Templates fuellt Textfeld mit `template.body` vor.
- AC4: Default-Template hat Default-Badge im Dropdown sichtbar.
- AC5: Manueller Override des Textfelds nach Dropdown-Auswahl moeglich (kein State-Reset).
- AC6: Beim Anlegen eines neuen Proposals wird `payment_terms` automatisch mit Default-Template-Body vorbefuellt.
- AC7: `<SkontoSection>` rendert in Editor mit Toggle-Switch (default off).
- AC8: Toggle on: zwei Inputs erscheinen (Prozent + Tage) mit Default-Werten 2.0 / 7.
- AC9: Toggle off: Inputs verschwinden, State-Werte werden auf null gesetzt.
- AC10: `useSkontoMutex(milestones=[])` returnt false (Stub) — Toggle ist nutzbar in SLC-562.
- AC11: Validation: Speichern blockiert wenn Toggle on aber ein Input out-of-range. Inline-Error-Hint sichtbar.
- AC12: Server Action `updateProposal` persistiert `skonto_percent` + `skonto_days` korrekt mit Validation.
- AC13: PDF-Renderer rendert Skonto-Block "Skonto: {percent}% bei Zahlung innerhalb {days} Tagen" wenn `skonto_percent IS NOT NULL`.
- AC14: PDF-Renderer-Output ohne Skonto bit-identisch zu V5.5 (Snapshot-Test).
- AC15: Audit-Log enthaelt Eintrag bei Skonto-Update.
- AC16: Browser-Smoke (Desktop): Editor lautet auf, Dropdown funktional, Skonto-Toggle nutzbar.
- AC17: Browser-Smoke (Mobile, Tabs-Layout aus V5.3): Editor-Mobile-Tab "Erfassen" zeigt Dropdown + Skonto-Section korrekt.
- AC18: TypeScript-Build (`npm run build`) gruen.
- AC19: Vitest (`npm run test`) gruen — neue Tests fuer `validateSkonto` + Snapshot-Tests fuer PDF-Renderer.
- AC20: ESLint (`npm run lint`) gruen.

## Dependencies

- SLC-561 abgeschlossen + deployed (`payment_terms_templates` + `listPaymentTermsTemplates` Action existieren, Skonto-Spalten in DB)
- V5.5 SLC-552 (Editor-Workspace existiert)
- V5.5 SLC-553 (PDF-Renderer-Adapter existiert + Snapshot-Tests aus SLC-553)
- V5.5 SLC-551 (`createProposal`-Action existiert mit `payment_terms`-Default-Logik)

## Risks

- **Risk:** Initial-Default-Pre-Fill bricht bestehende V5.5-Proposals (Race wenn alte Drafts ohne Default-Template gespeichert wurden).
  Mitigation: Pre-Fill nur in `createProposal`-Action — bestehende Drafts werden nicht migriert. Konsistent mit PRD V5.6 Constraint "kein Auto-Migration alter Werte".
- **Risk:** Dropdown-Loader latency macht Editor-Mount langsam.
  Mitigation: Loader ist Single-Query, `payment_terms_templates` hat <10 Rows (User-Erfahrung). Sub-100ms typisch.
- **Risk:** Skonto-Toggle-Off bei vorher gesetzten Werten ueberschreibt Daten ohne Confirm.
  Mitigation: User-Mental-Model "Toggle = An/Aus" — Off setzt explicitly null. UI-Hinweis ueber Toggle: "Skonto-Werte werden geloescht beim Deaktivieren". Optional: subtle Confirm.
- **Risk:** PDF-Skonto-Block laesst V5.5-Snapshot-Test brechen weil Layout-Spacing minimal anders.
  Mitigation: Conditional-Block-Logik striktly: `if (skonto_percent !== null) { content.push({...skontoBlock}) }`. Kein else-Branch, kein zusaetzlicher Whitespace bei null. Snapshot-Test fuer "ohne Skonto" muss bit-identisch zu V5.5-Snapshot sein.
- **Risk:** `useSkontoMutex`-Stub gibt SLC-563 Refactor-Pflicht.
  Mitigation: Hook-API bewusst flexibel: Argument `milestones[]` ist immer ein Array, return immer `boolean`. SLC-563 implementiert nur den Body, kein API-Wechsel.
- **Risk:** Editor-Mobile-Tab-Layout (V5.3 DEC-093) hat zu wenig Platz fuer beide neuen Bereiche.
  Mitigation: Beide Bereiche sind kompakt (`<Select>` + Textarea sind eine Unit, Skonto-Section ist eigenstaendiger Card). Mobile-Stack vertikal funktioniert.
- **Risk:** Audit-Log-Spam bei Skonto-Update (User aendert Toggle mehrfach) — viele Eintraege.
  Mitigation: Audit nur bei tatsaechlichem Save. Toggle-Klick ist nur State-Aenderung, kein Save.
- **Risk:** Validation-Inkonsistenz Client vs Server (z.B. UI prueft >= 0.01, Server prueft > 0).
  Mitigation: `validateSkonto` ist pure Function in `lib/proposal/skonto-validation.ts`, von beiden Seiten importiert. DEC-099-Pattern (V5.4).

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx` | NEU: Dropdown-Komponente |
| `cockpit/src/app/(app)/proposals/[id]/edit/skonto-section.tsx` | NEU: Skonto-Toggle + Inputs |
| `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` | NEU: Hook (Stub-Implementation) |
| `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` | MODIFY: Integration der beiden Komponenten |
| `cockpit/src/lib/proposal/skonto-validation.ts` | NEU: Pure Validation-Function |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `updateProposal` + `createProposal` erweitern |
| `cockpit/src/lib/pdf/proposal-renderer.ts` | MODIFY: Skonto-Block conditional |
| `cockpit/src/lib/pdf/__tests__/proposal-renderer.test.ts` | MODIFY: 2 neue Snapshots (mit Skonto + ohne Skonto bit-identisch zu V5.5) |
| `slices/INDEX.md` | SLC-562 done |
| `planning/backlog.json` | BL-414 done |
| `docs/STATE.md` | SLC-562 done, naechste SLC-563 |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen
  - `npm run test` gruen (incl. neue Vitest-Tests fuer `validateSkonto` + 2 Snapshot-Tests fuer Renderer)
  - `npm run lint` gruen
- **Dropdown-Smoke:**
  - Editor lautet auf, Dropdown rendert mit allen Templates
  - "(eigene Eingabe)" als erstes Item, Auswahl behaelt Textfeld unveraendert
  - Auswahl Template fuellt Textfeld
  - Manuelle Override im Textfeld nach Dropdown-Auswahl
  - Default-Badge im Dropdown sichtbar
- **Skonto-Toggle-Smoke:**
  - Toggle off: keine Inputs sichtbar, `skonto_percent=null` im State
  - Toggle on: Inputs erscheinen mit Defaults 2.0 / 7
  - Inputs aendern: State aktualisiert
  - Toggle off nach Werte: Inputs verschwinden, State -> null
- **Validation-Smoke:**
  - Toggle on, Prozent=0: Save-Button disabled, Inline-Error
  - Toggle on, Tage=0 oder >90: Inline-Error
  - Toggle on, Prozent=2.0, Tage=7: Save-Button enabled
- **Mutex-Hook-Smoke (SLC-562 Stub-Modus):**
  - `useSkontoMutex([])` returnt false
  - Skonto-Toggle ist nicht-disabled (weil keine Milestones existieren)
- **PDF-Renderer-Smoke:**
  - Proposal ohne Skonto: PDF-Output bit-identisch zu V5.5-Snapshot (Diff = 0 Bytes)
  - Proposal mit Skonto: PDF zeigt Skonto-Block "Skonto: 2.00% bei Zahlung innerhalb 7 Tagen" (oder leicht abweichende Format-Variante)
  - Re-Generieren bei bestehender V5.5-Proposal: bit-identisch zu V5.5 (regression-frei)
- **Initial-Default-Pre-Fill-Smoke:**
  - Neuen Proposal anlegen via `createProposal`
  - `SELECT payment_terms FROM proposals WHERE id=$newId` zeigt Default-Template-Body "Zahlbar innerhalb von 30 Tagen netto."
- **Audit-Log-Smoke:**
  - Skonto-Toggle on + Save: Audit-Eintrag mit `action='update'`, `context` referenziert Skonto
- **Mobile-Smoke:**
  - `/proposals/[id]/edit` auf Mobile-Viewport (`< md`): Tabs-Layout aus V5.3, "Erfassen"-Tab zeigt beide Bereiche
- **V5.5-Regression-Smoke:**
  - Editor mit altem Proposal (ohne Skonto): rendert ohne Fehler, Skonto-Toggle off
  - "PDF generieren" auf altem Proposal: PDF wie V5.5
  - V5.5 Composing-Studio Anhang-Picker: zeigt Proposals weiterhin

## Micro-Tasks

### MT-1: `validateSkonto` Pure Function + Vitest-Tests
- Goal: Single-Source-of-Truth fuer Validation
- Files: `cockpit/src/lib/proposal/skonto-validation.ts` (NEU), `cockpit/src/lib/proposal/__tests__/skonto-validation.test.ts` (NEU)
- Expected behavior:
  - Function: `(percent: number | null, days: number | null) => { ok: true } | { ok: false, error: string }`
  - Cases:
    - `(null, null)` -> ok (= disabled)
    - `(2.0, 7)` -> ok
    - `(0, 7)` -> error 'Skonto-Prozent muss > 0 und < 10 sein'
    - `(10, 7)` -> error
    - `(2.0, 0)` -> error 'Skonto-Tage muss > 0 und <= 90 sein'
    - `(2.0, 91)` -> error
    - `(2.0, null)` -> error 'Beide Skonto-Felder muessen gesetzt sein'
    - `(null, 7)` -> error
  - Vitest-Tests: 8 Cases, alle PASS
- Verification: `npm run test cockpit/src/lib/proposal/__tests__/skonto-validation.test.ts` gruen
- Dependencies: SLC-561

### MT-2: `useSkontoMutex`-Hook (Stub-Implementation)
- Goal: Hook-API definieren mit Stub-Body fuer SLC-562
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/use-skonto-mutex.ts` (NEU)
- Expected behavior:
  - `useSkontoMutex(milestones: PaymentMilestone[]): boolean`
  - SLC-562: returns `false` always
  - Code-Kommentar: "// SLC-563 erweitert: prueft Vorkasse-Trigger 100%"
  - Type `PaymentMilestone` aus `cockpit/src/lib/types/proposal-payment.ts` (definiert in SLC-561 oder als TODO bis SLC-563)
- Verification: TypeScript-Build gruen, Hook-Import-Smoke
- Dependencies: SLC-561

### MT-3: `<SkontoSection>`-Komponente
- Goal: UI-Komponente fuer Skonto-Toggle
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/skonto-section.tsx` (NEU)
- Expected behavior:
  - Card-Wrapper mit Title "Skonto"
  - Toggle (`<Switch>`) "Skonto anbieten?"
  - Wenn `disabled=true`: Toggle disabled + Tooltip "Bei Vorkasse nicht anwendbar"
  - Wenn Toggle on: zwei Inputs (Prozent + Tage) mit Suffix-Texten
  - Validation-Error-Hint inline ueber `validateSkonto`
  - State-Management: lokaler State + `onChange` Callback an Parent
- Verification: Browser-Smoke. Storybook ggf. (out-of-scope wenn nicht eingerichtet).
- Dependencies: MT-1, MT-2

### MT-4: `<PaymentTermsDropdown>`-Komponente
- Goal: UI-Komponente fuer Bedingungs-Auswahl
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/payment-terms-dropdown.tsx` (NEU)
- Expected behavior:
  - shadcn-`<Select>` mit Loader auf `listPaymentTermsTemplates()`
  - Erste Option "(eigene Eingabe)" — onChange-noop
  - Andere Options: Template-Label (+ Default-Badge)
  - Auswahl ruft `onChange(template.body)`
  - Loader-State: "Loading..." waehrend Fetch
- Verification: Browser-Smoke
- Dependencies: SLC-561 (`listPaymentTermsTemplates` Action)

### MT-5: Editor-Form-Integration
- Goal: Beide Komponenten in Editor einbinden
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/[id]-edit-form.tsx` (MODIFY)
- Expected behavior:
  - Im "Konditionen"-Bereich: `<PaymentTermsDropdown>` ueber dem bestehenden `<Textarea>` fuer `payment_terms`
  - Eigene Section: `<SkontoSection>` mit `useSkontoMutex(milestones=[])` Hook-Call
  - State-Reichung: paymentTerms-Body, skontoPercent, skontoDays
  - Save-Pfad ruft erweiterte `updateProposal` Action mit allen 3 Werten
- Verification: Browser-Smoke der gesamten Editor-Flow
- Dependencies: MT-3, MT-4

### MT-6: Server Action `updateProposal` + `createProposal` Erweiterung
- Goal: Backend-Persistierung
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - `updateProposal(input)` erweitert um `skonto_percent` + `skonto_days` + `payment_terms` (Optionalfelder, fallback aufexisting):
    - Validation via `validateSkonto`
    - UPDATE Statement
    - Audit-Log
    - revalidatePath
  - `createProposal(input)` erweitert um Default-Pre-Fill:
    - Vor INSERT: `SELECT body FROM payment_terms_templates WHERE is_default=true LIMIT 1`
    - Wenn vorhanden: `input.payment_terms = result.body`
    - INSERT proceed
- Verification: DevTools-Smoke + DB-Check `SELECT payment_terms, skonto_percent, skonto_days FROM proposals WHERE id=...`
- Dependencies: MT-5

### MT-7: PDF-Renderer Skonto-Block
- Goal: PDF-Output erweitern
- Files: `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY), `cockpit/src/lib/pdf/__tests__/proposal-renderer.test.ts` (MODIFY)
- Expected behavior:
  - In renderProposalPdf: nach Brutto-Summary + vor Footer: conditional Block:
    ```
    if (proposal.skonto_percent !== null && proposal.skonto_days !== null) {
      content.push({ text: `Skonto: ${proposal.skonto_percent}% bei Zahlung innerhalb ${proposal.skonto_days} Tagen`, ... })
    }
    ```
  - Snapshot-Tests:
    - Test 1: Proposal ohne Skonto -> bit-identisch zu V5.5-Snapshot (Diff=0)
    - Test 2: Proposal mit Skonto (2.0, 7) -> neuer Snapshot mit erwartetem Skonto-Text
- Verification: `npm run test proposal-renderer.test.ts` gruen, beide Snapshots PASS
- Dependencies: MT-6

### MT-8: Browser-Smoke + Cockpit-Records-Update
- Goal: End-to-End Verifikation + Tracking-Files
- Files: `slices/INDEX.md` (MODIFY), `planning/backlog.json` (MODIFY), `docs/STATE.md` (MODIFY)
- Expected behavior:
  - Smoke-Run laut QA Focus auf Hetzner nach Coolify-Redeploy:
    - 8 Smoke-Cases (Dropdown, Skonto-Toggle, Validation, Mobile, Audit, Init-Default, V5.5-Regression)
    - Mindestens 1 PDF generieren mit Skonto + 1 ohne Skonto -> visueller Check + DB-Check `pdf_storage_path`
  - `slices/INDEX.md`: SLC-562 Status `planned -> done`
  - `planning/backlog.json`: BL-414 `planned -> done`
  - `docs/STATE.md`: Current Focus auf "V5.6 SLC-562 done, naechste SLC-563"
- Verification: alle Smoke-Cases dokumentiert in QA-Report (RPT-XXX). Cockpit-Refresh zeigt SLC-562 done.
- Dependencies: MT-1..MT-7

## Schaetzung

~3-4h:
- MT-1 (validateSkonto + Tests): ~20min
- MT-2 (useSkontoMutex Stub): ~10min
- MT-3 (SkontoSection): ~30min
- MT-4 (PaymentTermsDropdown): ~30min
- MT-5 (Editor-Integration): ~30min
- MT-6 (Server Actions): ~30min
- MT-7 (PDF-Renderer + Snapshots): ~30-45min
- MT-8 (Smoke + Records): ~30min
- Buffer: ~30min
