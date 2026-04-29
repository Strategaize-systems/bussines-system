# SLC-553 — PDF-Renderer (pdfmake) + Branding-Layout + Storage-Write + Watermark

## Meta
- Feature: FEAT-553
- Priority: High
- Status: planned
- Created: 2026-04-29

## Goal

Server-side PDF-Generierung via pdfmake (DEC-105). Adapter-gekapselter Renderer in `cockpit/src/lib/pdf/proposal-renderer.ts` mit Interface `renderProposalPdf(input) => { buffer, filename }`. Layout im V5.3-Branding (Logo + Markenfarbe + Footer-Markdown) mit Position-Tabelle, Summary, Konditionen. Internal-Test-Mode-Watermark als Footer-Zeile + `.testmode.pdf`-Filename-Suffix (DEC-113). Server Action `generateProposalPdf(proposalId)` schreibt PDF in `proposal-pdfs`-Bucket unter `{user_id}/{proposal_id}/v{version}.pdf`, persistiert Pfad in `proposals.pdf_storage_path`, returnt Signed-URL fuer iframe-Display. "PDF generieren"-Button in SLC-552 wird funktional, Audit-Eintrag pro Generierung.

## Scope

- **Library + Adapter:**
  - `npm install pdfmake @types/pdfmake` (Architecture-Dependency)
  - `cockpit/src/lib/pdf/proposal-renderer.ts` mit Interface `ProposalRenderer.renderProposalPdf(input)` und Default-Implementation `pdfmakeRenderer`. Adapter-Pattern analog V5.1 Whisper-Adapter.
  - Standard-Schriften via pdfmake's `Roboto` (built-in, kein Custom-Font-Loading).
  - Layout-Tabelle nutzt pdfmake's `table.layout='lightHorizontalLines'`.
- **Layout (DEC-105):**
  - Briefkopf (Header): Logo (aus `branding.logo_path` als `image: 'data:image/...'` base64-encoded), Markenfarbe als horizontaler Strich oder Header-Background.
  - Empfaenger-Block: `company.name`, `contact.first_name + last_name`, Adress-Zeilen aus `company.address`.
  - Angebot-Header: "Angebot {title}", "Version V{version}", "Datum: $today", "Gueltig bis: $valid_until".
  - Position-Tabelle: Spalten `Pos | Produkt | Menge | Einzelpreis | Discount | Summe`. Pro Zeile: `position_order`, `snapshot_name`, `quantity`, `unit_price_net`, `discount_pct`, `line_total` (via `calculateLineTotal` aus SLC-552).
  - Summary-Block (rechts unter Tabelle): Subtotal Net, Steuer (Satz%), Brutto.
  - Konditionen-Block: `payment_terms` als Pre-Render-Text.
  - Footer: `branding.footer_markdown` als plain-text-rendered (markdown-stripped fuer pdfmake-kompatibilitaet) + (wenn `INTERNAL_TEST_MODE_ACTIVE='true'`) fixe Zeile "INTERNAL-TEST-MODE — nicht fuer externe Empfaenger" in 8pt, mittig.
- **Internal-Test-Mode-Watermark (DEC-113):**
  - Feature-Flag-Check: `process.env.INTERNAL_TEST_MODE_ACTIVE === 'true'` (default `'true'` in V5.5)
  - Wenn aktiv: Footer-Zeile (siehe oben) + Filename-Suffix `.testmode.pdf` (via `getProposalPdfPath`-Helper aus SLC-551)
  - Wenn inaktiv (zukuenftiges V5.6): kein Suffix, keine Footer-Zeile
- **Server Action `generateProposalPdf(proposalId)`:**
  - Auth-Check
  - SELECT `proposals` + `proposal_items` (sortiert nach `position_order`) + `branding_settings` + `deals` + `companies` + `contacts` (Promise.all)
  - Status-Pruefung: nur `status='draft'` oder `'sent'` erlauben PDF-Generierung
  - Berechnung: `subtotal_net`, `tax_amount`, `total_gross` via `calculateTotals`-Helper aus SLC-552
  - UPDATE `proposals` mit den 3 Berechnungs-Werten
  - Aufruf `pdfmakeRenderer.renderProposalPdf({ proposal, items, branding, deal, company, contact, testMode })` → `{ buffer, filename }`
  - Storage-Upload via Service-Role-Client: `supabase.storage.from('proposal-pdfs').upload(path, buffer, { contentType: 'application/pdf', upsert: true })` mit `path = getProposalPdfPath(userId, proposalId, version, testMode)`
  - UPDATE `proposals.pdf_storage_path` mit dem Pfad
  - Audit-Eintrag in `audit_log`: `action='update'`, `entity_type='proposal'`, `entity_id=proposalId`, `context='PDF generated v' + version`
  - Signed-URL fuer iframe-Anzeige generieren (`storage.from('proposal-pdfs').createSignedUrl(path, 300)` — 5min-TTL)
  - Returns `{ ok: true, pdfUrl: signedUrl, filename }` oder `{ ok: false, error }`
- **SLC-552 PreviewPanel-Hookup:**
  - `<PreviewPanel>`-Button "PDF generieren" wird funktional (disabled aufheben)
  - onClick: ruft `generateProposalPdf(proposalId)` mit Loading-State, bei Success: `<iframe src={pdfUrl}>` als Modal oder Inline ueber HTML-Preview
  - Bei Failure: Toast-Error
- **Logo-Embedding:**
  - pdfmake braucht Image als base64-DataURL. Helper `cockpit/src/lib/pdf/image-helper.ts`: `getLogoDataUrl(branding)` → laedt aus Supabase-Storage Bucket `branding`, konvertiert zu base64 + MIME-Detection.
  - Fallback-Verhalten: wenn kein Logo: leerer Header-Block, kein Crash.
- **Filename-Pattern:**
  - Default: `Angebot-V{version}.pdf` ODER `Angebot-{slug(title || 'unbenannt')}-V{version}.pdf`
  - Test-Mode: `Angebot-V{version}.testmode.pdf`
  - Slug-Helper analog V5.4 (existing in `cockpit/src/lib/utils.ts` oder Pattern duplizieren).
- **Smoke-Tests mit echten Mailclients:**
  - Nach Generierung: Download-PDF und in Adobe Reader, Chrome-PDF-Viewer, Outlook-Preview, Gmail-Inline-Preview oeffnen — keine Render-Fehler
  - Test-Faelle: leeres Angebot (0 Items), 1 Item, 5 Items mit verschiedenen Discounts, 50 Items (Edge-Case Out-of-Scope laut Architecture, aber Smoke)
- Update `docs/STATE.md`, `slices/INDEX.md`, `planning/backlog.json`, `features/INDEX.md`.

## Out of Scope

- WYSIWYG-PDF-Editor (Layout ist fix laut DEC-105)
- Custom-Templates pro Deal/Branche
- Multi-Page-Optimierung fuer >50 Positionen (architecturally-out-of-scope)
- Custom-Fonts (nur Standard-PDF-Fonts)
- PDF-Versionierungs-Chronik im Storage (Overwrite-Verhalten — DEC-111 + Architecture Open Point 2)
- Cleanup-Cron fuer verworfene Draft-PDFs (V5.6+ Folge-Slice)
- Send-Pfad ins Composing-Studio — Inhalt von SLC-555
- Status-Lifecycle (PDF-Trigger setzt Status NICHT auf `sent`) — Inhalt von SLC-554
- Versionierungs-Action `createProposalVersion` — Inhalt von SLC-554
- Print-Optimization fuer A3/Letter (nur A4)
- PDF-Verschluesselung oder Password-Protection
- Digitale-Signatur

## Acceptance Criteria

- AC1: `npm install pdfmake @types/pdfmake` erfolgreich, package.json + lock aktualisiert.
- AC2: `cockpit/src/lib/pdf/proposal-renderer.ts` exportiert Interface `ProposalRenderer` und Default `pdfmakeRenderer`. Interface signature: `renderProposalPdf(input): Promise<{ buffer: Buffer; filename: string }>`.
- AC3: PDF-Layout enthaelt: Briefkopf mit Logo + Markenfarbe-Linie, Empfaenger-Block (Company + Contact + Adresse), Angebot-Header (Title + V{n} + Datum + Gueltig bis), Position-Tabelle (6 Spalten), Summary-Block (Subtotal/Steuer/Brutto), Konditionen-Block (Payment-Terms), Footer (Branding-Footer + ggf. Test-Mode-Zeile).
- AC4: Position-Tabelle zeigt alle Items korrekt mit `position_order`, `snapshot_name`, `quantity`, `unit_price_net`, `discount_pct`, `line_total` (Cent-genau identisch zur UI-Berechnung aus SLC-552).
- AC5: Summary stimmt mit der UI-Berechnung Cent-genau ueberein. Test-Fall A (1 Item qty=3, price=100.50, discount=0%, tax=19%): Subtotal 301.50, Tax 57.29, Total 358.79.
- AC6: PDF oeffnet sich problemlos in Adobe Reader, Chrome-PDF-Viewer, Outlook (Windows-Mail-Preview), Gmail (Inline-Preview).
- AC7: Internal-Test-Mode-Watermark (`INTERNAL_TEST_MODE_ACTIVE='true'`): Footer-Zeile "INTERNAL-TEST-MODE — nicht fuer externe Empfaenger" sichtbar, Filename mit `.testmode.pdf`-Suffix.
- AC8: Mit `INTERNAL_TEST_MODE_ACTIVE='false'`: keine Test-Zeile, kein Suffix.
- AC9: PDF-Generierung dauert < 2s fuer typisches Angebot (5-10 Items) — Server-Action-Logging zeigt `Date.now()`-Diff.
- AC10: Server Action `generateProposalPdf` schreibt PDF in Storage unter `{user_id}/{proposal_id}/v{version}[.testmode].pdf`, persistiert Pfad in `proposals.pdf_storage_path`, returnt Signed-URL.
- AC11: SLC-552 "PDF generieren"-Button ist funktional: Klick triggered Action, iframe zeigt PDF, Loading-State sichtbar.
- AC12: Berechnung wird beim Generate persistiert: `proposals.subtotal_net`, `tax_amount`, `total_gross` haben nach Generate die aktuellen Werte.
- AC13: Audit-Eintrag in `audit_log` pro Generierung: `action='update'`, `entity_type='proposal'`, `context='PDF generated v' + version`.
- AC14: PDF-Generation auf einem Angebot ohne Items rendert leeres Tabellen-Skeleton, kein Crash.
- AC15: PDF-Generation mit fehlendem Logo (`branding.logo_path = NULL`) rendert leeren Header-Bereich, kein Crash.
- AC16: TypeScript-Build (`npm run build`) gruen. `npm run test` (wenn Renderer-Tests existieren) gruen.

## Dependencies

- SLC-551 (Schema, `proposal-pdfs`-Bucket, Pfad-Helper, `getProposalForEdit`-Pattern)
- SLC-552 (`calculateLineTotal`, `calculateTotals` aus `cockpit/src/lib/proposal/calc.ts`, `<PreviewPanel>` mit "PDF generieren"-Button-Slot, Workspace-State `proposal` + `items`)
- V5.3 `branding_settings` + `branding`-Bucket (Logo + Markenfarbe + Footer-Markdown)
- pdfmake (npm-Install in dieser Slice)
- Service-Role Storage-Client (existing in `cockpit/src/lib/supabase/admin.ts`)

## Risks

- **Risk:** pdfmake-Layout-Engine schafft komplexe Tabellen-Layouts mit Cell-Border-Drift nicht pixelgenau.
  Mitigation: Standard-`lightHorizontalLines` Layout. Bei Tests: visuelle Inspection im QA-Report. Bei groben Drifts: pdfmake-Doc-Definition iterativ anpassen.
- **Risk:** Logo-Embedding schlaegt fehl wegen Storage-MIME-Drift (PNG vs JPG vs SVG).
  Mitigation: Helper detected MIME via Header-Bytes (Magic-Number) statt File-Extension. SVG wird zu PNG via sharp konvertiert ODER explizit Out-of-Scope (nur PNG/JPG-Logos in Branding-Settings, V5.3 sollte das schon enforcen).
- **Risk:** PDF-Generation > 2s bei mehreren parallelen Calls (Memory-Druck pdfmake).
  Mitigation: PDF-Generation ist on-demand (nicht Auto-Render bei Edit). User-Klick blockiert UI mit Loading. Im Server-Logging beobachten — bei consistent > 2s: Worker-Pattern in V5.6.
- **Risk:** Storage-Upload mit `upsert: true` ueberschreibt bestehende PDF-Versionen (DEC-111).
  Mitigation: bewusster Tradeoff laut Architecture Open Point 2. Audit-Trail in `audit_log` ist Single-Source-of-Truth fuer Generation-History.
- **Risk:** Signed-URL-TTL 5min ist zu kurz (User schliesst iframe nicht sofort).
  Mitigation: User-Re-Klick auf "PDF generieren" oder "Aktualisieren" generiert neue Signed-URL. 5min ist Sicherheits-Default.
- **Risk:** `INTERNAL_TEST_MODE_ACTIVE` ENV ist nicht gesetzt → JS interpretiert undefined als false → kein Watermark.
  Mitigation: Default `true` in code (`process.env.INTERNAL_TEST_MODE_ACTIVE !== 'false'`). Coolify-ENV-Check in Pre-Deploy-Smoke.
- **Risk:** Branding `footer_markdown` enthaelt MD-Syntax die pdfmake nicht versteht.
  Mitigation: Markdown-Stripping mit `remove-markdown`-Lib ODER simple-Replace fuer **bold** + *italic* + Links. Falls > 1 Komplikation: dokumentiere im QA-Report, schiebe Markdown-Polish auf V5.5.x.
- **Risk:** Filename-Sanitization vergisst Sonderzeichen (Umlaute, Slash) → Storage-Upload-Error.
  Mitigation: Slug-Helper analog V5.4 (ASCII-strict, V5.4 `feedback_attachments_filename_sanitization` Pattern). Test mit "Mueller & Soehne / Q1" Title.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `package.json`, `package-lock.json` | MODIFY: `pdfmake` + `@types/pdfmake` add |
| `cockpit/src/lib/pdf/proposal-renderer.ts` | NEU: Interface + pdfmakeRenderer Default-Impl |
| `cockpit/src/lib/pdf/proposal-renderer.test.ts` | NEU: Unit-Tests fuer DocDefinition-Build |
| `cockpit/src/lib/pdf/image-helper.ts` | NEU: getLogoDataUrl-Helper |
| `cockpit/src/lib/pdf/filename-helper.ts` | NEU: Filename-Sanitization fuer Proposal-PDFs |
| `cockpit/src/app/(app)/proposals/actions.ts` | MODIFY: `generateProposalPdf` Server Action |
| `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx` | MODIFY: "PDF generieren"-Button funktional + iframe-Modal |
| `docs/STATE.md` | Slice-Status-Update |
| `slices/INDEX.md` | SLC-553 anlegen |
| `planning/backlog.json` | BL-409 (SLC-553 Tracking) anlegen |
| `features/INDEX.md` | FEAT-553 → `in_progress` |

## QA Focus

- **Build + Lint + Test:**
  - `npm run build` gruen
  - `npm run test` gruen (wenn Renderer-Unit-Tests vorhanden)
  - `npm run lint` gruen
- **Renderer-Smoke (Browser):**
  - Existing Draft-Angebot mit 5 Items, Logo + Markenfarbe gesetzt → "PDF generieren"-Klick → PDF in iframe sichtbar
  - PDF-Download und in Adobe Reader oeffnen — keine Render-Fehler
  - PDF-Download und in Chrome PDF-Viewer oeffnen — gleiche Optik
  - PDF-Download und in Outlook (Windows-Mail) oeffnen — gleiche Optik
  - PDF an Gmail-Postfach senden, in Gmail Inline-Preview oeffnen — gleiche Optik
- **Watermark-Smoke:**
  - Mit `INTERNAL_TEST_MODE_ACTIVE='true'`: PDF Footer enthaelt Test-Mode-Zeile, Filename hat `.testmode.pdf`
  - Mit `INTERNAL_TEST_MODE_ACTIVE='false'` (Coolify-ENV-Switch + Redeploy): PDF Footer ohne Test-Zeile, Filename ohne Suffix
- **Berechnungs-Konsistenz-Smoke (Cent-Genauigkeit):**
  - Test-Fall A: 1 Item qty=3, price=100.50, discount=0%, tax=19% → UI Subtotal 301.50, PDF Subtotal 301.50 (gleich Cent-genau)
  - Test-Fall B: 3 Items mit verschiedenen Discounts, tax=7% → UI vs PDF identisch
  - Test-Fall C: leeres Angebot → UI Subtotal 0.00, PDF Subtotal 0.00
- **Edge-Case Smokes:**
  - Angebot ohne Logo → Header-Bereich leer, keine Crash
  - Angebot mit Logo PNG transparent → Logo rendert mit weissem Hintergrund (pdfmake-Default)
  - Angebot mit langem Title (>100 Zeichen) → Title wraps oder truncated (visueller Check)
  - Angebot mit 0 Items → Tabellen-Skeleton ohne Items, Subtotal 0.00
  - Angebot mit 50 Items (Architecture Constraint) → Multi-Page-Layout (pdfmake-Default), kein Crash
- **Storage-Pfad-Smoke:**
  - Nach Generate: `SELECT pdf_storage_path FROM proposals WHERE id=?` zeigt `{user_id}/{proposal_id}/v1.pdf` (oder `.testmode.pdf`)
  - Storage-Listing zeigt File im Bucket
- **Performance-Smoke:**
  - PDF-Generation mit 5 Items: < 2s (Server-Logging)
  - PDF-Generation mit 50 Items: < 5s (Edge-Case)
- **Audit-Smoke:**
  - Nach Generate: `SELECT * FROM audit_log WHERE entity_type='proposal' AND context LIKE 'PDF%'` zeigt Eintrag
- **Berechnung-Persist-Smoke:**
  - Nach Generate: `proposals.subtotal_net`, `tax_amount`, `total_gross` enthalten aktuelle Werte
- **Filename-Sanitization-Smoke:**
  - Title "Mueller & Soehne / Q1" → Filename `Angebot-Mueller-Soehne-Q1-V1.pdf` (Sonderzeichen ersetzt, kein Slash, kein Umlaut)

## Micro-Tasks

### MT-1: pdfmake-Install + Renderer-Interface + Adapter-Skeleton
- Goal: Library installiert + Adapter-Pattern angelegt
- Files: `package.json`, `package-lock.json`, `cockpit/src/lib/pdf/proposal-renderer.ts`
- Expected behavior:
  - `npm install pdfmake @types/pdfmake` (add ^0.2.10 + ^0.2.9)
  - `proposal-renderer.ts` exportiert Interface:
    ```ts
    export interface RenderProposalInput {
      proposal, items, branding, deal, company, contact, testMode
    }
    export interface ProposalRenderer {
      renderProposalPdf(input: RenderProposalInput): Promise<{ buffer: Buffer; filename: string }>
    }
    export const pdfmakeRenderer: ProposalRenderer = { renderProposalPdf: async (input) => {...} }
    ```
  - Skeleton enthaelt minimale pdfmake-DocDefinition mit Hello-World-Page (kein Layout) — wird in MT-3 erweitert
- Verification: `npm run build` gruen, Adapter-Import in actions.ts moeglich
- Dependencies: SLC-551 + SLC-552 abgeschlossen

### MT-2: Image-Helper + Filename-Helper
- Goal: Logo-Embedding + Filename-Sanitization als pure Helpers
- Files: `cockpit/src/lib/pdf/image-helper.ts`, `cockpit/src/lib/pdf/filename-helper.ts`
- Expected behavior:
  - `image-helper.ts` exportiert `getLogoDataUrl(branding: BrandingSettings, supabase: ServiceRoleClient): Promise<string | null>` — laedt aus `branding`-Bucket, konvertiert Buffer zu `data:image/png;base64,...`-DataURL, Magic-Number-MIME-Detect
  - Bei NULL/missing Logo: returnt `null`
  - `filename-helper.ts` exportiert `sanitizeProposalFilename(title: string | null, version: number, isTestMode: boolean): string`
  - Pattern: `Angebot-{slug(title) || 'unbenannt'}-V{version}.pdf` (oder `.testmode.pdf`)
  - Slug: ASCII-strict, replace Umlaute, replace Sonderzeichen mit `-`, max 50 Zeichen
  - Unit-Tests fuer Filename-Helper (5 Edge-Cases)
- Verification: `npm run test -- filename-helper` gruen
- Dependencies: MT-1

### MT-3: pdfmake DocDefinition + Layout-Implementation
- Goal: Vollstaendiges PDF-Layout
- Files: `cockpit/src/lib/pdf/proposal-renderer.ts` (MODIFY — Skeleton aus MT-1 erweitern)
- Expected behavior:
  - DocDefinition baut aus Input:
    - `header`: Logo (wenn vorhanden) + Markenfarbe-Linie als horizontaler Strich
    - `content`:
      1. Empfaenger-Block (Company-Name fett, Contact-Name, Adress-Zeilen)
      2. Angebot-Header ("Angebot $title", "V$version", Datum, "Gueltig bis: $valid_until")
      3. Position-Tabelle mit `widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto']`, Header-Row fett, Body-Rows pro Item
      4. Summary-Block rechts (Subtotal, Steuer, Brutto)
      5. Konditionen-Block ("Zahlungsfrist: $payment_terms")
    - `footer`: Branding-Footer-Markdown (stripped) + ggf. Test-Mode-Zeile in 8pt-Font, mittig
  - Page-Size: A4, Margins: [40, 80, 40, 80]
  - Wert-Formattierung: NUMERIC-Werte als "1.234,56 EUR" (DE-Locale)
  - Renderer ruft pdfmake's `pdfMake.createPdf(docDef).getBuffer()` und returnt Buffer + Filename
- Verification: `npm run test -- proposal-renderer` gruen (DocDefinition-Build-Test prueft Struktur ohne PDF-Render)
- Dependencies: MT-1, MT-2, SLC-552 calc.ts

### MT-4: Server Action `generateProposalPdf`
- Goal: End-to-End PDF-Pipeline
- Files: `cockpit/src/app/(app)/proposals/actions.ts` (MODIFY)
- Expected behavior:
  - Signature: `generateProposalPdf(proposalId: string): Promise<{ ok: true; pdfUrl: string; filename: string } | { ok: false; error: string }>`
  - Auth-Check, Status-Pruefung (`status IN ('draft','sent')`)
  - Promise.all-SELECT: proposals + proposal_items (sorted) + branding_settings + deal + company + contact
  - Berechnung via `calculateTotals` aus SLC-552
  - UPDATE `proposals.subtotal_net`, `tax_amount`, `total_gross`
  - testMode: `process.env.INTERNAL_TEST_MODE_ACTIVE !== 'false'` (default true)
  - Aufruf `pdfmakeRenderer.renderProposalPdf(input)` → `{ buffer, filename }`
  - Pfad: `getProposalPdfPath(userId, proposalId, version, testMode)` aus SLC-551
  - Storage-Upload via Service-Role: `supabase.storage.from('proposal-pdfs').upload(path, buffer, { contentType: 'application/pdf', upsert: true })`
  - UPDATE `proposals.pdf_storage_path` mit `path`
  - Audit-Eintrag in `audit_log`
  - `createSignedUrl(path, 300)` → 5min-TTL
  - Returns `{ ok: true, pdfUrl, filename }`
- Verification: Server-Action-Smoke per DevTools/Postman: PDF in Storage, Signed-URL liefert PDF
- Dependencies: MT-3

### MT-5: SLC-552 PreviewPanel-Hookup
- Goal: "PDF generieren"-Button funktional + iframe-Display
- Files: `cockpit/src/app/(app)/proposals/[id]/edit/preview-panel.tsx` (MODIFY)
- Expected behavior:
  - "PDF generieren"-Button: `disabled={false}`, onClick: `setPdfUrl(null); setLoading(true); const res = await generateProposalPdf(proposalId); setLoading(false); if (res.ok) setPdfUrl(res.pdfUrl); else toast.error(res.error)`
  - Wenn `pdfUrl != null`: `<iframe src={pdfUrl}>` als Modal (shadcn `<Dialog>` Full-Width) ODER Inline (HTML-Preview ausblenden + iframe einblenden) — Default: Modal, weil HTML-Preview als Sicherheits-Anker erhalten bleibt
  - Loading-State: Button zeigt Spinner + "Generiere PDF..."
  - User-Hinweis nicht aendern (HTML bleibt Approximation)
- Verification: Browser-Smoke: Klick erzeugt PDF in iframe, sichtbar im Modal
- Dependencies: MT-4

### MT-6: Watermark-Smoke + Multi-Client-PDF-Tests
- Goal: AC6 (Multi-Client-Render) + AC7+AC8 (Watermark-Toggle)
- Files: keine (manueller Test)
- Expected behavior:
  - Mit `INTERNAL_TEST_MODE_ACTIVE='true'` (Default): PDF generieren, Footer + Filename verifizieren
  - Mit `INTERNAL_TEST_MODE_ACTIVE='false'`: Coolify-ENV-Switch + Redeploy + erneut generieren, Footer + Filename verifizieren
  - PDF in Adobe Reader, Chrome, Outlook, Gmail oeffnen — Smoke
  - Dokumentation in QA-Report mit Screenshots (mind. 2: mit + ohne Watermark)
- Verification: 4 Mailclient-Tests + 2 Watermark-Modi dokumentiert
- Dependencies: MT-5

### MT-7: Berechnungs-Konsistenz-Test (UI vs PDF)
- Goal: Cent-genaue Konsistenz zwischen HTML-Preview und PDF
- Files: keine (manueller Test)
- Expected behavior:
  - Test-Fall A: 1 Item qty=3, price=100.50, discount=0%, tax=19%
    - UI-Footer: Subtotal 301.50, Tax 57.29, Total 358.79
    - PDF-Summary: Subtotal 301,50 €, Steuer 57,29 €, Brutto 358,79 €
    - DB nach Generate: `subtotal_net=301.50`, `tax_amount=57.29`, `total_gross=358.79`
  - Test-Fall B: 3 Items mit Discounts 10%/0%/25% + tax=7%
  - Test-Fall C: 0 Items + tax=19% → alle 0
  - Dokumentation in QA-Report mit Screenshots
- Verification: 3 Faelle dokumentiert, alle Cent-genau gleich
- Dependencies: MT-5

### MT-8: Edge-Case-Smokes
- Goal: Robustness-Tests
- Files: keine (manueller Test)
- Expected behavior:
  - Edge-Fall 1: Angebot ohne Logo (`branding.logo_path = NULL`) → PDF rendert ohne Logo
  - Edge-Fall 2: Angebot mit langem Title (>100 Zeichen) → Title wrapped oder truncated, kein Crash
  - Edge-Fall 3: Angebot mit Sonderzeichen "Mueller & Soehne / Q1" → Filename `Angebot-Mueller-Soehne-Q1-V1.pdf`
  - Edge-Fall 4: Angebot mit 0 Items → leere Position-Tabelle, Subtotal 0.00
  - Edge-Fall 5: Angebot mit 50 Items → Multi-Page-Layout, alle Items sichtbar
  - Performance-Messung: 5-Item-Generate < 2s, 50-Item-Generate < 5s (Server-Logging)
- Verification: 5 Faelle dokumentiert
- Dependencies: MT-5

## Schaetzung

~5-7h:
- MT-1 (pdfmake-Install + Adapter-Skeleton): ~30min
- MT-2 (Image-Helper + Filename-Helper): ~45min
- MT-3 (DocDefinition Layout-Implementation): ~2h
- MT-4 (generateProposalPdf Server Action): ~1h
- MT-5 (PreviewPanel-Hookup): ~30min
- MT-6 (Watermark + Multi-Client-Smoke): ~1h
- MT-7 (Berechnungs-Konsistenz-Test): ~30min
- MT-8 (Edge-Case-Smokes): ~30min
- Buffer + Bug-Fix: ~1-1.5h
