# FEAT-403 — Management-Cockpit LLM-Ausbau

## Purpose
Erweiterung des Dashboard KI-Cockpits um tiefere LLM-gestuetzte Analysen: Pipeline-Trends, Multiplikator-Effektivitaet, natuerlichsprachliche Abfragen und Vergleichs-Analysen.

## Feature Type
Backend + Frontend

## Version
V4

## Dependencies
- Bestehender Bedrock LLM-Layer (FEAT-305)
- Bestehendes Dashboard mit KI-Cockpit (V2.2+)

## Funktionen

### Vordefinierte KI-Analysen (mindestens 5)
1. **Pipeline-Health**: "Wie gesund ist meine Pipeline? Wo stagnieren Deals?"
2. **Multiplikator-Ranking**: "Welche Multiplikatoren bringen die besten Leads?"
3. **Forecast-Verfeinerung**: "Wie realistisch ist mein aktueller Forecast?"
4. **Win/Loss-Trends**: "Warum verliere ich Deals? Aendert sich das Muster?"
5. **Aktivitaets-Analyse**: "Wo investiere ich meine Zeit? Stimmt das Verhaeltnis?"

### Natuerlichsprachliche Freitext-Abfrage
- Input: Freitext-Frage im KI-Cockpit
- Verarbeitung: Bedrock analysiert Frage, generiert SQL/Supabase-Query, liefert Antwort
- Output: Natuerlichsprachliche Antwort + Datenquelle sichtbar
- Beispiele: "Wie viele Deals habe ich diesen Monat gewonnen?", "Wer ist mein aktivster Multiplikator?"

### Trend-Erkennung
- "Deal-Velocity sinkt seit 2 Wochen"
- "Multiplikator X bringt bessere Leads als Y"
- "Conversion-Rate in Stage 5→6 hat sich verbessert"

### Vergleichs-Analysen
- Zeitraum vs. Zeitraum (dieser Monat vs. letzter Monat)
- Pipeline vs. Pipeline (Multiplikatoren vs. Endkunden)
- Multiplikator vs. Multiplikator

## Kostenkontrolle
- Alle Abfragen on-click (nie auto-load)
- Token-Tracking pro Abfrage
- Ergebnis-Caching fuer wiederholte Abfragen (TTL: 1 Stunde)

## Nicht V4
- Automatische Alerts bei Trend-Aenderungen
- Export als PDF/Report
- Scheduled Reports (woechentlich/monatlich)
- Natural Language to Action (nur read-only Analyse)

## Akzeptanzkriterien
1. Mindestens 5 vordefinierte KI-Analyse-Abfragen funktionieren
2. Natuerlichsprachliche Freitext-Abfrage liefert korrekte Ergebnisse
3. Ergebnisse sind nachvollziehbar (Datenquelle sichtbar)
4. Abfragen laufen on-click (Kostenkontrolle)
5. Vergleichs-Analysen zeigen Zeitraum-Differenzen

## Risiken
- LLM-generierte SQL-Queries koennen falsche Ergebnisse liefern → Ergebnis-Validierung + Datenquelle anzeigen
- Kosten bei haeufiger Nutzung → Caching + Token-Tracking
- Natuerlichsprachliche Mehrdeutigkeit → Rueckfrage bei unklaren Abfragen
