# FEAT-412 — Automatische Signal-Extraktion

## Purpose

KI analysiert Meeting-Transkripte und E-Mails automatisch und extrahiert vorgeschlagene Property-Aenderungen fuer Deals. Alle Vorschlaege landen in der Insight-Review-Queue (FEAT-402) — nie direkt auf dem Entity.

## Problem

Meeting-Summaries (V4.1) und E-Mail-Klassifikation (V4) erzeugen bereits strukturierte KI-Outputs. Aber die Erkennung von Handlungsbedarf (Deal sollte Stage wechseln, Wert wurde erwaehnt, Wettbewerber aufgetaucht) passiert bisher manuell. Der User muss den Summary lesen und selbst entscheiden, ob sich etwas am Deal aendern sollte. Die KI kann das automatisch erkennen und vorschlagen.

## Signal-Typen

| Signal-Typ | Beispiel | Quelle |
|---|---|---|
| stage_suggestion | "Deal sollte in 'Verhandlung' ruecken — Angebot wurde besprochen" | Meeting |
| value_update | "Kunde spricht von 75k Projektvolumen" | Meeting, E-Mail |
| tag_addition | "Wettbewerber ABC erwaehnt → Tag 'Wettbewerb: ABC'" | Meeting, E-Mail |
| priority_change | "Deadline Q3 erwaehnt → Prioritaet hochsetzen" | E-Mail |

## Scope

### In Scope
- Meeting-Signal-Extraktion: LLM-Call nach Meeting-Summary → extrahiert Signale
- E-Mail-Signal-Extraktion: LLM-Call nach Gatekeeper-Klassifikation → extrahiert Signale (nur bei classification anfrage/antwort)
- Signal-Modul in /lib/ai/signals/ mit Adapter-Pattern
- RAG-Kontext: Embedding-Lookup liefert Deal-Historie fuer bessere Signal-Qualitaet
- Confidence-Score pro Signal (LLM-Output)
- Integration in bestehende Cron-Jobs (meeting-summary, classify)
- Manueller Trigger: "Signale extrahieren" Button im Deal-Workspace
- Alle Signale → ai_action_queue (FEAT-402)

### Out of Scope
- Signal-Extraktion aus Dokumenten (V5)
- Cross-Deal-Signale (spaeter)
- Signal-Learning aus Approve/Reject-Entscheidungen (spaeter)
- Kontakt-Property-Aenderungen (spaeter, nach Deal-Baseline)

## Acceptance Criteria
1. Nach Meeting-Summary erscheinen relevante Signal-Vorschlaege in der Queue
2. Nach relevanter E-Mail-Klassifikation erscheinen Signal-Vorschlaege in der Queue
3. Manueller Trigger im Deal-Workspace erzeugt Signale on-demand
4. Jeder Vorschlag hat: Signal-Typ, Confidence, Reasoning, Source-Link
5. Source-Link fuehrt zum Meeting oder zur E-Mail die das Signal ausgeloest hat
6. Signale landen NUR in ai_action_queue, nie direkt auf dem Entity
7. RAG-Kontext wird fuer Signal-Extraktion verwendet (wenn Chunks vorhanden)
8. Bestehende Meeting-Summary- und Classify-Pipelines funktionieren unveraendert

## Dependencies
- FEAT-402 Insight-Review-Queue (Ziel fuer alle Signale)
- FEAT-404 Call Intelligence (Meeting-Summary als Signal-Quelle)
- FEAT-408 KI-Gatekeeper (E-Mail-Klassifikation als Signal-Quelle)
- FEAT-401 Wissensbasis (RAG-Kontext fuer bessere Signale)

## Version
V4.3
