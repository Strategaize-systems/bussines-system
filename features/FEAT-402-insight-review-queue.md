# FEAT-402 — Insight-Review-Queue

## Purpose

Unified Queue fuer alle schreibenden KI-Aenderungen an Deal- und Kontakt-Properties. User reviewt, genehmigt oder lehnt ab. Informative KI-Outputs (Summaries, Insights, Analysen) ueberspringen die Queue und bleiben direkt sichtbar.

## Problem

V4.1 (Meeting Intelligence) und V4.2 (Wissensbasis) erzeugen KI-Outputs, die bisher rein informativ sind. Der naechste Schritt — KI schlaegt konkrete Property-Aenderungen vor (Stage-Wechsel, Wert-Updates, Tags) — erfordert eine kontrollierte Freigabeschicht. Ohne Queue wuerden KI-Aenderungen direkt auf Geschaeftsdaten angewandt, was bei Halluzinationen zu falschen Deal-Werten, falschen Stages oder falschen Tags fuehrt.

## Key Decision

DEC-037: Queue NUR fuer schreibende KI-Aktionen. Informative Outputs (Summaries, Timeline-Eintraege) gehen direkt durch.
DEC-049: Bestehende ai_action_queue erweitern statt neue Tabelle. Einheitliches Pattern fuer Followups, Gatekeeper und Property-Aenderungen.

## Scope

### In Scope
- Erweiterung ai_action_queue: neue Aktionstypen (property_change, status_change, tag_change, value_change)
- Neue Felder: target_entity_type, target_entity_id, proposed_changes JSONB, confidence
- Unified Freigabe-UI in Mein Tag (alle Queue-Typen in einer Ansicht)
- Einzelne Freigabe (Approve / Reject mit optionalem Grund)
- Batch-Approval (mehrere Vorschlaege gleichzeitig genehmigen)
- Confidence-Anzeige (hoch/mittel/niedrig)
- Reasoning-Anzeige (warum schlaegt die KI das vor?)
- Source-Verlinkung (welches Meeting / welche E-Mail?)
- KI-Badge auf angewandten Aenderungen
- Auto-Expire nach 7 Tagen
- Audit-Trail (ai_feedback erweitert)

### Out of Scope
- Auto-Approval-Rules (kein Auto-Approve in V4.3)
- Push-Notifications bei neuen Queue-Items (spaeter)
- Cross-Entity-Vorschlaege (z.B. "Firma X hat 3 Deals → zusammenfuehren")

## Acceptance Criteria
1. Queue zeigt alle offenen KI-Vorschlaege gruppiert nach Typ
2. Approve wendet Aenderung sofort auf Entity an + setzt KI-Badge
3. Reject verwirft Aenderung + erstellt ai_feedback-Eintrag
4. Batch-Approve funktioniert fuer mehrere markierte Items
5. Confidence + Reasoning + Source sind bei jedem Item sichtbar
6. Expired Items (>7 Tage) werden automatisch aus aktiver Liste entfernt
7. Bestehende Followup- und Gatekeeper-Queue funktioniert unveraendert
8. Audit-Trail dokumentiert alle Entscheidungen

## Dependencies
- ai_action_queue (existiert seit V4)
- ai_feedback (existiert seit V4)
- FEAT-412 liefert die ersten Queue-Items (ohne Signal-Extraktion ist die Queue leer)

## Version
V4.3
