# FEAT-604 — KPI-Snapshots & Trend-Engine

## Purpose

Automatische periodische Speicherung der Kern-KPIs fuer historische Vergleiche und Trendanalyse. Ohne Snapshots gibt es keinen Trend — nur den aktuellen Moment.

## Scope

### KPIs die gesnapshot werden
- Gesamtumsatz (Won Deals) im Zeitraum
- Deal-Anzahl (Won) im Zeitraum
- Abschlussquote (Won / Total Closed) im Zeitraum
- Pipeline-Wert (offene Deals, gewichtet)
- Pipeline-Wert (offene Deals, ungewichtet)
- Durchschnittlicher Deal-Wert
- Aktivitaetszahl (Meetings, Anrufe, E-Mails)
- Pro Produkt: Umsatz + Deal-Count (wenn Produkt-Zuordnung vorhanden)

### Snapshot-Frequenz
- Taeglich (Cron, analog zu bestehenden Cron-Jobs)
- Aggregation: woechentlich, monatlich (berechnet aus Tages-Snapshots)

### Funktionen
- Automatischer taeglicher Snapshot (Cron)
- Vergleichsansicht: aktuelle Periode vs. Vorperiode
- Trend-Linie (letzte N Tage/Wochen/Monate)
- API fuer Performance-Cockpit (FEAT-603)

## Dependencies

- Bestehende Deals-Tabelle
- Bestehende Activities-Tabelle
- Bestehende Meetings-Tabelle
- FEAT-601 (Produkt-Stammdaten) — fuer Pro-Produkt-KPIs
- Bestehende Cron-Infrastruktur (Coolify)

## Out of Scope

- Echtzeit-KPI-Berechnung (bleibt on-demand, kein Materialized View)
- KPI-Alerting (Benachrichtigung bei KPI-Einbruch)
- Externe KPI-Dashboards / BI-Export
- Auto-Cleanup aelterer Snapshots

## Acceptance Criteria

1. Taeglicher Cron erstellt KPI-Snapshots automatisch
2. Snapshots sind idempotent (doppelter Run am selben Tag ueberschreibt, kein Duplikat)
3. Woechentliche und monatliche Aggregation funktioniert
4. Trend-Daten sind im Performance-Cockpit abrufbar
5. Snapshot-History ist unbegrenzt (kein Auto-Cleanup in V6)
6. Pro-Produkt-KPIs werden gesnapshot wenn Produkt-Zuordnung existiert
