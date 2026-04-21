# FEAT-501 — Cadences / Sequences

## Summary
Strukturierte Follow-up-Ketten fuer Deals und Kontakte. Automatische Ausfuehrung von E-Mail-, Aufgaben- und Warteschritten.

## Problem
Follow-ups werden manuell geplant und ausgefuehrt. Bei steigender Deal-Anzahl gehen Nachfass-Aktionen verloren.

## Solution
Cadence-Templates mit definierbaren Schritten. Deals/Kontakte werden eingebucht, Cron fuehrt faellige Schritte automatisch aus. Abbruch bei Antwort oder Deal-Status-Aenderung.

## Acceptance Criteria
- AC1: Cadence mit mindestens 3 Schritten (E-Mail, Wartezeit, Aufgabe) erstellen
- AC2: Deal in Cadence einbuchen → erster Schritt wird automatisch ausgefuehrt
- AC3: Nach Wartezeit wird naechster Schritt automatisch ausgefuehrt
- AC4: Antwort-E-Mail stoppt Cadence automatisch (IMAP-Match)
- AC5: E-Mail-Schritte nutzen Templates mit Variablen
- AC6: Enrollment-Status sichtbar auf Deal-/Kontakt-Workspace
- AC7: Cadence pausieren/stoppen moeglich

## Out of Scope
- Multi-Channel (LinkedIn, SMS)
- Generische Wenn-Dann-Workflows
- A/B-Testing von Cadence-Varianten
