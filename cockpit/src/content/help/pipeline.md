# Pipeline — Vertriebs-Steuerung per Drag&Drop

> Guide 2 von 12. **Wer:** Alle Rollen. **Dauer:** ~10 Min.

## Ziel

Sie wissen, wie Sie Deals durch die Pipeline ziehen, welche Stages was bedeuten, und wie die KI-Pflichtfelder-Modal Sie bei Stage-Wechseln unterstuetzt.

## Voraussetzungen

- Mindestens ein angelegter Deal in der Pipeline

## Aufbau der Seite

Bei Klick auf "Pipeline" in der Sidebar (Section ARBEITSBEREICHE) sehen Sie:

- **Pipeline-Switcher** oben — Wechsel zwischen den 2 Boards:
  - **Opportunity-Pipeline** (Standard) — klassischer Lead → Won/Lost-Flow
  - **Multiplikator-Pipeline** — Empfehlungs-Beziehungen aufbauen
- **Stage-Spalten** (typisch 6-8 Stages pro Board, konfigurierbar)
- **Filter-Bar** ueber den Spalten — nach Owner, Kampagne, Stage-Alter etc.
- **KPI-Cards** oben — Pipeline-Wert + Anzahl Deals + Won/Lost-Quote

## Schritte: Deal anlegen + bewegen

### Schritt 1: Deal anlegen

1. Klicken Sie **"+ Neuer Deal"** oben rechts (oder in einer Spalte).
2. Tragen Sie Pflichtfelder ein: Titel, verknuepfter Kontakt, verknuepfte Firma, Wert.
3. Speichern.

### Schritt 2: Deal in naechste Stage ziehen

1. Halten Sie die Deal-Karte gedrueckt und ziehen Sie sie in die naechste Spalte.
2. Lassen Sie los.

### Schritt 3: Pflichtfelder-Modal beachten (NEU ab V8)

Wenn Sie einen Deal in eine Stage mit Pflichtfeldern ziehen, oeffnet sich automatisch ein **Modal** zum Ausfuellen:

| Stage | Pflichtfeld |
|---|---|
| Angebot vorbereitet | `value` (Deal-Wert in EUR) |
| Angebot offen | `value` |
| Verhandlung / Einwände | `value` + `contact_id` |
| Gewonnen | `value` |
| Verloren | `won_lost_reason` (Freitext) |

Ohne ausgefuellte Pflichtfelder ist Stage-Wechsel blockiert. Vorteil: keine "halben" Deals in der Pipeline.

### Schritt 4: KI-Verlustgrund-Vorschlag (bei "Verloren")

Beim Drag auf **"Verloren"** schlaegt die KI **1-3 Verlustgrund-Optionen** vor, basierend auf:
- Letzte 10 Activities (Notizen, Anrufe, Meeting-Outcomes)
- Letzte 3 E-Mail-Threads (Snippets)

Beispiele:
> 1. "Budget-Konflikt — aus Meeting vom 18.05. (Buchhaltung-Veto)"
> 2. "Kein Entscheider erreicht — aus E-Mail-Thread mit Frau Schneider"
> 3. "Wettbewerber gewonnen — aus Anruf-Notiz 14.05."

Sie waehlen einen Vorschlag oder schreiben eigenen Text. **"KI-Vorschlag-Hint"** zeigt die Quelle der Vorschlaege.

### Schritt 5: Filter nutzen

Filter-Bar oben:
- **Owner** — nur eigene Deals
- **Kampagne** — Deals einer Kampagne
- **Stage-Alter** — z.B. "Deals laenger als 14 Tage in dieser Stage"
- **Spezial-Filter** "Stagnierend" — Deals ohne Activity seit X Tagen

Filter-State wird in der URL gespeichert, sodass Sie Filter-Konfigurationen bookmarken koennen.

## Erwartetes Ergebnis

- Sie koennen Deals fluessig per Drag&Drop bewegen
- Pflichtfelder-Modal erscheint, wenn noetig
- Bei Verloren-Drag bekommen Sie KI-Verlustgrund-Vorschlaege
- Pipeline-KPIs spiegeln Ihre aktive Pipeline wider

## Tipps

- **Stages konfigurieren** in `/settings/pipelines` — Sie koennen pro Pipeline (Opportunity / Multiplikator) eigene Stages anlegen
- **Mobile**: Drag&Drop funktioniert auch auf Mobile mit Tap-Hold-Move-Geste
- **Activity-History** nutzen — die KI-Verlustgrund-Vorschlaege sind nur so gut wie Ihre Notizen. Tagen Sie kurze Notizen ein nach jedem Call/Meeting

## Haeufige Probleme

### "Modal oeffnet sich nicht, aber Stage-Wechsel ist blockiert"
Pruefen Sie ob der Browser PopUps blockiert. Modal ist normaler React-Dialog, sollte immer rendern.

### "KI-Verlustgrund-Vorschlag-Box ist leer"
Bei sehr wenigen Activities (<2) + 0 E-Mails kann die KI keinen aussagekraeftigen Vorschlag liefern. Das ist die "skipped_empty_context"-Heuristik (Cost-Sparen).

### "Drag&Drop friert"
Browser-Tab refresh. Bei wiederholtem Problem: Browser-Console (F12) auf Errors pruefen + Support kontaktieren.

### "Deal verschwindet nach Drag"
Bei Wechsel auf eine Stage, die durch Filter ausgeblendet ist, "verschwindet" der Deal optisch. Filter zuruecksetzen oder Filter so anpassen dass der Deal sichtbar wird.

## Siehe auch

- [Deal-Detail](deal-detail.md) — was sehen Sie nach Klick auf eine Deal-Karte
- [Mein Tag](mein-tag.md) — Tagesplanung mit Pipeline-Risiko-Bericht
- [KI optimal nutzen](ki-usage.md) — wie der KI-Verlustgrund-Vorschlag funktioniert
