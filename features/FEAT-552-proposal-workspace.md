# FEAT-552 — Angebot-Workspace UI (3-Panel)

## Status
planned

## Version
V5.5

## Purpose
Neue Vollbild-Schreibumgebung `/proposals/[id]/edit` analog dem V5.3 Composing-Studio. Operativer Ort fuer Angebot-Erstellung mit Position-Items, Editor und Live-Preview.

## Context
- Heutige `/proposals`-Seite ist eine Tabellen-View mit Modal-Form (216 Zeilen `proposal-form.tsx`) — reine Status-Doku.
- Composing-Studio aus FEAT-532 ist 3-Panel-Layout — bewaehrtes Pattern.

## Scope
**Route:** `/proposals/[id]/edit`

**Panel links — Position-Liste:**
- Liste der `proposal_items` mit Drag-and-Drop-Sortierung (`position_order`)
- "Produkt hinzufuegen"-Button oeffnet Picker aus V6 `products`
- Pro Item: Snapshot-Name, Menge, Einzelpreis, Discount-%, Zwischensumme, Loeschen-Button
- Footer: Subtotal Net, Steuer, Brutto

**Panel Mitte — Angebot-Editor:**
- Titel, Empfaenger-Auswahl (Kontakt + Firma aus Deal-Kontext)
- Steuersatz (Default 19%, Dropdown 0/7/19)
- Gueltig bis (Date-Picker, Default +30 Tage)
- Zahlungsfrist (Free-Text, Default aus Branding)
- Notizen (intern, nicht im PDF)

**Panel rechts — Live-Preview:**
- HTML-Approximation des PDF-Layouts (schnell, debounced)
- "PDF generieren"-Button triggert Server-Render und zeigt das echte PDF in iframe
- "Versionierung" (Liste vorheriger Versionen, "Neue Version erstellen")

**Einstiegspunkte:**
- Deal-Workspace: Quickaction "Angebot erstellen" → erstellt Draft + redirected
- Pipeline-Card: Kontextmenue-Eintrag "Angebot erstellen"
- `/proposals` Tabelle: "Bearbeiten"-Button auf Draft-Angeboten

## Out of Scope
- Mobile-Layout (Desktop-only)
- Collaborative-Editing
- Inline-Produkt-Erstellung
- WYSIWYG-PDF-Editor (Layout ist fix)

## Acceptance Criteria
1. Route `/proposals/[id]/edit` rendert 3-Panel-Layout
2. Position-Items lassen sich hinzufuegen, sortieren, loeschen
3. Brutto/Netto/Steuer wird live berechnet
4. Live-Preview aktualisiert sich debounced bei jeder Aenderung
5. "Angebot erstellen" aus Deal-Workspace und Pipeline funktioniert
6. Server-Action `updateProposal` persistiert alle Aenderungen mit RLS-Guard

## Dependencies
- FEAT-551 (Schema)

## Open Questions
- Live-Preview HTML vs Server-PDF (siehe PRD)

## Related
- BL-405
- FEAT-532 (3-Panel Pattern Vorbild)
