# SLC-314 — Pipeline KI-Suche + Voice

## Slice Info
- Feature: FEAT-301, FEAT-305
- Version: V3.1
- Priority: High
- Dependencies: SLC-313 (on-click Pattern)
- Type: Frontend + API

## Goal
Pipeline-Seiten (Unternehmer, Leads, Multiplikatoren) um KI-Suche mit Voice-Input erweitern. Natuerlichsprachliche Deal-Suche ermoeglicht z.B. "Zeig mir alle Deals ueber 50k in Phase Angebot".

## Scope

### Included
1. KI-Suchleiste auf allen 3 Pipeline-Seiten
2. Sparkles-Icon + Mikrofon-Button (wie auf anderen Seiten)
3. Natuerlichsprachliche Suche via Bedrock (Text → SQL-Filter oder strukturierter Filter)
4. Voice-Input via bestehende Whisper-Integration
5. Ergebnisse filtern die Pipeline-Ansicht (Kanban-Cards)

### Excluded
- Neue Pipeline-Views (Liste/Tabelle = BL-128, deferred)
- Semantische Suche ueber Notizen/Gespraeche (V4)
- Cross-Pipeline-Suche (jede Pipeline separat)

## Backlog Items
- BL-321: Pipeline-Seiten KI-Suche + Voice

## Acceptance Criteria
1. Alle 3 Pipeline-Seiten haben eine Suchleiste mit Sparkles + Mikrofon-Icon
2. Text-Eingabe sendet Query an Bedrock zur Interpretation
3. Bedrock gibt strukturierten Filter zurueck (Stage, Wert, Status, etc.)
4. Pipeline filtert Kanban-Cards basierend auf KI-Ergebnis
5. Voice-Input transkribiert via Whisper und fuellt Suchfeld
6. "Alle zeigen" / Reset-Button setzt Filter zurueck
7. On-click Pattern (kein auto-search, nur bei Enter/Klick)

## Micro-Tasks

### MT-1: KI-Search Prompt-Template
- Goal: Bedrock-Prompt fuer Deal-Suche erstellen
- Files: `lib/ai/prompts/pipeline-search.ts` (neu)
- Expected behavior: Input = natuerlichsprachliche Query + Pipeline-Kontext. Output = strukturierter Filter {stage?, minValue?, maxValue?, status?, contactName?, companyName?}
- Verification: Unit-Test — verschiedene Queries → erwartete Filter-Objekte
- Dependencies: keine

### MT-2: API-Route fuer Pipeline-Search
- Goal: API-Endpoint der Query an Bedrock sendet und Filter zurueckgibt
- Files: `app/api/ai/pipeline-search/route.ts` (neu)
- Expected behavior: POST mit {query, pipelineId} → Bedrock-Call → strukturierter Filter als JSON
- Verification: curl/fetch Test — Query senden, Filter-JSON zurueck
- Dependencies: MT-1

### MT-3: Such-Komponente fuer Pipeline
- Goal: Wiederverwendbare PipelineSearchBar mit Text + Voice
- Files: `components/pipeline/pipeline-search-bar.tsx` (neu)
- Expected behavior: Input-Feld + Sparkles-Button + Mikrofon. On-Submit: API-Call → Filter anwenden.
- Verification: Browser-Check — Suche eingeben, Pipeline filtert
- Dependencies: MT-2

### MT-4: Integration in alle 3 Pipeline-Seiten
- Goal: SearchBar in Unternehmer-, Lead- und Multiplikatoren-Pipeline einbauen
- Files: Pipeline-Seiten (bestehend, 3 Dateien)
- Expected behavior: Suchleiste sichtbar, Filter wirkt auf Kanban-Cards
- Verification: Browser-Check — alle 3 Pipelines testen
- Dependencies: MT-3

## Technical Notes
- Bestehender Whisper-Flow: Mikrofon → Recording → POST /api/transcribe → Text
- Bedrock-Prompt muss Pipeline-Stages als Kontext bekommen (Stage-Namen variieren pro Pipeline)
- Filter-Anwendung: Client-seitig auf bereits geladene Deals oder Server-seitig via Supabase-Query
- Client-seitig bevorzugt (Deals sind bereits geladen im Kanban), Server-seitig als Fallback fuer grosse Datenmengen
