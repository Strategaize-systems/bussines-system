# FEAT-553 — PDF-Renderer + Branding

## Status
planned

## Version
V5.5

## Purpose
Server-side PDF-Renderer im V5.3-Branding. Erzeugt das eigentliche Lieferformat des Angebots (PDF, gespeichert in `proposal-pdfs` Bucket).

## Context
- V5.3 FEAT-531 Branding-Settings + Mail-Layout-Engine bietet den Renderer-Pattern: serverseitig, kein externer Service.
- PDF-Library-Wahl ist `/architecture`-Entscheid (PRD-Empfehlung: pdfmake — deklarativ, Node-only, kein Headless-Browser).

## Scope
**Library + Helper:**
- PDF-Library installiert + in einem Adapter `cockpit/src/lib/pdf/proposal-renderer.ts` gekapselt
- Adapter-Interface: `renderProposalPdf(proposal, items, branding) => Buffer`

**Layout:**
- Briefkopf: Logo (aus `branding_settings.logo_path`), Markenfarbe als Linie
- Empfaenger-Block: Kontakt + Firma + Adresse
- Angebot-Header: "Angebot {title}", "V{version}", Datum, Gueltig bis
- Position-Tabelle: Pos | Produkt | Menge | Einzelpreis | Discount | Summe
- Summary: Subtotal, Steuer (Satz), Brutto
- Konditionen: Zahlungsfrist
- Footer: Branding-Footer + (Internal-Test-Mode-Wasserzeichen wenn aktiv)

**Storage:**
- PDF wird bei "PDF generieren"-Klick und beim Send geschrieben
- Pfad: `{user_id}/{proposal_id}/v{version}.pdf`
- Path persistiert in `proposals.pdf_storage_path`

**Internal-Test-Mode-Watermark:**
- Footer-Zeile "Internal-Test-Mode — nicht fuer externe Empfaenger"
- Datei-Suffix `.testmode.pdf`
- Pruefung via Feature-Flag analog V5.1 Compliance-Mechanismus

## Out of Scope
- WYSIWYG-Editor
- Custom-Templates pro Deal/Branche
- Multi-Page-Support fuer >100 Positionen (V5.5 hat max 50 Positionen)
- Custom-Fonts (nur Standard-PDF-Fonts)

## Acceptance Criteria
1. PDF wird mit Logo, Markenfarbe und Footer im V5.3-Branding gerendert
2. Position-Tabelle zeigt alle Items korrekt mit Netto-Berechnung pro Zeile
3. Summary stimmt mit der UI-Berechnung ueberein (Cent-genau)
4. PDF oeffnet sich problemlos in Adobe Reader, Preview, Chrome-PDF-Viewer
5. Internal-Test-Mode-Watermark erscheint im Footer und Filename
6. PDF-Generierung dauert < 2s fuer typisches Angebot (5-10 Items)

## Dependencies
- FEAT-551 (Schema)
- FEAT-552 (UI-Trigger)
- V5.3 `branding_settings`

## Open Questions
- PDF-Library-Wahl (siehe PRD)
- Watermark-Format (siehe PRD)

## Related
- BL-405
- FEAT-531 (Branding-Renderer Pattern)
