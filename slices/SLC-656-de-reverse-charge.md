# SLC-656 — DE-§13b Reverse-Charge-Block (BL-421)

## Metadata
- **Slice ID:** SLC-656
- **Version:** V6.5
- **Feature:** FEAT-652
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-08
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Feature-Erweiterung mit klarem File-Scope, atomic-revertable)
- **Architecture:** DEC-162 (DE-Phrase PRELIMINARY, Anwaltspruefung deferred)

## Goal

DE-Reverse-Charge § 13b UStG als Pendant zur V5.7-NL-Variante. Editor-Toggle in DE-Mode aktivierbar mit gleicher 3-Voraussetzungen-Logik. PDF-Block kontextabhaengig (DE oder NL je Branding-Country).

## Scope

**In Scope:**
- `cockpit/src/lib/pdf/de-reverse-charge-block.ts` neu mit DE-Pflichtformulierung (PRELIMINARY)
- `cockpit/src/lib/pdf/proposal-renderer.ts` erweitern fuer Branding-Country-abhaengiges Block-Rendering (DE oder NL)
- Editor: Reverse-Charge-Toggle in DE-Mode aktivierbar (V5.7 hatte Toggle disabled in DE-Mode)
- Editor: ICP-Equivalent-Inline-Note im Editor (User-Reminder, nicht in PDF)
- Vitest + PDF-Snapshot-Tests fuer DE+NL-Pfad
- Live-Smoke: 1 DE-PDF + 1 NL-PDF generieren

**Out of Scope:**
- Multi-Country-Reverse-Charge (AT, FR etc.)
- Inland-§13b Abs. 2 (anderer Anwendungsfall, V5.7-Reverse-Charge-Logik nicht passend)
- Zusammenfassende Meldung-Export (XML-Format) — out-of-V6.5
- Anwaltspruefung der DE-Phrase (DEC-162 PRELIMINARY)

## Acceptance Criteria

- AC-1: `lib/pdf/de-reverse-charge-block.ts` exportiert `buildDeReverseChargeBlock()` Pure-Function, returnt pdfmake-Content-Array mit DE-Pflichtformulierung "Steuerschuldnerschaft des Leistungsempfaengers" + Verweis auf § 13b UStG / Art. 196 VAT Directive 2006/112/EC
- AC-2: Inline-Code-Kommentar in de-reverse-charge-block.ts: `// PRELIMINARY: needs legal review before customer-live (DEC-162, ISSUE-042-Pattern Pre-Production-Compliance-Gate)`
- AC-3: `proposal-renderer.ts` waehlt zwischen DE- und NL-Block basierend auf `branding.country` (DE → DE-Block, NL → NL-Block, sonst → kein Block)
- AC-4: Editor: Reverse-Charge-Toggle ist in DE-Mode aktivierbar wenn alle 3 V5.7-Voraussetzungen erfuellt (Branding-Country=DE, Company-Country=EU-non-DE, Company-VAT-ID-vorhanden); Tooltip-Hinweis "Toggle deaktiviert weil X" ist passend
- AC-5: Editor: Inline-Note unter Reverse-Charge-Section "Beachte Zusammenfassende Meldung-Pflicht (ZM, Aequivalent zu NL-ICP)" sichtbar wenn Toggle aktiv und DE-Mode
- AC-6: PDF-Snapshot-Tests fuer DE-Block + NL-Block (mind. 2 Tests, analog V5.7 SLC-571 MT-8)
- AC-7: `npm run build` clean, Vitest 405/405+ PASS, kein neuer Lint-Error
- AC-8: Live-Smoke nach Coolify-Redeploy: 1 NL-PDF (existing flow) + 1 DE-PDF (neu) generiert + visuell verifiziert dass DE-Phrase korrekt erscheint

## Reuse

- V5.7 `cockpit/src/lib/pdf/reverse-charge-block.ts` (NL-Block) als Vorlage 1:1 fuer DE-Variante
- V5.7 `useReverseChargeEligibility`-Hook + `countryNameToCode`-Mapper unangetastet
- V5.7 `validateReverseCharge` Server-Side-Validation unangetastet
- V5.7 PDF-Snapshot-Test-Pattern

## Risks

- **DE-Pflichtformulierung-Korrektheit:** ohne Anwaltspruefung kann Phrase rechtlich unsauber sein. Mitigation: PRELIMINARY-Marker in Code-Kommentar + Pre-Production-Anwaltspruefung-Reminder in DECs/RPT
- **Branding-Country-Drift:** wenn Branding-Country zwischendurch von NL auf DE geaendert wird, koennten alte NL-PDFs neu rendern als DE. Mitigation: PDF-Generation ist deterministic basierend auf aktueller Branding zur Render-Zeit (V5.5-Pattern)
- **PDF-Layout-Drift:** DE-Phrase ist laenger als NL-Phrase, koennte Layout-Reflow erzeugen. Mitigation: PDF-Snapshot-Tests fangen Visual-Regression
- **ICP-Inline-Note-UX:** zu viel Text im Editor verwirrt. Mitigation: kurz halten ("ZM-Pflicht beachten" plus Tooltip mit Details)

## Verification Strategy

- Pre: V5.7 NL-Reverse-Charge-Block lesen + V5.7 useReverseChargeEligibility-Logik
- Per-MT: TS-Compile + Vitest
- Slice-Level: PDF-Snapshot + 2 echte PDFs (NL + DE) gegen Production

---

## Micro-Tasks

### MT-1: DE-Reverse-Charge-Block Pure-Function
- Goal: pdfmake-Content-Builder fuer DE-Block.
- Files: `cockpit/src/lib/pdf/de-reverse-charge-block.ts` (NEU)
- Expected behavior: Export `buildDeReverseChargeBlock(): Content[]` mit DE-Phrase + § 13b UStG-Verweis. Inline-PRELIMINARY-Kommentar. Pure-Function ohne External-Dependencies.
- Verification: TS-Compile clean; Pure-Function-Test in MT-3.
- Dependencies: none

### MT-2: Proposal-Renderer Branding-Country-Logik
- Goal: proposal-renderer.ts waehlt DE/NL-Block je Branding-Country.
- Files: `cockpit/src/lib/pdf/proposal-renderer.ts`
- Expected behavior: Conditional `if (branding.country === 'DE') content.push(buildDeReverseChargeBlock()); else if (branding.country === 'NL') content.push(buildReverseChargeBlock());`. Rest unveraendert.
- Verification: TS-Compile clean.
- Dependencies: MT-1

### MT-3: Vitest + PDF-Snapshot-Tests
- Goal: 2 Snapshot-Tests fuer DE+NL-Pfad.
- Files: `cockpit/src/lib/pdf/de-reverse-charge-block.test.ts` (NEU oder EXTEND `reverse-charge-block.test.ts`)
- Expected behavior: Test 1: DE-Block enthaelt Phrase "Steuerschuldnerschaft des Leistungsempfaengers" + § 13b UStG-String; Test 2: PDF-Snapshot fuer Branding-DE bleibt stabil; Test 3: PDF-Snapshot fuer Branding-NL unveraendert (regression-frei).
- Verification: `npm run test` 3 neue Tests gruen.
- Dependencies: MT-1, MT-2

### MT-4: Editor Toggle-Aktivierung in DE-Mode
- Goal: Reverse-Charge-Toggle aktivierbar wenn DE-Mode + 3 Voraussetzungen.
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` oder `reverse-charge-section.tsx` (V5.7-Component)
- Expected behavior: V5.7-Hook `useReverseChargeEligibility` returnt eligible: true auch in DE-Mode wenn alle 3 Voraussetzungen erfuellt. Tooltip-Logik aktualisiert ("Toggle deaktiviert weil X"-Cases).
- Verification: Browser-Dev-Smoke: Branding-Country=DE + Company-Country=NL + VAT-ID gesetzt → Toggle aktivierbar.
- Dependencies: MT-2

### MT-5: ICP-Equivalent-Inline-Note
- Goal: User-Reminder im Editor fuer ZM-Pflicht.
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/reverse-charge-section.tsx`
- Expected behavior: Wenn Reverse-Charge-Toggle aktiv und Branding-Country=DE: Inline-Note unter Toggle "Beachte Zusammenfassende Meldung-Pflicht (ZM)" mit Tooltip "Aequivalent zur NL-ICP, monatlich/quartalsweise an Bundeszentralamt".
- Verification: Browser-Dev-Smoke: Toggle aktivieren in DE-Mode → Inline-Note erscheint.
- Dependencies: MT-4

### MT-6: Live-Smoke 2 PDFs (NL + DE)
- Goal: Echten PDF-Test gegen Production.
- Files: keine
- Expected behavior: Coolify-Redeploy. NL-Branding aktiv: 1 Reverse-Charge-Proposal + Generate-PDF → NL-Phrase im PDF sichtbar. Branding-Country temporaer auf DE umstellen: 1 Reverse-Charge-Proposal + Generate-PDF → DE-Phrase im PDF sichtbar. Dann zurueck auf NL.
- Verification: 2 echte PDFs heruntergeladen + visuell verifiziert.
- Dependencies: MT-1..MT-5

### MT-7: Slice-Closing Build + Test + Lint + Records-Sync
- Goal: Quality-Gate.
- Files: `slices/INDEX.md`, `planning/backlog.json` (BL-421 done)
- Expected behavior: Build + Vitest + Lint clean. SLC-656 done in INDEX.
- Dependencies: MT-6

---

## Definition of Done

- 7 MTs verifiziert (AC-1..AC-8 erfuellt)
- DE-Phrase als PRELIMINARY mit Inline-Kommentar dokumentiert
- Build + Lint + Vitest clean (mit 3 neuen DE/NL-Tests)
- Live-Smoke 2 PDFs (NL + DE) gruen
- Atomic Commit gepusht
- /qa als naechster Schritt
