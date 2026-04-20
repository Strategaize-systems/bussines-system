# SLC-608 — Jahresziele auf Quartal/Monat runterbrechen

## Slice Info
- Feature: FEAT-602, FEAT-603
- Priority: High
- Estimated Effort: 0.5 Tage
- Dependencies: SLC-603 (Ziel-CRUD)

## Goal

Wenn ein Jahresziel existiert, sollen auf dem Performance-Cockpit auch bei Quartal- und Monat-Toggle sinnvolle Werte angezeigt werden — abgeleitet aus dem Jahresziel (gleichmaessig verteilt).

## Scope

- getGoalsWithProgress erweitern: wenn period=month oder quarter und kein explizites Ziel existiert, aber ein Jahresziel vorhanden ist → anteiligen Sollwert berechnen
- Keine neuen DB-Tabellen, keine neuen Ziele in der DB — rein berechnete Ableitung
- Performance-Cockpit zeigt abgeleitete Ziele mit Kennzeichnung

## Out of Scope

- Manuelle Quartals-/Monatsziele (die kann der User weiterhin selbst anlegen)
- Nicht-lineare Verteilung (saisonale Gewichtung)

## Acceptance Criteria

1. Bei Monat-Toggle: Jahresziel / 12 als Monatsziel angezeigt
2. Bei Quartal-Toggle: Jahresziel / 4 als Quartalsziel angezeigt
3. IST-Berechnung nutzt den korrekten Zeitraum (aktueller Monat/Quartal)
4. Abgeleitete Ziele sind visuell erkennbar (z.B. "abgeleitet aus Jahresziel")
5. Wenn ein explizites Monatsziel existiert, hat es Vorrang
6. npm run build gruen
