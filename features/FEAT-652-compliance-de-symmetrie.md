# FEAT-652 — Compliance-Erweiterung NL→DE-Symmetrie

**Status:** planned
**Version:** V6.5
**Created:** 2026-05-08
**Sources:** V5.7 DEC-124 (VAT-ID-Format-only) + V5.7 DEC-128 (NL-Reverse-Charge)

## Purpose

V5.7 hat NL-Reverse-Charge fuer EU-B2B-Cross-Border implementiert (Strategaize Transition GmbH NL-Sitz). Die DE-Variante (Steuerschuldnerschaft des Leistungsempfaengers § 13b UStG) blieb deferred, weil V5.7 fokussiert auf NL-Compliance war. Plus VAT-ID-Validierung blieb Format-only (Regex + EU-Country-Code-Whitelist) ohne echte VIES-Online-Pruefung.

V6.5 schliesst beide Compliance-Luecken: VIES-Online-Lookup fuer reale VAT-ID-Validierung und DE-§13b-Reverse-Charge als Symmetrie zur NL-Variante. Pre-Production-relevant — muss vor erstem Kunden-Live-Call stehen, gehoert daher in V6.5 (Hintergrund-Sprint vor V7).

## Scope

### Teil 1: VIES-Online-Lookup (BL-420)

**Aktuell:** V5.7 vat-id.ts Validation-Layer prueft nur Format (Regex + Country-Code). Keine Existenz-/Aktualitaets-Pruefung.

**Implementation:**
- VIES-SOAP/REST-Adapter (`cockpit/src/lib/vat/vies-client.ts`) — REST-API-Pattern bevorzugt (https://ec.europa.eu/taxation_customs/vies/services/checkVatService)
- Caching-Layer (24h-TTL ueblich) auf In-Memory oder DB-Tabelle `vat_id_validations`
- Graceful-Degradation: bei VIES-Down faellt zurueck auf Format-only mit User-Hinweis
- UI-Indikator: Validierungs-Status (live-checked vs format-only) im Branding-Form + Company-Form
- Audit-Log-Eintrag bei jedem Lookup mit Resultat + Cache-Hit/Miss

### Teil 2: DE-§13b Reverse-Charge (BL-421)

**Aktuell:** V5.7 DEC-128 implementiert Country-Switch DE/NL und filtert Editor-Steuersaetze (DE: 0/7/19, NL: 0/9/21). Reverse-Charge bleibt NL-spezifisch — im DE-Mode ist der Reverse-Charge-Toggle disabled mit Tooltip-Hinweis.

**Implementation:**
- DE-Phrase-Constant: "Steuerschuldnerschaft des Leistungsempfaengers" + Verweis auf § 13b UStG / Art. 196 VAT Directive 2006/112/EC
- pdfmake-Block-Builder erweitern um DE-Variante (analog NL-`reverse-charge-block.ts`)
- Editor-Toggle in DE-Mode aktivierbar mit gleicher 3-Voraussetzungen-Logik (Branding-Country=DE, Company-Country=EU-non-DE, Company-VAT-ID-vorhanden)
- PDF-Block-Insert kontextabhaengig (NL-Phrase wenn Branding=NL, DE-Phrase wenn Branding=DE)
- ICP-Equivalent-Hinweis: User-Reminder als Inline-Note im Editor (kein PDF-Insert) — "Beachte Zusammenfassende Meldung-Pflicht"

## Acceptance Criteria

**AC1:** `cockpit/src/lib/vat/vies-client.ts` existiert mit `lookupVatId(country, number)` als Pure-Function-Interface.

**AC2:** Caching-Layer mit 24h-TTL implementiert; Cache-Hit/Miss im Audit-Log nachvollziehbar.

**AC3:** Branding-Form + Company-Form zeigen Live-VIES-Validierungs-Status (Badge: Format-OK / VIES-OK / VIES-Failed) — graceful-degradation bei VIES-Down.

**AC4:** Vitest fuer VIES-Adapter + Cache-Layer mit Mock-Adapter (kein echter VIES-Call in Tests).

**AC5:** `cockpit/src/lib/pdf/de-reverse-charge-block.ts` existiert (Pendant zu `nl-reverse-charge-block.ts`).

**AC6:** Editor-Toggle in DE-Mode aktivierbar wenn alle 3 Voraussetzungen erfuellt; PDF-Block wird kontextabhaengig gerendert.

**AC7:** PDF-Snapshot-Tests fuer DE- und NL-Variante (analog V5.7 SLC-571 MT-8).

**AC8:** Build clean, Vitest >=405 PASS, kein neuer Lint-Error.

**AC9:** Live-Smoke: 1 NL-Reverse-Charge-PDF + 1 DE-Reverse-Charge-PDF generiert + visuell verifiziert.

## Out of Scope

- VIES-Lookup als Async-Validation im Form-Submit (Format-only bleibt sync; VIES laueft on-demand bei Save)
- Multi-Country-Reverse-Charge ueber DE/NL hinaus (z.B. AT, FR) — wenn Bedarf, separater Slice
- VIES-Bulk-Validation fuer Bestandsdaten-Cleanup (ggf. separater Hygiene-Slice)
- Zusammenfassende Meldung-Export (XML-Format fuer Bundeszentralamt) — out-of-V6.5
- Cross-Border-VAT-Reporting-Compliance ueber Cross-Charge hinaus

## Open Questions for /architecture

- VIES-Caching: In-Memory-Cache (verliert bei Container-Restart) oder DB-Tabelle?
- VIES-Caching-TTL: 24h-Konstante oder per-Setting konfigurierbar?
- VIES-Down-Behavior: Format-only-Fallback transparent fuer User, oder mit User-Warning?
- DE-§13b Pflichtformulierung: 1:1 BL-421-Description oder zusaetzliche Anwaltspruefung noetig?
- ICP-Equivalent-Hinweis: nur Editor-Inline-Note oder auch PDF-Footer-Hinweis?
- VIES-API-Schluessel: gibt es einen oder ist VIES kostenlos+rate-limited?

## References

- BL-420 in `/planning/backlog.json` (VIES-Lookup)
- BL-421 in `/planning/backlog.json` (DE-§13b)
- V5.7 DEC-124 (VAT-ID-Format-only Begruendung)
- V5.7 DEC-128 (NL-Country-Switch + Steuersatz-Whitelist)
- V5.7 `cockpit/src/lib/vat/vat-id.ts` als Validation-Layer-Erweiterungs-Basis
- V5.7 `cockpit/src/lib/pdf/reverse-charge-block.ts` als DE-Block-Vorlage
- VIES Service: https://ec.europa.eu/taxation_customs/vies/services/checkVatService
