# SLC-432 — Signal-Extraktion-Modul

## Slice Info
- **Feature:** FEAT-412
- **Version:** V4.3
- **Priority:** High
- **Estimated Effort:** 1-1.5 Tage
- **Dependencies:** SLC-431 (Schema + Types)

## Goal

Kern-Logik fuer Signal-Extraktion: nimmt Text (Meeting-Summary oder E-Mail-Body) + Deal-Kontext, ruft Bedrock Claude, parst strukturierte Signal-Vorschlaege via Zod-Schema, schreibt in ai_action_queue. Kein UI, kein Cron — nur das Modul.

## Scope

- `/lib/ai/signals/` Verzeichnis mit extractor.ts, prompts.ts
- Zod-Schema fuer Signal-Extraktion-Response
- Bedrock-Call mit Deal-Kontext + optionalem RAG-Kontext
- Confidence-Schwelle (ENV: AI_SIGNAL_MIN_CONFIDENCE)
- Queue-Eintraege mit proposed_changes JSONB

## Out of Scope

- Cron-Integration (SLC-433)
- Approve/Reject-Flow (SLC-434)
- UI (SLC-435, SLC-436)

## Acceptance Criteria

1. extractor.ts: extractSignals(sourceText, dealContext, sourceType, sourceId) -> SignalResult[]
2. Zod-Schema validiert LLM-Response (type, field, current_value, proposed_value, confidence, reasoning)
3. Signale mit confidence < AI_SIGNAL_MIN_CONFIDENCE werden gefiltert
4. Valide Signale werden als ai_action_queue-Eintraege mit korrekten Types geschrieben
5. RAG-Kontext wird optional einbezogen (wenn knowledge_chunks fuer Deal existieren)
6. Build gruen

## Micro-Tasks

### MT-1: Signal-Prompts + Zod-Schema
- Goal: Prompt-Template und Response-Schema fuer Signal-Extraktion
- Files: `cockpit/src/lib/ai/signals/prompts.ts`
- Expected behavior: System-Prompt beschreibt Signal-Typen (stage_suggestion, value_update, tag_addition, priority_change), Zod-Schema erzwingt Struktur
- Verification: Schema-Validierung mit Test-Daten
- Dependencies: none

### MT-2: Extractor-Kern-Logik
- Goal: Hauptfunktion die Text + Deal-Kontext nimmt und Signale extrahiert
- Files: `cockpit/src/lib/ai/signals/extractor.ts`
- Expected behavior: extractSignals() ruft Bedrock mit Prompt, parst Response via Zod, filtert nach Confidence-Schwelle, gibt typisierte Signale zurueck
- Verification: `npx tsc --noEmit`
- Dependencies: MT-1, SLC-431/MT-3

### MT-3: RAG-Kontext-Integration
- Goal: Optionaler RAG-Lookup fuer bessere Signal-Qualitaet
- Files: `cockpit/src/lib/ai/signals/extractor.ts`
- Expected behavior: Wenn knowledge_chunks fuer Deal existieren, werden Top-5 Chunks als zusaetzlicher Kontext an den Prompt angehaengt. Kein Blocker wenn keine Chunks vorhanden.
- Verification: Funktioniert ohne Chunks (Graceful Fallback)
- Dependencies: MT-2

### MT-4: Queue-Schreiber
- Goal: Valide Signale in ai_action_queue schreiben
- Files: `cockpit/src/lib/ai/signals/extractor.ts`, `cockpit/src/lib/ai/action-queue.ts`
- Expected behavior: Pro Signal ein Queue-Eintrag mit source=signal_meeting/signal_email, target_entity_type/id, proposed_changes JSONB, confidence, reasoning in payload
- Verification: `npx tsc --noEmit`, Queue-Eintraege korrekt typisiert
- Dependencies: MT-2, SLC-431/MT-4

### MT-5: Index + Re-Export
- Goal: Sauberer Export des Signal-Moduls
- Files: `cockpit/src/lib/ai/signals/index.ts`
- Expected behavior: Re-exportiert extractSignals und relevante Types
- Verification: Import aus anderen Dateien funktioniert
- Dependencies: MT-2

## QA Focus

- Prompt produziert sinnvolle Signale bei typischen Meeting-Summaries
- Confidence-Filter funktioniert korrekt
- Queue-Eintraege haben korrektes JSONB-Format
- Kein Crash bei leeren Inputs oder fehlenden Deal-Daten
