# FEAT-571 — NL-Mehrwertsteuer-Saetze + Reverse-Charge fuer Intracommunautaire Dienstleistungen

## Status
planned

## Version
V5.7

## Purpose
Strategaize Transition GmbH sitzt steuerlich in den Niederlanden. Aktuell sind die Angebot- und Rechnungs-PDFs (V5.5 FEAT-553) auf deutsche Steuerlogik kalibriert: `proposals.tax_rate NUMERIC(5,2) DEFAULT 19.00`, kein Reverse-Charge-Pfad, keine BTW-Nummer-Felder. Das macht die heute generierten PDFs **rechtlich nicht produktionstauglich** fuer einen NL-Sitz. V5.7 hebt den Angebot-Pfad auf NL-konforme Steuerlogik (21/9/0% statt 19/7/0%) und ergaenzt den B2B-EU-Cross-Border-Pfad mit Reverse-Charge-Hinweis ("BTW verlegd").

## Context
- **V5.5 (REL-020)** hat den Angebot-Workspace und PDF-Renderer geliefert: `proposals.tax_rate` ist persistiert, der pdfmake-Adapter rendert Subtotal, Tax und Total. Steuerlogik war damals bewusst aus Scope (V5.5 = Erstellung, nicht Compliance).
- **BL-417** (high-prio) wurde am 2026-05-02 angelegt, nachdem im SLC-562 Live-Smoke aufgefallen ist, dass NL-VAT-Saetze fehlen. STATE.md fuehrt es seit dem als naechsten Pflicht-Schritt vor V7.
- Strategaize ist B2B-Dienstleister fuer Beratung und Software — die Mehrheit der Kunden sitzt in DE/AT/EU. Cross-Border B2B ist der Regelfall, nicht die Ausnahme.

## Scope

### 1. NL-VAT-Saetze 21/9/0 (statt deutscher 19/7/0)

**DB-Schema (MIG-028):**
- `proposals.tax_rate` Default von `19.00` auf `21.00` umstellen (NL Standard)
- CHECK-Constraint hinzufuegen: `tax_rate IN (0.00, 9.00, 21.00)` — Whitelist statt Free-Form
- Bestehende Angebote bleiben mit ihrem persistierten Wert unangetastet (Snapshot-Prinzip aus DEC-107)

**Editor-UI:**
- Neuer Steuersatz-Dropdown im Proposal-Editor (Position-Items-Bereich oder Total-Bereich — Architektur-Entscheid)
- Optionen: "21% (Standard NL)", "9% (reduziert NL)", "0% (steuerfrei)"
- Default fuer neue Angebote: 21%
- Bei Reverse-Charge-Aktivierung (siehe Punkt 2): Dropdown lockt auf 0%

**Branding-Default:**
- Branding-Settings koennten optional einen "Standard-Steuersatz"-Wert fuehren — *zur Diskussion in /architecture*

### 2. Reverse-Charge / Intracommunautaire prestatie ("BTW verlegd")

**Logik:**
- Bei B2B-Empfaengern in anderen EU-Laendern (nicht NL) wird ohne MwSt fakturiert (0%)
- Empfaenger zahlt die Steuer selbst (Reverse-Charge)
- Voraussetzungen die alle erfuellt sein muessen:
  1. Strategaize hat eine BTW-Nummer hinterlegt (Settings)
  2. Empfaenger-Firma hat eine USt-IdNr/BTW-Nummer hinterlegt (Company-Stammdaten)
  3. Empfaenger sitzt in einem EU-Land (nicht NL)
- Wenn alle drei erfuellt: Reverse-Charge-Toggle im Editor verfuegbar, default OFF (User entscheidet bewusst)
- Wenn aktiv: tax_rate wird auf 0.00 fixiert + Pflicht-Block im PDF

**PDF-Renderer-Block:**
- Neuer Block am Ende der Tax-Sektion (oder als Footnote): "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC"
- Pflicht: BTW-Nummer Strategaize + USt-IdNr Empfaenger werden auf der Rechnung gedruckt
- Sprache: Niederlaendisch + Englisch parallel (international konvention bei Reverse-Charge)

### 3. BTW-Nummer-Felder

**Strategaize (Settings):**
- Neues Feld in `branding` oder neuer `company_settings`-Tabelle: `vat_id TEXT` (Strategaize NL BTW-Nummer)
- Format-Validierung: NL-BTW-Format `NL` + 9 Ziffern + `B` + 2 Ziffern (z.B. `NL859123456B01`)
- Settings-Page-Eingabefeld + Persistierung

**Empfaenger (Company):**
- Neues Feld `companies.vat_id TEXT` — internationale USt-IdNr/BTW
- Format-Validierung: EU-VAT-ID-Pattern (Land-Praefix + 2-12 Zeichen, Whitelist gegen EU-Country-Codes)
- Eingabe in der Company-Stammdaten-View
- Optional: VIES-Online-Validierung (Open Question — siehe unten)

### 4. PDF-Renderer-Erweiterung

- Bei normaler Rechnung mit Steuer: Block `MwSt 21%` (oder `BTW 21%` falls NL-Empfaenger)
- Bei Reverse-Charge: Block `BTW verlegd / Reverse Charge — Art. 196 VAT Directive 2006/112/EC` + beide Steuernummern
- Footer-Block mit Strategaize-BTW-Nummer ergaenzen (immer, auch bei DE-Kunden)

### 5. Sprache

- Sprache der Rechnung bleibt deutsch fuer DE-Kunden (kein Multi-Language-Switch in V5.7)
- Pflicht-Reverse-Charge-Phrase: NL/EN parallel (international konvention)
- Steuersatz-Label im Editor deutsch ("21% Standard NL")

## Out of Scope
- Multi-Language-PDF (deutsch/niederlaendisch/englisch komplett — kommt spaeter falls noetig)
- Automatische ICP-Meldung-Generierung (Opgaaf ICP NL Reporting) — manuell durch User
- Steuersatz-Migration bestehender Angebote (Snapshot-Prinzip — alte Angebote bleiben mit 19%)
- Rechnungsstellung als eigenes Modul (Angebote koennen weiterhin nicht zu Rechnungen werden — separater Scope spaeter)
- VIES-Real-Time-Lookup-Integration (siehe Open Question — kann V5.7 oder spaeter)
- Multi-Tenant-Multi-Country-Support (Strategaize ist Single-Tenant NL-only)
- Drittland-Pfad (USA/UK/CH) — derzeit irrelevant, kommt mit konkretem Kunden

## Acceptance Criteria

1. **Steuersatz-Dropdown** im Proposal-Editor zeigt nur 21/9/0 (Whitelist), Default 21%
2. **DB-CHECK-Constraint** lehnt INSERT/UPDATE mit `tax_rate NOT IN (0, 9, 21)` ab (Test mit Vitest)
3. **Branding-/Settings-Eingabefeld** fuer Strategaize-BTW-Nummer mit NL-Format-Validierung
4. **Company-Eingabefeld** fuer USt-IdNr/BTW-Nummer mit EU-Format-Validierung
5. **Reverse-Charge-Toggle** ist im Editor nur aktivierbar wenn alle 3 Voraussetzungen erfuellt sind (BTW Strategaize + BTW Company + Country!=NL)
6. **Reverse-Charge aktiv** zwingt tax_rate auf 0.00 (UI-lock + Server-Validation)
7. **PDF mit Reverse-Charge** druckt den NL/EN-Pflicht-Block + beide BTW-Nummern an korrekter Stelle
8. **PDF ohne Reverse-Charge** druckt normalen MwSt-Block + Strategaize-BTW im Footer
9. **Live-Smoke** mit drei Test-Angeboten:
   - Angebot an DE-Kunde mit BTW-Nummer + Reverse-Charge AN → korrekter Block
   - Angebot an DE-Kunde ohne BTW-Nummer → Reverse-Charge-Toggle disabled
   - Angebot mit 21% Standard → korrekter MwSt-Block
10. **Bestehende Angebote** (vor MIG-028) bleiben unveraendert sichtbar mit ihrem Original-Steuersatz

## Dependencies
- FEAT-551 (proposals-Schema, tax_rate-Spalte)
- FEAT-553 (PDF-Renderer + Branding)
- V5.5 Code-Stand (REL-020)

## Open Questions

1. **Pflichtformulierung Reverse-Charge:** Ist die Standardphrase "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC" wirklich ausreichend, oder verlangt NL eine spezifischere Formulierung? **Recherche-Aufgabe vor /architecture.**

2. **ICP-Meldung-Pflicht (Opgaaf ICP):** Ist die Reverse-Charge-Meldung an die NL-Steuerbehoerde rein eine Reporting-Pflicht (User macht das selbst quartalsweise), oder muss in der Rechnung etwas zusaetzlich gedruckt werden? **Recherche-Aufgabe vor /architecture.**

3. **BTW-Nummer-Validierung:** Reicht eine Format-Pattern-Validierung (Regex), oder soll V5.7 bereits eine VIES-Online-Lookup-Integration haben (https://ec.europa.eu/taxation_customs/vies/)? VIES-Lookup ist ein externer Service-Call mit Caching-Pflicht. **Default-Empfehlung: Format-only in V5.7, VIES-Lookup als BL-XXX im Backlog.**

4. **Branding-Default-Steuersatz:** Soll der Standard-Steuersatz in `branding` konfigurierbar sein, oder hardcoded 21% NL? Macht es einen Unterschied fuer Strategaize Single-Tenant? **Default-Empfehlung: hardcoded 21%, kein Branding-Feld in V5.7.**

5. **Sprache PDF:** Bleibt das PDF deutschsprachig, auch bei Reverse-Charge an einen NL-Kunden? Oder soll bei Reverse-Charge ein NL/EN-Header dazu? **Default-Empfehlung: deutsch bleibt, nur Reverse-Charge-Phrase NL/EN.**

6. **Bestehende Daten:** Was passiert mit den V5.5/V5.6 Test-Angeboten in der Live-DB die mit `tax_rate=19.00` bereits existieren? Migration-Strategie? **Default-Empfehlung: bleiben unangetastet (Snapshot-Prinzip), nur neue Angebote bekommen 21% Default.**

7. **Drittland-Faelle (UK/CH/US):** Was passiert wenn der Empfaenger ausserhalb EU sitzt? Reverse-Charge-Pfad gilt nicht (Art. 44 VAT Directive ist EU-only). **Default-Empfehlung: V5.7 ignoriert Drittland — kommt mit erstem konkreten Kunden.**

8. **Rechnungs-Status vs. Angebot-Status:** Ist V5.7 noch im Angebot-Pfad oder bereits Rechnungs-Pfad? Aktuell sind `proposals` reine Angebote (status: draft/sent/accepted/...). Reverse-Charge gehoert juristisch zur **Rechnung**, nicht zum Angebot. **Default-Empfehlung: V5.7 erweitert nur den PDF-Renderer + die Steuersatz-Logik, das Konzept "Angebot vs. Rechnung" bleibt out-of-scope. Beide Dokumenttypen werden weiterhin ueber `proposals` rendert mit dem gleichen PDF-Schema.** Falls separater Rechnungstyp noetig: spaeter als eigenes Feature.

## Related
- BL-417 (high, version=V5.7) — wird mit FEAT-571 erledigt
- DEC-107 (V5.5 Snapshot inkl. price_at_creation) — Snapshot-Prinzip wird hier weitergefuehrt fuer tax_rate
- COMPLIANCE.md — wird im Slice-Planning erweitert um NL-VAT-Sektion
