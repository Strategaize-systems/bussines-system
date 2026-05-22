# Custom-Reports — Eigene KI-Berichts-Vorlagen

> Guide 9 von 12. **Wer:** Alle Rollen. **Dauer:** ~8 Min.

## Ziel

Sie wissen, wie Sie eine freie KI-Frage als wiederverwendbare Berichts-Vorlage speichern und spaeter mit einem Klick erneut ausfuehren.

## Voraussetzungen

- Sie haben den [KI-Workspace](mein-tag.md) zumindest einmal benutzt
- Sie haben eine Frage, die Sie regelmaessig stellen wollen

## Was Custom-Reports sind

Custom-Reports sind **persoenliche Berichts-Vorlagen**. Jeder User kann:
- Eine Free-Form-Frage stellen
- Das Ergebnis pruefen
- Das Ergebnis als wiederverwendbare Vorlage speichern
- Spaeter mit einem Klick wieder ausfuehren (frische Daten, neuer Bedrock-Call)

RLS-Isolation: Custom-Reports sind **pro Owner sichtbar/editierbar**. Admin sieht zusaetzlich alle.

## Schritte: Custom-Report anlegen

### Schritt 1: Frage im KI-Workspace stellen

Auf "Mein Tag" oder "KI-Analyse-Cockpit" tippen oder diktieren Sie eine konkrete Frage in die **Eingabezeile** (nicht Berichts-Button):

Beispiele:
- "Welche Deals stagnieren seit 14 Tagen ueber 50k Wert?"
- "Welche Multiplikatoren haben seit 60 Tagen nichts mehr beigetragen?"
- "Wie viele Cold-Lead-Activities habe ich diesen Monat angelegt?"
- "Welche Stages haben die hoechste Conversion-Rate?"

Klick **Senden** oder Enter.

### Schritt 2: Bedrock-Antwort pruefen

KI antwortet mit strukturiertem Markdown (~5-15 Sek). Pruefen Sie:
- Hat die KI die Frage verstanden?
- Sind die Daten in der Antwort plausibel?
- Ist der Format-Style fuer regelmaessige Wiederverwendung geeignet?

Wenn ja: weiter zum Speichern. Wenn nein: Frage anpassen + erneut senden.

### Schritt 3: Als Bericht speichern

Unter der KI-Antwort erscheint ein Button **"Als Bericht speichern"** (nur bei Free-Form-Frage, NICHT bei Standard-Berichts-Buttons oder NL-Builder-Mode).

1. Klick **"Als Bericht speichern"**.
2. Modal oeffnet sich:
   - **Name** (Pflicht, 2-80 Zeichen): z.B. "Stagnierende-Deals-50k"
   - **Beschreibung** (optional)
3. Klick **"Speichern"**.

Bei UNIQUE-Verletzung (Name schon vergeben pro User): Fehler "Name bereits vergeben" — anderen Namen waehlen.

### Schritt 4: Custom-Report wiederverwenden

1. Im KI-Workspace gibt es einen **"Meine Berichte"**-Dropdown (Sub-Menu neben den Standard-Berichts-Buttons).
2. Klick → Liste Ihrer Custom-Reports.
3. Klick auf einen Eintrag → KI fuehrt die Frage erneut aus (frische Daten, neuer Bedrock-Call).
4. Ergebnis wird im AnswerPane angezeigt — identische Render-Logik wie Standard-Berichte.

### Schritt 5: Bericht umbenennen / loeschen

Im **"Meine Berichte"**-Dropdown → Sub-Menu neben jedem Eintrag:
- **Umbenennen** — Name + Beschreibung editieren
- **Loeschen** — mit Confirm-Modal

## Context-Type-Konzept (technisch)

Beim Speichern wird ein `context_type` mitgeschickt, der den Default-Loader entscheidet:

- **`mein-tag`** — laedt Activities heute + offene Tasks + aktive Deals last 30d
- **`cockpit`** — laedt Pipeline-Aggregate + Top-10-stagnierend + Win/Loss last 30d

Bei jeder Ausfuehrung wird der Loader passend zur ursprunglichen Page aufgerufen.

## Erwartetes Ergebnis

- Sie haben eine Liste persoenlicher Custom-Reports
- Jeder Bericht ist mit 1 Klick erneut auszufuehren
- Frische Daten bei jeder Ausfuehrung

## Tipps

- **Konkrete Fragen sparen Cost** — die KI muss weniger raten, was Sie wollen
- **Berichte iterativ verfeinern** — speichern Sie eine erste Version, nutzen Sie sie, schaerfen Sie die Frage nach 2-3 Runs, ueberschreiben Sie via Umbenennen
- **Time-Bounded-Queries** — "diesen Monat", "letzte 30 Tage", "Q3 2026" funktionieren — die KI rechnet das in Datumsbereiche um
- **Aufpassen auf Cost** — jeder Run kostet $0.005-0.015. Bei taeglich 10 Custom-Report-Runs sind das ~$1.50/Tag.

## Haeufige Probleme

### "Save-Button erscheint nicht"
"Als Bericht speichern" erscheint nur bei Free-Form-Frage MIT einem Bedrock-Ergebnis. Bei Standard-Berichts-Buttons oder NL-Builder-Mode oder ohne Antwort erscheint der Button nicht.

### "Name bereits vergeben"
Pro User sind Namen UNIQUE. Anderen Namen oder unter Sub-Menu "Umbenennen" den existierenden Bericht editieren.

### "Bericht zeigt veraltete Daten"
Bei jeder Ausfuehrung wird ein frischer Bedrock-Call mit den AKTUELLEN Daten gemacht — Sie sehen also immer Live-Daten. Wenn Daten dennoch veraltet wirken: Page-Refresh oder pruefen Sie den Loader-Context (mein-tag vs cockpit).

### "Cost zu hoch"
Audit-Log unter `/settings/audit-log` filtern auf `action=custom_report.executed`. Sie sehen wer wann welchen Bericht ausgefuehrt hat + cost_usd.

## Siehe auch

- [Mein Tag](mein-tag.md) — KI-Workspace-Basics
- [KI optimal nutzen](ki-usage.md) — Cost-Transparenz + Prinzipien
- [Workflow-Automation](workflow-automation.md) — Regeln vs. Berichte (verschiedene Konzepte)
