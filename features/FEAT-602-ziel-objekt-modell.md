# FEAT-602 — Ziel-Objekt-Modell

## Purpose

Datenmodell und Verwaltungsoberflaeche fuer persoenliche Vertriebsziele. Ermoeglicht das Setzen und Importieren von Soll-Vorgaben (Umsatz, Deal-Anzahl, Abschlussquote) pro Zeitraum und optional pro Produkt.

## Scope

### Zieltypen
- Umsatz (EUR) — gesamt oder pro Produkt
- Deal-Anzahl — gesamt oder pro Produkt
- Abschlussquote (%) — Won-Deals / Gesamt-Deals im Zeitraum

### Zeitraeume
- Monat
- Quartal
- Jahr

### Funktionen
- Ziele manuell anlegen, bearbeiten, stornieren
- Ziele per CSV importieren (definiertes Template)
- Ziel-Uebersicht (alle Ziele eines Zeitraums)
- Ziel-Fortschritt automatisch berechnet aus Pipeline-Daten

### CSV-Import-Template

```csv
type,period,period_start,target_value,product_name
revenue,year,2026-01-01,500000,
revenue,year,2026-01-01,200000,Blueprint Classic
revenue,year,2026-01-01,150000,Blueprint Premium
deal_count,quarter,2026-04-01,15,
win_rate,year,2026-01-01,30,
```

- Leere `product_name` = Gesamtziel
- `product_name` muss einem existierenden Produkt entsprechen (Fehler bei Nicht-Match)

## Dependencies

- FEAT-601 (Produkt-Stammdaten) — fuer produktspezifische Ziele
- Bestehende Deals-Tabelle (Ist-Berechnung)
- Bestehende Pipeline-Stages mit Probability (Prognose)

## Out of Scope

- Budgetplanung / Kostenrechnung
- Team-Ziele / Aggregation (V7)
- Automatische Zielvorschlaege durch KI
- OKR-Framework

## Acceptance Criteria

1. Ziele koennen pro Typ, Zeitraum und optional pro Produkt angelegt werden
2. Ziel-Fortschritt wird automatisch aus bestehenden Pipeline-Daten berechnet
3. Import aus CSV mit definiertem Template funktioniert
4. Fehlerhafte Import-Zeilen werden gemeldet, nicht still verschluckt
5. Ziele koennen storniert werden, ohne historische Daten zu verlieren
6. Ziel-Quelle (manuell vs. importiert) ist sichtbar
