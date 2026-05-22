# Zahlungsbedingungen + Pre-Call Briefing

> Guide 11 von 12. **Wer:** Alle Rollen. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wie Sie Zahlungsbedingungen (Skonto, Split-Plans) in Angeboten konfigurieren und wie das Pre-Call Meeting-Briefing funktioniert.

## Voraussetzungen

- Verstaendnis fuer die [Angebot-Erstellung](deal-detail.md)

## Teil 1: Zahlungsbedingungen (V5.6)

### Was Sie konfigurieren koennen

In **Settings → Zahlungsbedingungen** (`/settings/payment-terms`):
- **Templates** mit Default-Werten:
  - Zahlungs-Frist (z.B. 14 Tage)
  - Skonto-Regel (z.B. 2% bei Zahlung binnen 7 Tagen)
  - Split-Plan-Milestones (z.B. 30% bei Auftrag, 40% bei Lieferung, 30% bei Abnahme)
- **Default-Conditions** fuer neue Angebote (Admin)

### Schritte: Template anlegen

1. `/settings/payment-terms` → "+ Neues Template"
2. Felder:
   - **Name** (z.B. "Standard 14 Tage Netto 2% Skonto 7 Tage")
   - **Zahlungs-Frist in Tagen**
   - **Skonto-Toggle** + **Skonto-Prozent** + **Skonto-Tage**
   - **Split-Plan** (optional, mehrere Milestones)
3. Speichern.

### Schritte: Skonto auf Angebot setzen

Im **Angebot-Workspace** (`/proposals/[id]/edit`) → Sidebar **"Zahlungsbedingungen"**:

1. Template waehlen oder Custom-Werte setzen.
2. **SkontoSection** zeigt Toggle + Prozent + Tage.
3. Bei Eingabe: Auto-Save mit Debounce.
4. **Validation:** Skonto-Prozent UND -Tage muessen beide gesetzt sein, oder beide NULL. Server-Action `validateSkonto` blockt inkonsistente Saves.

### Skonto-State-Drift-Schutz (SLC-572)

V5.7-Patch: Beim User-Clear eines Skonto-Felds wird der `lastKnownGoodSkontoRef` genutzt — bei Server-Save-Error wird der State zurueckgesetzt, sodass Sie nie inkonsistente UI-States haben.

### Schritte: Split-Plan

Bei groesseren Projekten:
1. **SplitPlanSection** im Angebot → "+ Milestone".
2. Pro Milestone: Beschreibung + Prozent + Faelligkeit.
3. Summe der Prozente muss 100% sein (Validation).
4. Im gerenderten PDF erscheinen die Milestones als Tabelle.

### Render im PDF

Bei pdfmake-Rendering wird die SkontoSection (falls gesetzt) als Fussnote unter den Position-Items eingebaut. Beispiel:
> "Zahlbar binnen 14 Tagen netto. Bei Zahlung binnen 7 Tagen ziehen Sie bitte 2% Skonto vom Rechnungsbetrag ab."

Plus Split-Plan als Tabelle wenn vorhanden.

## Teil 2: Pre-Call Meeting-Briefing (V5.6)

### Was es ist

Vor jedem Meeting (Jitsi-Call) bekommen Sie einen **kurzen Briefing-Bericht** mit:
- Deal-Kontext: Stage, Wert, Owner, letzter Touchpoint
- Letzte 5 Activities chronologisch
- KI-Zusammenfassung der letzten 3 E-Mail-Threads mit dem Hauptkontakt
- Naechste-Schritte-Empfehlung (KI-generiert)

### Schritte: Briefing aktivieren

1. `/settings/briefing` → Admin-Page
2. **Briefing-Cron** aktivieren (laeuft typisch 30 Min vor jedem Termin)
3. **Briefing-Email-Optional** — kann als Mail an Ihren eigenen Account geschickt werden (oder nur als ActivityBriefingCard in Deal-Detail)

### Schritte: Briefing-Card im Deal sehen

Im Deal-Detail erscheint vor einem geplanten Meeting eine **ActivityBriefingCard** mit:
- Cyan-Border, prominent platziert
- Inhalt: Stage, Wert, Letzte-Activity-Zusammenfassung, KI-Empfehlung
- Klickbar fuer Volltext

### Datenfluss (DSGVO-relevant)

- Letzte 3 E-Mail-Threads werden als Snippet (200 Zeichen pro Mail) an Bedrock Claude Sonnet eu-central-1 geschickt
- Activities werden als kompakte JSON-Repraesentation geschickt (kein Audio, keine Anhaenge)
- Audit-Log: `briefing_generated` Action mit Quellen + Cost

## Erwartetes Ergebnis

- Angebote haben konsistente Zahlungsbedingungen
- Skonto + Split-Plans rendern korrekt im PDF
- Pre-Call Briefings landen rechtzeitig in Deal-Detail

## Tipps

- **Template einmalig anlegen + wiederverwenden** — bei jedem Angebot per Default vorausgewaehlt
- **Briefing-Lead-Time** anpassen — 30 Min vor Termin ist Default, kann via Cron-Config geaendert werden (Admin)
- **Briefing nutzt KI on-click** — keine Hintergrund-KI-Kosten ausserhalb der geplanten Briefing-Cron-Triggers

## Haeufige Probleme

### "Skonto-Toggle laesst sich nicht aktivieren"
Beide Felder (Prozent + Tage) muessen gesetzt sein, oder beide NULL. Validation blockt inkonsistente States.

### "Split-Plan-Summe waere 105%"
Server-Validation blockt Save. Korrigieren Sie die Milestone-Prozente.

### "Briefing-Card erscheint nicht"
1. Pruefen: `/settings/briefing` aktiviert?
2. Pruefen: Coolify-Cron `meeting-briefing` laeuft?
3. Pruefen: Meeting hat einen verknuepften Kontakt + Deal?

### "Briefing-Email kommt nicht an"
Brielfing-Email-Versand ist Optional. Pruefen Sie ENV-Konfig + SMTP-Logs.

## Siehe auch

- [Deal-Detail — Angebote](deal-detail.md)
- [Settings — Zahlungsbedingungen + Briefing](settings.md)
- [VAT + Reverse-Charge](vat-reverse-charge.md) — Steuersaetze in Angeboten
