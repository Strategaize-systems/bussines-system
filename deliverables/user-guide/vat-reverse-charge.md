# Steuern: NL+DE-VAT + Reverse-Charge

> Guide 12 von 12. **Wer:** Admin. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wie das System NL- und DE-Steuersaetze handhabt, wann Reverse-Charge gilt, und wie das im Angebot-PDF gerendert wird.

## Voraussetzungen

- Verstaendnis fuer die [Angebot-Erstellung](deal-detail.md)
- Rolle Admin (fuer Branding-Settings)

## Steuerlogik im System (V5.7)

### `business_country` ist die Hauptweiche

In `/settings/branding` setzen Sie **`business_country`** auf `NL` oder `DE`. Das entscheidet:

| Land | Default-Steuersatz fuer neue Angebote | VAT-ID-Format |
|---|---|---|
| NL | 21% | `NL\d{9}B\d{2}` (z.B. `NL859123456B01`) |
| DE | 19% | `DE\d{9}` (z.B. `DE123456789`) |

### Whitelist der Steuersaetze (CHECK-Constraint)

DB erzwingt: nur **5 Werte** sind erlaubt:
- `21.00` — Standard NL
- `19.00` — Standard DE (Legacy fuer alte Angebote)
- `9.00` — Reduziert NL
- `7.00` — Reduziert DE
- `0.00` — Steuerfrei / Reverse-Charge / Innergemeinschaftliche B2B

### Legacy-Schutz

Angebote die vor dem NL-Mode-Wechsel mit 19% angelegt wurden bleiben **unveraendert** (Snapshot-Prinzip DEC-107). Der Editor zeigt den Legacy-Wert read-only mit Hinweis.

## Reverse-Charge / "BTW verlegd"

### Wann es gilt

Bei B2B-Empfaengern in einem **anderen EU-Mitgliedsstaat als NL** kann die Steuerschuld auf den Empfaenger uebertragen werden (Artikel 196 EU-VAT-Directive 2006/112/EC).

### Voraussetzungen (alle muessen erfuellt sein)

1. **Sender-VAT-ID** ist gesetzt in `/settings/branding` und entspricht NL-Format
2. **Empfaenger-VAT-ID** ist gesetzt in der Firma-Stammdaten und entspricht EU-Format
3. **Empfaenger-Country** ist in der EU 27-Whitelist (Stand 2026) und **ungleich NL**

Drittlaender (UK Brexit, CH, US) sind ausgeschlossen.

### Schritte: Reverse-Charge aktivieren

1. Im Angebot-Editor sehen Sie eine **Reverse-Charge-Section** rechts.
2. Hook `useReverseChargeEligibility` prueft die 3 Voraussetzungen.
3. Wenn alle erfuellt: Toggle ist **aktivierbar**.
4. Klick Toggle ON → 2 Felder werden simultan gesetzt:
   - `reverse_charge = true`
   - `tax_rate = 0.00`
5. Save → Server-Action `saveProposal` validiert mit `validateReverseCharge` (Pure-Function).

### Reject-Pfade

Wenn Reverse-Charge angefragt aber Voraussetzungen nicht erfuellt:
- `tax_rate != 0` → Reject
- `branding.vat_id missing` → Reject mit Hinweis "VAT-ID in Settings setzen"
- `company.vat_id missing` → Reject mit Hinweis "VAT-ID des Empfaengers setzen"
- `country = NL` or non-EU → Reject mit Hinweis "Reverse-Charge gilt nur EU-Cross-Border"

### Audit-Eintrag

Bei tatsaechlicher Reverse-Charge-Status-Aenderung (Toggle ON oder OFF):
- `actor_id` = User
- `action` = `reverse_charge_toggled`
- `entity_id` = Proposal-UUID
- `changes` = `{ before: { reverse_charge, tax_rate }, after: { reverse_charge, tax_rate } }`
- `context` = "Reverse-Charge aktiviert" or "Reverse-Charge deaktiviert"

Saves ohne Toggle-Aenderung erzeugen KEINEN reverse_charge-Audit-Eintrag (Spam-Schutz).

## Render im PDF

Wenn `proposal.reverse_charge = true`:

1. Direkt unter der Tax-Row im Summary-Block: **bilingualer Hinweis**
   > "BTW verlegd / Reverse Charge — Article 196 VAT Directive 2006/112/EC"
2. Plus Zeile mit beiden VAT-IDs:
   > "BTW-Nr. NL859123456B01 — BTW-Nr. DE123456789"

Wenn `branding.vat_id` gesetzt ist (auch ohne Reverse-Charge): **VAT-ID im Adress-Footer**:
- Bei `business_country = NL`: "BTW-Nr." Praefix
- Bei `business_country = DE`: "USt-IdNr." Praefix

## Erwartetes Ergebnis

- Steuersaetze sind konsistent (NL/DE)
- Reverse-Charge greift nur bei erfuellten Voraussetzungen
- PDF rendert bilingualen Block korrekt
- Audit-Log dokumentiert Status-Aenderungen

## Tipps

- **Branding einmalig pflegen** — VAT-ID + business_country + Country (NL vs DE) korrekt setzen, dann laeuft der Rest automatisch
- **Firma-VAT-IDs einmalig erfassen** — beim Anlegen der Firma. Spaeter Manual-Updates moeglich, aber zeitkostend
- **Drittlaender nicht in V8.2-Scope** — UK, CH, US werden nicht unterstuetzt. Toggle bleibt disabled. V7+-Scope.
- **VIES-Online-Lookup nicht aktiv** — V5.7 macht nur Format-Validation. VIES-Lookup ist BL-420 fuer spaeter. Bei Unklarheit: manuell auf VIES-Website pruefen.
- **DE-§13b UStG Reverse-Charge** ist andere Rechtsgrundlage und nicht in V5.7-Scope (nur EU-Cross-Border ausserhalb NL). BL-421 fuer spaeter.

## Wichtige Pflichten ausserhalb des Systems

### ICP-Meldungspflicht (Opgaaf ICP)

Bei tatsaechlichem Versand von Reverse-Charge-Rechnungen ist eine **quartalsweise Zusammenfassende Meldung in NL Pflicht** (Opgaaf ICP). Das ist **User-Reporting-Pflicht** — kein automatischer Export im System. Bitte mit NL-Steuerberatung absprechen.

### Steuerberatungs-Pflicht

Diese Logik ist eine **pragmatische technische Implementierung** — sie ersetzt **keine Steuerberatung**. Vor erstem produktivem Versand pruefen lassen.

## Haeufige Probleme

### "Toggle ist disabled obwohl ich es aktivieren will"
Pruefen Sie:
1. `/settings/branding`: VAT-ID gesetzt? business_country=NL?
2. Firma des Empfaengers: VAT-ID + Country gesetzt? Country in EU-Whitelist + ungleich NL?

### "Save schlaegt fehl mit 'tax_rate must be 0 for reverse_charge'"
Toggle ON setzt automatisch tax_rate=0. Wenn Sie tax_rate manuell auf etwas anderes gesetzt haben: vorher zuruecksetzen oder Reverse-Charge-Toggle nutzen.

### "PDF zeigt keinen Reverse-Charge-Block"
Pruefen Sie `proposal.reverse_charge` in der DB (Admin). Falls true: Re-Render des PDF (Edit-Page → Save → neues PDF generieren). Alte PDFs bleiben unveraendert (Audit-Wahrheit).

### "Empfaenger-VAT-ID nicht erkannt"
Format-Validation prueft Praefix-Whitelist. Bei seltenen Country-Codes Admin kontaktieren.

## Siehe auch

- [Settings — Branding](settings.md) — business_country + VAT-ID einstellen
- [Deal-Detail — Angebote](deal-detail.md) — Reverse-Charge-Toggle im Editor
- `/docs/COMPLIANCE.md` Section V5.7 — vollstaendige Steuer-Doku
