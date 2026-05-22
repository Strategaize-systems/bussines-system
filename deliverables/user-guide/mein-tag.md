# Mein Tag — Ihre tagliche Vertriebsroutine

> Guide 1 von 12. **Wer:** Alle Rollen. **Dauer:** ~10 Min Lesezeit.

## Ziel

Sie wissen, wie Sie jeden Arbeitstag im System starten, was Sie sehen sollten, und wie Sie die KI-Tagesanalyse nutzen, um die richtigen Prioritaeten zu setzen.

## Voraussetzungen

- Sie sind eingeloggt
- Sie haben mindestens einen Deal oder eine Aufgabe im System

## Aufbau der Seite

Beim Klick auf "Mein Tag" in der Sidebar (Section VERWALTUNG_MEIN) sehen Sie drei zusammenhaengende Bereiche:

```
┌─────────────────────────────────────────────────┐
│  Heutige Aktivitaeten + KI-Workspace            │
├─────────────────────────────────────────────────┤
│  Offene Aufgaben (heute, ueberfaellig, spaeter) │
├─────────────────────────────────────────────────┤
│  Wiedervorlagen (KI-Vorschlaege fuer Deals)     │
└─────────────────────────────────────────────────┘
```

## Schritte fuer Ihren Tag-Start

### Schritt 1: Tagesanalyse-Bericht oeffnen

1. Oben auf der Seite finden Sie den **KI-Workspace** mit Berichts-Buttons:
   - **Tagesanalyse**
   - **Pipeline-Risiko**
   - **Top-Chancen**
   - **Win/Loss-Analyse**
   - **Wiedervorlagen-Priorisierung**
   - **Workflow bauen** (oeffnet den NL-Workflow-Builder)
2. Klicken Sie **"Tagesanalyse"**.
3. Die KI analysiert Ihre offenen Aufgaben + aktiven Deals + Activities-Historie und erzeugt einen kurzen Bericht (~5-15 Sek).

### Schritt 2: Bericht lesen + Prioritaeten setzen

Der Bericht enthaelt typischerweise:
- Top-3 Deals, auf die Sie heute Energie investieren sollten
- Warnungen ueber stagnierende Pipeline-Eintraege
- Vorschlaege fuer naechste Schritte pro Deal

### Schritt 3: Offene Aufgaben durcharbeiten

1. Aufgaben sind in 3 Gruppen sortiert: **Ueberfaellig**, **Heute**, **Spaeter**.
2. Klicken Sie auf eine Aufgabe, um Details zu sehen.
3. Markieren Sie erledigte Aufgaben mit dem Check.

### Schritt 4: Wiedervorlagen pruefen

KI schlaegt automatisch vor, welche Deals heute Aufmerksamkeit brauchen — basierend auf Letztkontakt, Stage-Dauer und Activities-Pattern.

### Schritt 5: KI-Workspace fuer freie Fragen nutzen

Unterhalb der Berichts-Buttons gibt es eine **Eingabezeile** ("Frage stellen ..."). Tippen oder diktieren Sie eine konkrete Frage, z.B.:

- "Welche Deals haben seit 14 Tagen keine Aktivitaet?"
- "Welche Multiplikatoren haben in den letzten 30 Tagen Empfehlungen geliefert?"
- "Wer ist als naechstes mit Steuerberatern dran?"

Klicken Sie **"Senden"** oder druecken Sie Enter. Die KI antwortet mit einer strukturierten Analyse.

**Hinweis:** Die KI laeuft on-click — sie kostet pro Bericht/Frage ein paar Cent (ca. $0.005-0.015). Keine Hintergrund-KI-Kosten.

## Erwartetes Ergebnis

- Sie haben einen klaren Plan fuer Ihren Tag
- Top-3-Prioritaeten sind sichtbar
- Sie wissen, welche Deals heute "warm" sind und welche "kalt"

## Tipps

- **KI-Bericht jeden Morgen einmal** — gibt Ihnen einen 1-Min-Ueberblick uebers Pipeline-Wetter
- **Diktat statt Tippen** — alle Eingabezeilen mit Mikro-Symbol unterstuetzen Voice-Diktat (Whisper)
- **"Workflow bauen"-Button** — wenn Ihnen ein Pattern auffaellt, das die KI loesen koennte ("immer wenn ein Deal in Verloren faellt, lege eine Activity an mit dem Loss-Reason"), klicken Sie diesen Button und beschreiben Sie die Regel in Klartext
- **Drilldown bei Teamlead** — Teamleads koennen die "Mein Tag"-Page eines Members oeffnen (TEAM-Sidebar → Mitglied auswaehlen) und sehen den Tag des Members read-only

## Haeufige Probleme

### "KI-Bericht zeigt nichts"
Pruefen Sie, ob Sie Aktivitaeten + Deals haben. Bei leerer Pipeline gibt die KI eine entsprechende Meldung.

### "Workflow-Modus aktiv — verwende die NL-Eingabe unten"
Sie haben den **Workflow bauen**-Button geklickt. Die normale Eingabezeile ist disabled. Um wieder Fragen zu stellen, klicken Sie auf einen anderen Berichts-Button (z.B. "Tagesanalyse").

### "Wiedervorlagen-Vorschlaege fehlen"
Diese werden nur generiert, wenn Sie aktive Deals + Activities-Historie haben. Bei leerer Pipeline ist die Liste leer.

## Siehe auch

- [KI optimal nutzen](ki-usage.md) — Master-Guide fuer alle KI-Features
- [Pipeline](pipeline.md) — Vertriebssteuerung per Drag&Drop
- [Custom-Reports](custom-reports.md) — eigene Berichts-Vorlagen anlegen
