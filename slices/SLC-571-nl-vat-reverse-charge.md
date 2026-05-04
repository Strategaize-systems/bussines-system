# SLC-571 — NL+DE-VAT-Saetze + Reverse-Charge fuer EU-B2B-Cross-Border

## Meta
- Feature: FEAT-571
- Priority: High
- Status: in_progress
- Created: 2026-05-04
- Scope-Update 2026-05-04: User-Klaerung erweitert den Slice um globalen Country-Switch DE/NL (DEC-128, supersedes DEC-122).

## Goal

Den V5.5/V5.6-Angebot-Pfad NL+DE-konform machen. MIG-028 hebt das DB-Schema auf erweiterte Steuersatz-Whitelist `{0, 7, 9, 19, 21}` (DEC-128 supersedes DEC-122 — deckt NL `{0,9,21}` und DE `{0,7,19}` parallel ab), fuegt das `reverse_charge`-BOOLEAN-Flag mit Konsistenz-CHECK hinzu (DEC-123), ergaenzt `branding_settings.vat_id` + `business_country` (DEC-124 + DEC-128) sowie `companies.vat_id` (DEC-124). UI: `/settings/branding` bekommt einen Country-Dropdown (DE/NL) plus das Strategaize-vat_id-Feld (kontextabhaengig validiert NL-BTW vs. DE-USt-IdNr.). Company-Stammdaten-Edit-Form bekommt das vat_id-Eingabefeld (EU-General). Proposal-Editor bekommt einen Steuersatz-Dropdown gefiltert nach `business_country` (DE: 0/7/19, NL: 0/9/21, plus Legacy-Wert wenn persistiert) plus einen gegated Reverse-Charge-Toggle (NL-Mode only in V5.7; DE-Reverse-Charge § 13b UStG ausgelagert nach BL-421). Server-Action `saveProposal` validiert die Konsistenz fruehzeitig. PDF-Renderer bekommt den bilingualen Reverse-Charge-Block "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" (DEC-125, NL-Mode) plus Strategaize-vat_id im Footer (Bezeichner kontextabhaengig: "BTW-Nr." in NL-Mode, "USt-IdNr." in DE-Mode).

## Scope

- **MIG-028 apply** (5 additive Aenderungen): tax_rate-Default 19→21 + Whitelist-CHECK {0,9,19,21}, reverse_charge BOOLEAN + Konsistenz-CHECK, branding_settings.vat_id, companies.vat_id. Idempotent via `IF NOT EXISTS` und `DROP CONSTRAINT IF EXISTS`. Kein Daten-Migrations-Schritt.
- **`vat-id.ts` Validation-Layer** (NEU): `EU_COUNTRY_CODES`-Constant (27 Mitgliedstaaten 2026), `validateNlVatId(input)` mit Pattern `^NL\d{9}B\d{2}$`, `validateEuVatId(input)` mit Pattern `^[A-Z]{2}[A-Z0-9]{2,12}$` plus Country-Code-Whitelist. Pure Functions, keine externe API.
- **Settings-Page Erweiterung** (`/settings/branding`): BTW-Eingabefeld im Branding-Form nach Footer-Markdown-Block, mit inline NL-Format-Validation. `saveBranding` Server Action erweitert um `vat_id`-Persistierung.
- **Company-Stammdaten Erweiterung**: vat_id-Eingabefeld nach `address_country`, mit inline EU-Format-Validation. Update der entsprechenden Server Action.
- **Editor-Erweiterung**:
  - **Steuersatz-Dropdown** im Summary-Bereich neben Tax-Row (entschieden in /architecture Open Q3, Empfehlung uebernommen): Optionen "21% (Standard NL)", "9% (reduziert NL)", "0% (steuerfrei / Reverse-Charge)". Default fuer neue Angebote 21%. Legacy-Proposals mit 19% rendern read-only (Dropdown-Wert bleibt 19% wenn so persistiert; User kann auf 21/9/0 wechseln).
  - **Reverse-Charge-Toggle** in eigener Sektion unter Steuersatz: gated auf 3 Voraussetzungen via neuer `useReverseChargeEligibility(branding, company)`-Hook. Wenn nicht eligible: Toggle disabled mit Tooltip-Liste der fehlenden Voraussetzungen + Quick-Links zu `/settings/branding` und Company-Edit (entschieden in /architecture Open Q4, Empfehlung uebernommen).
  - Toggle-ON: tax_rate-Dropdown wird auf 0% gelockt (UI + Server-Validation enforced).
  - Toggle-OFF: tax_rate kehrt zum letzten User-Wert zurueck (oder 21% Default fuer neues Angebot).
- **Server-Action-Validation** (`saveProposal`): wenn `reverse_charge=true` MUSS `tax_rate=0.00` UND `branding_settings.vat_id` NOT NULL UND `companies.vat_id` NOT NULL UND `companies.address_country` IN EU_COUNTRY_CODES UND != 'NL'. Bei Verstoss: rejected mit aussagekraeftiger Fehlermeldung (Pattern wie skonto-validation aus V5.6).
- **Audit-Eintrag bei Reverse-Charge-Toggle** (entschieden in /architecture Open Q2, Empfehlung uebernommen): `audit_log` mit `entity_type='proposal'`, `action='reverse_charge_toggled'`, `meta={"to": true|false, "tax_rate_before": ..., "tax_rate_after": ...}`. Nur bei tatsaechlicher Status-Aenderung, nicht bei jedem Save.
- **PDF-Renderer-Erweiterung**:
  - Neue Datei `cockpit/src/lib/pdf/reverse-charge-block.ts` (NEU): hardcoded Phrase-Constant + pdfmake-Block-Builder.
  - `proposal-renderer.ts` MODIFY: Block-Insert direkt unter Tax-Row im Summary-Block (Zeile 308). Wenn `reverse_charge=true`: Block "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" + Zeile "BTW-Nr. {strategaize.vat_id} — BTW-Nr. {company.vat_id}". Wenn `reverse_charge=false`: kein Block.
  - **Footer-Erweiterung** (entschieden in /architecture Open Q1, Empfehlung uebernommen): wenn `branding_settings.vat_id` NOT NULL, wird Strategaize-BTW in Adress-Block direkt unter "Strategaize Transition GmbH" gerendert (immer, auch bei DE-Standard-Rechnung).
- **Snapshot-Tests erweitern**: 4 neue Cases — (1) ohne Reverse-Charge ohne Strategaize-vat_id = bit-identisch zu V5.5/V5.6 (regression-frei), (2) ohne Reverse-Charge mit Strategaize-vat_id im Footer, (3) mit Reverse-Charge tax_rate=0 + bilingual Block + beide vat_ids, (4) Edge-Case Reverse-Charge ohne Strategaize-vat_id (sollte nicht passieren — Server-Action blockt — aber Renderer rendert defensiv).
- **Cockpit-Records-Update**:
  - `slices/INDEX.md`: SLC-571 Status `planned -> done`
  - `features/INDEX.md`: FEAT-571 Status `planned -> done` (wenn alle ACs erfuellt)
  - `planning/backlog.json`: BL-417 Status `open -> done`
  - `docs/STATE.md`: naechste = SLC-572

## Out of Scope

- VIES-Online-Lookup (BL-420 fuer spaeter)
- Drittland-Empfaenger-Pfad (UK/CH/US — siehe Constraints)
- Multi-Language-PDF (deutsch bleibt, nur Reverse-Charge-Block bilingue)
- Automatische ICP-Meldung-Generierung (User-Reporting-Pflicht)
- Daten-Migration alter 19%-Angebote auf 21% (Snapshot-Prinzip aus DEC-107)
- Echte Trennung "Angebot vs. Rechnung" als eigener Document-Type (V5.7 erweitert nur den proposal-PDF)
- Multi-Currency-Reverse-Charge (V7+)
- BTW-Nummer-Auto-Discovery aus Adress-Daten (manuelle Pflege bleibt User-Aufgabe)

## Acceptance Criteria

- AC1: MIG-028 idempotent — kann zweimal hintereinander ausgefuehrt werden ohne Fehler.
- AC2: DB-CHECK lehnt INSERT/UPDATE mit `tax_rate NOT IN (0.00, 9.00, 19.00, 21.00)` ab (Vitest gegen Coolify-DB).
- AC3: DB-CHECK lehnt INSERT/UPDATE mit `reverse_charge=true AND tax_rate != 0.00` ab.
- AC4: `validateNlVatId` Tests: gueltige Inputs `NL859123456B01` PASS, ungueltige `NL12345`, `DE123456789`, `nl859123456b01` FAIL.
- AC5: `validateEuVatId` Tests: gueltige Inputs `DE123456789`, `AT12345678`, `FR12345678901` PASS mit korrektem `country`-Field, ungueltige `XX123456`, `nl859123456B01`, leerer String FAIL.
- AC6: `/settings/branding` zeigt vat_id-Eingabefeld nach Footer-Markdown. Inline-Format-Error wenn ungueltig.
- AC7: Speichern eines gueltigen NL-vat_id persistiert in `branding_settings.vat_id`. Nach Reload Wert sichtbar.
- AC8: Company-Stammdaten-Edit zeigt vat_id-Feld nach `address_country`. Inline-Format-Error mit Country-Code-Hinweis bei ungueltigem Input.
- AC9: Speichern eines gueltigen EU-vat_id persistiert in `companies.vat_id`.
- AC10: Editor-Steuersatz-Dropdown rendert mit 3 Optionen 21/9/0. Default fuer neues Angebot ist 21%.
- AC11: Editor mit altem 19%-Angebot rendert Dropdown mit selektiertem Wert "19%" (Legacy), User kann auf 21/9/0 wechseln (Whitelist akzeptiert nur diese, plus Legacy-19 fuer existierende Rows).
- AC12: Reverse-Charge-Toggle disabled wenn eine Voraussetzung fehlt + Tooltip listet die fehlende(n) Voraussetzung(en) auf mit Quick-Link.
- AC13: Reverse-Charge-Toggle aktivierbar wenn alle 3 Voraussetzungen erfuellt (Strategaize-BTW + Empfaenger-BTW + Country in EU != NL).
- AC14: Toggle-ON setzt `tax_rate=0.00` automatisch + Dropdown wird disabled. Toggle-OFF macht Dropdown wieder editierbar.
- AC15: Server-Action `saveProposal` lehnt Save mit `reverse_charge=true AND tax_rate != 0` ab. Aussagekraeftige Fehlermeldung.
- AC16: Server-Action lehnt `reverse_charge=true` ab wenn eine der 3 Voraussetzungen nicht erfuellt ist (z.B. company.address_country='NL' oder branding.vat_id IS NULL).
- AC17: Audit-Log enthaelt Eintrag bei Reverse-Charge-Toggle-Aenderung mit `action='reverse_charge_toggled'`, `meta={"to": true|false}`. Kein Eintrag bei Save ohne Status-Aenderung.
- AC18: PDF mit `reverse_charge=true` zeigt Block "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" plus Zeile "BTW-Nr. {strategaize} — BTW-Nr. {company}" direkt unter Tax-Row.
- AC19: PDF mit `reverse_charge=false` zeigt KEINEN Reverse-Charge-Block (PDF rendert wie V5.6 + optional Strategaize-vat_id im Adress-Block-Footer).
- AC20: PDF-Adress-Footer zeigt Strategaize-vat_id direkt unter "Strategaize Transition GmbH" wenn `branding_settings.vat_id` NOT NULL.
- AC21: PDF-Snapshot-Test "ohne Reverse-Charge ohne Strategaize-vat_id" ist bit-identisch zu V5.6-Snapshot (regression-frei, alte Angebote rendern unveraendert).
- AC22: PDF-Snapshot-Tests fuer 3 weitere Cases (mit Strategaize-vat_id, mit Reverse-Charge, Edge-Case) gruen.
- AC23: TypeScript-Build (`npm run build`) gruen.
- AC24: Vitest (`npm run test`) gruen — neue Tests fuer `validateNlVatId`, `validateEuVatId`, `useReverseChargeEligibility`-Hook (oder Helper-Function), Server-Action-Validation, PDF-Snapshot-Tests.
- AC25: ESLint (`npm run lint`) gruen.
- AC26: Browser-Smoke (Desktop): vollstaendiger Workflow durchfuehrbar (Settings BTW eintragen → Company BTW eintragen → Angebot anlegen → Reverse-Charge-Toggle aktivieren → PDF-Vorschau zeigt Block korrekt).
- AC27: Browser-Smoke mit Edge-Case: Company.address_country='NL' → Toggle disabled mit Hinweis "Empfaenger sitzt in NL — Reverse-Charge nicht anwendbar".

## Dependencies

- V5.5 SLC-551 Schema (proposals-Tabelle existiert + tax_rate-Spalte)
- V5.5 SLC-552 Editor-Workspace
- V5.5 SLC-553 PDF-Renderer-Adapter + Snapshot-Tests
- V5.5 SLC-554 Server-Action `saveProposal` + Audit-Log-Pattern
- V5.3 SLC-531 Branding-Settings-Page + saveBranding-Action
- V2 SLC-102 Company-Stammdaten + Edit-Form
- V3 audit_log-Tabelle + insert-Pattern
- Coolify-DB Zugriff fuer MIG-028 Apply

## Risks

- **Risk:** MIG-028 CHECK-Constraint ADD scheitert wenn alte Daten ausserhalb der Whitelist liegen (z.B. tax_rate=20.00).
  Mitigation: Vor MIG-028-Apply Audit-SQL `SELECT DISTINCT tax_rate FROM proposals;` ausfuehren, Erwartung nur 19.00 (V5.5/V5.6-Default). Falls unerwartete Werte: in MIG-028 Apply-Plan korrigieren oder Whitelist erweitern.
- **Risk:** Reverse-Charge-Toggle-Voraussetzungen werden im Editor sync gepruepft — bei stale Branding-Settings (User hat in anderem Tab BTW geaendert) sieht Editor noch alten State.
  Mitigation: Branding wird im Editor als Server-Component-Prop uebergeben. Browser-Tab-Sync via `revalidatePath` nach saveBranding. Im Worst-Case: User reloadet Editor.
- **Risk:** PDF-Snapshot-Test fuer "ohne Strategaize-vat_id ohne Reverse-Charge" ist nicht bit-identisch zu V5.6 weil Adress-Footer-Block immer rendert (auch wenn vat_id NULL).
  Mitigation: Footer-Insert nur wenn `branding_settings.vat_id IS NOT NULL` — strict Conditional. Snapshot-Test mit `vat_id=null` MUSS bit-identisch zu V5.6 sein, sonst Renderer-Code anpassen.
- **Risk:** EU-Country-Code-Whitelist drift wenn ein neuer EU-Mitgliedstaat 2027+ beitritt.
  Mitigation: Whitelist als Constant in `vat-id.ts`, kommentiert mit "EU 27 Mitgliedstaaten Stand 2026". Aenderung ist trivial. Backlog: BL-XXX wenn neuer Beitritt.
- **Risk:** Audit-Eintrag-Spam bei mehrfachem Toggle-Klick.
  Mitigation: Audit nur bei tatsaechlicher Status-Aenderung in DB (vergleiche `reverse_charge`-Wert vor und nach Save). Kein Eintrag wenn User toggled aber kein Save passiert.
- **Risk:** Server-Action validiert Reverse-Charge-Voraussetzungen via JOIN auf branding_settings + companies — Performance-Impact bei vielen Saves.
  Mitigation: Saves sind selten (User-Aktion, kein Auto-Sync). Single-Branding-Row, JOIN ist O(1). Kein Performance-Risiko fuer V5.7-Internal-Test-Mode.
- **Risk:** Drittland-Empfaenger (UK) hat `address_country='UK'` — V5.7 ignoriert UK, aber Toggle koennte versehentlich enabled wenn Pruefung nur "country!=NL" ist.
  Mitigation: Pruefung ist `country IN EU_COUNTRY_CODES AND country != 'NL'`. UK ist nicht in EU_COUNTRY_CODES (Brexit) — Toggle bleibt disabled. Test-Case: UK-Empfaenger explizit als Browser-Smoke pruefen.
- **Risk:** Legacy-19%-Angebote werden von User als "verbuggt" empfunden weil Dropdown 19% zeigt aber UI nur 21/9/0 anbietet.
  Mitigation: UI-Hinweis im Editor-Tooltip "19% ist Legacy (DE-Standard) — neue Angebote nutzen NL-Saetze 21/9/0". Snapshot-Prinzip ist erklaerbar.
- **Risk:** vat_id-Format-Validation laesst Tippfehler durch (z.B. korrekte Country-Code aber zu wenige Ziffern).
  Mitigation: Format-only-Validation ist bewusster Tradeoff (DEC-124). VIES-Lookup BL-420 spaeter. Internal-Test-Mode toleriert.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `sql/migrations/028_v57_nl_vat_reverse_charge.sql` | NEU: MIG-028 SQL-File |
| `cockpit/src/lib/validation/vat-id.ts` | NEU: EU_COUNTRY_CODES + validateNlVatId + validateEuVatId |
| `cockpit/src/lib/validation/__tests__/vat-id.test.ts` | NEU: Vitest fuer beide Validation-Functions |
| `cockpit/src/types/branding.ts` | MODIFY: Branding-Type um vat_id ergaenzen |
| `cockpit/src/app/(app)/settings/branding/branding-form.tsx` | MODIFY: vat_id-Eingabefeld + inline-Validation |
| `cockpit/src/app/(app)/settings/branding/actions.ts` | MODIFY: saveBranding um vat_id |
| `cockpit/src/app/(app)/companies/[id]/edit/...` | MODIFY: vat_id-Feld nach address_country (Pfad in Investigation final) |
| `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` | MODIFY: Steuersatz-Dropdown + Reverse-Charge-Toggle + Eligibility-Hook |
| `cockpit/src/app/(app)/proposals/[id]/edit/tax-rate-dropdown.tsx` | NEU: Steuersatz-Dropdown-Komponente |
| `cockpit/src/app/(app)/proposals/[id]/edit/reverse-charge-section.tsx` | NEU: Toggle + Tooltip + Quick-Links |
| `cockpit/src/app/(app)/proposals/[id]/edit/use-reverse-charge-eligibility.ts` | NEU: Hook fuer Voraussetzungs-Pruefung |
| `cockpit/src/app/(app)/proposals/[id]/edit/__tests__/reverse-charge-eligibility.test.ts` | NEU: Vitest fuer Eligibility-Logik |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: saveProposal Server-Action-Validation |
| `cockpit/src/app/(app)/proposals/__tests__/save-proposal-validation.test.ts` | NEU oder MODIFY: Vitest fuer Reverse-Charge-Validation |
| `cockpit/src/lib/pdf/reverse-charge-block.ts` | NEU: Phrase-Constant + pdfmake-Block-Builder |
| `cockpit/src/lib/pdf/proposal-renderer.ts` | MODIFY: Reverse-Charge-Block + Strategaize-vat_id-Footer |
| `cockpit/src/lib/pdf/proposal-renderer.test.ts` | MODIFY: 4 neue Snapshot-Cases |
| `docs/COMPLIANCE.md` | MODIFY: NL-VAT + Reverse-Charge Sektion |
| `slices/INDEX.md` | SLC-571 Status `planned -> done` |
| `features/INDEX.md` | FEAT-571 Status `planned -> done` (nach allen ACs) |
| `planning/backlog.json` | BL-417 Status `open -> done` |
| `docs/STATE.md` | SLC-571 done, naechste SLC-572 |

## QA Focus

- **Build + Test:**
  - `npm run build` gruen (TypeScript)
  - `npm run test` gruen — incl. neue Vitest-Tests:
    - `vat-id.test.ts` (NL- + EU-Format-Validation)
    - `reverse-charge-eligibility.test.ts` (Hook/Helper-Function)
    - `save-proposal-validation.test.ts` (Server-Action-Reject-Pfade)
    - `proposal-renderer.test.ts` (4 neue Snapshot-Cases)
  - `npm run lint` gruen
- **MIG-028 Smoke (Coolify-DB direkt):**
  - Pre-Apply Audit: `SELECT DISTINCT tax_rate FROM proposals;` — Erwartung: nur 19.00
  - Apply via base64-Pattern (siehe `.claude/rules/sql-migration-hetzner.md`)
  - `\d proposals` zeigt `reverse_charge BOOLEAN NOT NULL DEFAULT false`, neuer CHECK + Whitelist-CHECK
  - `\d branding_settings` zeigt `vat_id TEXT NULL`
  - `\d companies` zeigt `vat_id TEXT NULL`
  - Re-Apply MIG-028 (Idempotenz): keine Fehler, keine doppelten Constraints
- **DB-Integration-Smoke (Vitest gegen Coolify-DB):**
  - INSERT proposal mit `tax_rate=21.00` → OK
  - INSERT proposal mit `tax_rate=20.00` → CHECK-Reject
  - INSERT proposal mit `reverse_charge=true, tax_rate=21.00` → CHECK-Reject
  - INSERT proposal mit `reverse_charge=true, tax_rate=0.00` → OK
  - SELECT proposal ohne tax_rate-Angabe → DEFAULT 21.00
- **Settings-Smoke:**
  - `/settings/branding` lautet auf, vat_id-Feld leer
  - Eingabe `NL859123456B01` → save OK, Reload zeigt Wert
  - Eingabe `NL12345` → inline-Format-Error, save rejected
  - Eingabe `DE123456789` → Format-Error (NL-Format erwartet)
- **Company-Smoke:**
  - Company-Stammdaten-Edit: vat_id-Feld leer
  - Eingabe `DE123456789` → save OK, Reload zeigt Wert
  - Eingabe `XX12345` → Format-Error (Country-Code nicht in EU-Whitelist)
- **Editor-Smoke:**
  - Neues Angebot anlegen → Default tax_rate=21.00 im Dropdown
  - Dropdown-Auswahl 9% → save OK, Reload zeigt 9%
  - Dropdown-Auswahl 0% → save OK
  - Reverse-Charge-Toggle bei fehlender Strategaize-BTW: disabled mit Tooltip "BTW-Nummer Strategaize fehlt" + Quick-Link `/settings/branding`
  - Reverse-Charge-Toggle bei fehlender Empfaenger-BTW: disabled mit Tooltip "BTW-Nummer Empfaenger fehlt" + Quick-Link Company-Edit
  - Reverse-Charge-Toggle bei Empfaenger-Country='NL': disabled mit Tooltip "Empfaenger sitzt in NL — Reverse-Charge nicht anwendbar"
  - Reverse-Charge-Toggle bei Empfaenger-Country='UK': disabled (UK nicht in EU-Whitelist)
  - Reverse-Charge-Toggle bei alle 3 erfuellt: enabled, Toggle-ON setzt tax_rate=0 + Dropdown disabled
  - Toggle-OFF: Dropdown wieder editierbar, tax_rate kehrt zum letzten Wert zurueck
- **Server-Action-Smoke:**
  - Manueller Versuch via DevTools/Curl mit `reverse_charge=true, tax_rate=21.00` → 400 mit klarer Fehlermeldung
  - Save mit gueltigem Reverse-Charge-State → audit_log-Eintrag persistiert mit `action='reverse_charge_toggled'`, `meta={"to": true}`
- **PDF-Smoke (Snapshot-Tests + Live-Render):**
  - Vitest-Snapshot 1: V5.6-Angebot ohne vat_id ohne Reverse-Charge → bit-identisch zu V5.6-Snapshot (regression-frei)
  - Vitest-Snapshot 2: Angebot mit Strategaize-vat_id im Footer (kein Reverse-Charge)
  - Vitest-Snapshot 3: Angebot mit Reverse-Charge + bilingual Block + beide vat_ids
  - Vitest-Snapshot 4: Edge-Case
  - Live-Render via `/api/proposals/[id]/pdf` fuer 3 Test-Angebote (visuelle Pruefung):
    - Angebot DE-Kunde mit BTW + Reverse-Charge AN → korrekter Block, beide BTWs sichtbar
    - Angebot DE-Kunde ohne BTW → Toggle disabled gewesen, kein Block im PDF
    - Angebot mit 21% Standard → normaler Tax-Block, kein Reverse-Charge
- **V5.6-Regression-Smoke:**
  - Editor mit altem 19%-Proposal: Dropdown zeigt 19%, User kann auf 21/9/0 wechseln
  - PDF von altem 19%-Proposal: rendert mit 19% (Snapshot-Prinzip), kein Reverse-Charge-Block
  - V5.6 Skonto-Toggle + Split-Plan + Briefing-Cron regression-frei
- **Mobile-Smoke (Editor-Tabs aus V5.3):**
  - Mobile-Tab "Erfassen" zeigt Steuersatz-Dropdown + Reverse-Charge-Section korrekt
  - Toggle-Tooltip-Liste auf Mobile lesbar (oder ersetzt durch Bottom-Sheet/Modal)
- **Audit-Log-Smoke:**
  - 3x Reverse-Charge-Toggle (off→on→off→on) mit Save dazwischen → 3 Audit-Eintraege
  - Save ohne Toggle-Aenderung → KEIN Audit-Eintrag fuer reverse_charge_toggled

## Micro-Tasks

### MT-1: MIG-028 SQL-File + Apply (DONE 2026-05-04)
- Goal: DB-Schema fuer NL+DE-VAT + Reverse-Charge bereitstellen, Idempotenz + CHECK-Greifen verifizieren
- Files: `sql/migrations/028_v57_nl_de_vat_reverse_charge.sql` (NEU)
- Expected behavior: 5 additive Aenderungen (branding_settings.vat_id, branding_settings.business_country DEFAULT 'NL', companies.vat_id, proposals.tax_rate-Whitelist `{0,7,9,19,21}`, proposals.reverse_charge BOOLEAN + Konsistenz-CHECK). Idempotent.
- Verification: Apply auf Hetzner via base64-Pattern (`/tmp/mig028.sql`, container `supabase-db-k9f5pn5upfq7etoefb5ukbcg-074821936116`). `\d proposals/branding_settings/companies` zeigt alle neuen Spalten/Constraints. Re-Apply emittet `NOTICE: column already exists, skipping` — keine Fehler. Default-NL auf branding_settings.business_country gesetzt. Pre-Apply-Audit zeigte 7+19 in Live-DB, beide bleiben gueltig nach Apply.
- Dependencies: none

### MT-2: vat-id.ts Validation-Layer + TDD-Vitest (DONE 2026-05-04)
- Goal: Pure Functions fuer NL- + DE- + EU-VAT-ID-Format-Validation + Country-Code-Whitelist
- Files: `cockpit/src/lib/validation/vat-id.ts` (NEU), `cockpit/src/lib/validation/vat-id.test.ts` (NEU — neben dem Code, nicht in `__tests__/` weil Repo-Konvention)
- Expected behavior: `validateNlVatId(input)`, `validateDeVatId(input)`, `validateEuVatId(input)` returnen typisiertes Result-Objekt mit `valid`, `value`, optionalem `country`. `EU_COUNTRY_CODES`-Constant (27 Mitgliedstaaten Stand 2026, EL fuer Griechenland statt GR) ist exported.
- Verification: 30 Vitest-Cases (alle gruen): NL-Format pass/fail, DE-Format pass/fail, EU-General Country-Code-Whitelist, Trim-Pflege, UK/GB explizit ausgeschlossen.
- Dependencies: none (parallel zu MT-1)

### MT-3: Branding-Settings business_country + vat_id (DONE 2026-05-04)
- Goal: Country-Switch + Strategaize-vat_id im /settings/branding eingebbar + persistierbar
- Files: `cockpit/src/types/branding.ts` (MODIFY: `BusinessCountry`-Type + `BUSINESS_COUNTRIES`-Constant + `vatId`/`businessCountry`-Felder am Branding-Type), `cockpit/src/app/(app)/settings/branding/actions.ts` (MODIFY: kontextabhaengiger Validator, getBranding/updateBranding um neue Spalten erweitert), `cockpit/src/app/(app)/settings/branding/branding-form.tsx` (MODIFY: Country-Select-Dropdown + vat_id-Input mit kontextabhaengigem Placeholder, Label und inline-Validation).
- Expected behavior: "Steuer-Einstellungen"-Sektion nach Footer-Markdown-Block. Country-Dropdown DE/NL. vat_id-Eingabefeld validiert kontextabhaengig (validateDeVatId vs. validateNlVatId). Default `business_country='NL'` aus DB. saveBranding persistiert beide Felder.
- Verification: Browser-Smoke `/settings/branding` PASS Live (RPT-292, 2026-05-04 nach Coolify-Redeploy von 3545971): TC1 Initial-Render Default-NL ✓, TC2 Inline-Format-Error NL12345 ✓, TC3 Country-Switch NL→DE Label/Placeholder/Bezeichner ✓, TC4 Inline-Format-PASS DE123456789 ✓, TC5 Reset auf NL-Default ohne Save ✓.
- Dependencies: MT-1 (Schema), MT-2 (Validation)

### MT-4: Company-Stammdaten vat_id-Eingabefeld (DONE 2026-05-04)
- Goal: Empfaenger-VAT-ID in Company-Edit eingebbar + persistierbar (EU-General)
- Files: `cockpit/src/app/(app)/companies/actions.ts` (MODIFY: Company-Type um vat_id, sanitizeCompanyVatId-Helper mit validateEuVatId, createCompany/updateCompany erweitert), `cockpit/src/app/(app)/companies/company-form.tsx` (MODIFY: vat_id-Feld nach `address_country` mit useMemo-Inline-Validation).
- Expected behavior: Feld nach `address_country`. Inline-Format-Error via `validateEuVatId`. Persistierung in `companies.vat_id`. Server-side sanitizer validiert nochmal und blockt bei Format-Fehler den Save.
- Verification: Browser-Smoke `/companies` Neue-Firma-Sheet PASS Live (RPT-292, 2026-05-04): TC6 Form-Render mit vat_id-Feld + Label "USt-IdNr. / BTW-Nummer (optional)" ✓, TC7 Inline-Format-Error XX12345 ("Country-Code 'XX' ist kein EU-Mitglied") ✓, TC8 Inline-Format-PASS DE123456789 ✓, TC9 Inline-Format-PASS NL859123456B01 ✓, TC10 Sheet-Close ohne Save (Bestand unveraendert) ✓.
- Dependencies: MT-1, MT-2

### MT-5: useReverseChargeEligibility-Hook + TDD-Vitest
- Goal: Voraussetzungs-Pruefung als testbare Pure Function (Hook-Wrapper als Convenience)
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/use-reverse-charge-eligibility.ts` (NEU), `cockpit/src/app/(app)/proposals/[id]/edit/__tests__/reverse-charge-eligibility.test.ts` (NEU)
- Expected behavior: Function `checkReverseChargeEligibility(branding, company): { eligible: boolean, missing: string[] }`. Hook ruft Function mit Props auf.
- Verification: Vitest fuer mindestens 6 Cases (alle 3 erfuellt, jede Voraussetzung einzeln fehlend, NL-Empfaenger, Drittland-UK).
- Dependencies: MT-2 (EU_COUNTRY_CODES)

### MT-6: Editor — Steuersatz-Dropdown + Reverse-Charge-Section
- Goal: UI-Komponenten fuer Steuersatz-Dropdown 21/9/0 + Reverse-Charge-Toggle gated
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/tax-rate-dropdown.tsx` (NEU), `cockpit/src/app/(app)/proposals/[id]/edit/reverse-charge-section.tsx` (NEU), `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` (MODIFY)
- Expected behavior: Dropdown rendert 21/9/0 + Legacy-19 wenn so persistiert. Toggle disabled mit Tooltip-Liste + Quick-Links wenn nicht eligible. Toggle-ON locks Dropdown auf 0%.
- Verification: Browser-Smoke alle Voraussetzungs-Permutationen (siehe Editor-Smoke oben).
- Dependencies: MT-3, MT-4, MT-5

### MT-7: saveProposal Server-Action-Validation + TDD-Vitest + Audit-Log
- Goal: Server-Side-Enforcement der Reverse-Charge-Konsistenz + Audit-Eintrag bei Status-Aenderung
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY), `cockpit/src/app/(app)/proposals/__tests__/save-proposal-validation.test.ts` (NEU oder MODIFY)
- Expected behavior: 4 Reject-Pfade + 1 Audit-Insert-Pfad. Vergleich `reverse_charge`-Wert vor/nach Save.
- Verification: Vitest gegen Coolify-DB mit RLS-Pattern. Manueller Curl-Test mit ungueltiger Payload.
- Dependencies: MT-1, MT-2

### MT-8: PDF-Renderer reverse-charge-block.ts + Renderer-Erweiterung
- Goal: Bilingualer Reverse-Charge-Block + Strategaize-vat_id-Footer im PDF
- Files: `cockpit/src/lib/pdf/reverse-charge-block.ts` (NEU), `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY), `cockpit/src/lib/pdf/proposal-renderer.test.ts` (MODIFY mit 4 neuen Snapshot-Cases)
- Expected behavior: Block-Insert direkt unter Tax-Row wenn `reverse_charge=true`. Footer-vat_id wenn `branding.vat_id NOT NULL`. Snapshot-Test "ohne vat_id ohne reverse_charge" bit-identisch zu V5.6.
- Verification: Vitest-Snapshot-Tests gruen (4 Cases). Live-Render via `/api/proposals/[id]/pdf` visuell sichtbar.
- Dependencies: MT-1, MT-3 (vat_id-Datenfluss)

### MT-9: COMPLIANCE.md NL-VAT + Reverse-Charge-Sektion + Cockpit-Records-Update
- Goal: Compliance-Dokumentation der V5.7-Aenderungen + Cockpit-Records-Sync
- Files: `docs/COMPLIANCE.md` (MODIFY), `slices/INDEX.md` (MODIFY: SLC-571 done), `features/INDEX.md` (MODIFY: FEAT-571 done), `planning/backlog.json` (MODIFY: BL-417 done), `docs/STATE.md` (MODIFY: naechste SLC-572)
- Expected behavior: COMPLIANCE.md beschreibt NL-VAT-Saetze, Reverse-Charge-Logik, vat_id-Speicherung, Audit-Eintrag-Pflicht. Cockpit-Records reflektieren done-State.
- Verification: COMPLIANCE.md-Review (User), Cockpit-View zeigt SLC-571 done.
- Dependencies: alle vorigen MTs (Final-Step nach erfolgreicher AC-Erfuellung)
