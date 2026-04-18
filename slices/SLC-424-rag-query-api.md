# SLC-424 — RAG Query API

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-356

## Goal
Kern-Feature der Wissensbasis: Authentifizierter API-Endpoint `/api/knowledge/query` der eine natuerlichsprachliche Frage entgegennimmt, per Embedding + pgvector die relevantesten Chunks findet, Kontext zusammenbaut und via Bedrock Claude Sonnet eine strukturierte Antwort mit Quellenangaben generiert. Scope-Logik (deal/contact/company/all) und Confidence-Level.

## Scope
- `/lib/knowledge/search.ts` — Query embedden, pgvector Similarity Search, Context Assembly
- `/api/knowledge/query` — POST-Endpoint: Auth-Check, Rate-Limiting, Query → Search → LLM → Response
- System-Prompt fuer RAG-Antworten (wie in ARCHITECTURE.md definiert)
- Scope-Logik: deal (Default), contact, company, all — als WHERE-Clause auf metadata JSONB
- Strukturierte Response: `{answer, sources[], confidence}`
- Sources-Anreicherung: Pro Quelle title, date, snippet (erste 150 Zeichen chunk_text), source_url, type aus metadata
- Confidence-Level: high (Top-Chunk similarity >0.7), medium (0.5-0.7), low (<0.5)
- Bedrock-Prompt nutzt bestehenden `bedrockClient` (kein neuer LLM-Client)
- Rate-Limiting: max 10 Queries pro Minute pro User (einfacher In-Memory-Counter)

## Out of Scope
- UI (SLC-425)
- Voice-Input (bestehendes Whisper-Pattern, wird in SLC-425 integriert)
- Multi-Turn-Chat / Gespraechskontext
- Streaming-Response (V4.2 liefert vollstaendige Response)
- Re-Ranking der Chunks (Top-20 von pgvector reicht fuer V4.2)

## Micro-Tasks

### MT-1: Search-Modul — Query Embedding + pgvector Similarity Search
- Goal: Query-Text embedden und relevanteste Chunks aus DB holen
- Files: `cockpit/src/lib/knowledge/search.ts`
- Expected behavior: `searchKnowledge(query, options)` — (1) Query via getEmbeddingProvider().embed(query), (2) SQL: `SELECT id, source_type, source_id, chunk_text, metadata, 1-(embedding <=> $1::vector) AS similarity FROM knowledge_chunks WHERE status='active' AND [scope-filter] ORDER BY embedding <=> $1::vector LIMIT 20`, (3) Scope-Filter: deal → `metadata->>'deal_id' = $dealId`, contact → `metadata->>'contact_id'`, company → `metadata->>'company_id'`, all → kein Filter. Return: Array von {chunk_text, metadata, similarity}.
- Verification: Manueller Test mit Query gegen Backfill-Daten, Top-Ergebnis ist semantisch relevant
- Dependencies: SLC-421 (EmbeddingProvider), SLC-423 (echte Vektoren in DB)

### MT-2: Context Assembly
- Goal: Top-N Chunks + Deal-Metadaten zu einem LLM-Context formatieren
- Files: `cockpit/src/lib/knowledge/search.ts`
- Expected behavior: `assembleContext(chunks, dealContext?)` — (1) Chunks als nummerierte Quellen-Liste: `[1] (Meeting, 12.04.2026) "chunk_text..."`, (2) Optional: Deal-Metadaten (Name, Stage, Kontakt, Firma) als Header, (3) Gesamt-Token-Schaetzung via Heuristik (text.length/4), (4) Wenn >15.000 Tokens: nur Top-10 statt Top-20 Chunks. Return: formatierter Context-String.
- Verification: Output manuell pruefen — lesbar, nummeriert, mit Quelltyp-Angabe
- Dependencies: MT-1

### MT-3: Bedrock RAG-Prompt + Antwortgenerierung
- Goal: System-Prompt + Context + Query an Bedrock Claude Sonnet schicken, strukturierte Antwort parsen
- Files: `cockpit/src/lib/knowledge/search.ts` (oder separates `cockpit/src/lib/ai/bedrock/knowledge-query.ts`)
- Expected behavior: System-Prompt wie in ARCHITECTURE.md (Regeln: nur auf Quellen basieren, Quellen-Nummern nennen, ehrlich wenn nicht beantwortbar, JSON-Output). User-Prompt: Context + Query. Bedrock-Call via bestehenden bedrockClient. Output-Parsing: JSON mit `{answer, sources[{index, type, relevance}], confidence}`. Bei Parse-Fehler: Fallback auf Raw-Text-Antwort ohne Sources.
- Verification: Manueller Test: Frage "Hat Kunde X die Vollmacht unterschrieben?" → Antwort referenziert korrekte Quellen
- Dependencies: MT-2

### MT-4: Confidence-Level-Berechnung
- Goal: Confidence basierend auf Similarity-Scores der Top-Chunks berechnen
- Files: `cockpit/src/lib/knowledge/search.ts`
- Expected behavior: `calculateConfidence(chunks)` — Top-Chunk similarity >0.7 → "high", 0.5-0.7 → "medium", <0.5 → "low". Wenn LLM "low" zurueckgibt, wird LLM-Confidence bevorzugt (LLM kennt den Inhalt besser als Vektor-Distanz allein). Gesamt: max(vector-confidence, llm-confidence).
- Verification: Test mit verschiedenen Queries — offensichtlich relevante Frage → high, vage Frage → medium/low
- Dependencies: MT-1, MT-3

### MT-5: API-Endpoint /api/knowledge/query
- Goal: Authentifizierter POST-Endpoint der die Query-Pipeline orchestriert
- Files: `cockpit/src/app/api/knowledge/query/route.ts`
- Expected behavior: POST mit JSON `{query: string, scope?: "deal"|"contact"|"company"|"all", dealId?: string, contactId?: string, companyId?: string}`. Auth-Check (Supabase session). Rate-Limit: max 10/min pro User (In-Memory Map mit Timestamp-Array, cleanup alle 60s). Pipeline: (1) searchKnowledge(query, scope+ids), (2) assembleContext(chunks, dealContext), (3) Bedrock RAG-Query, (4) Sources anreichern mit title, date, snippet, source_url aus Chunk-Metadata, (5) Response: `{answer, sources[], confidence, queryTimeMs}`.
- Verification: Curl-Test mit Auth-Token, Response hat korrekte Struktur, Latenz <10s
- Dependencies: MT-1, MT-2, MT-3, MT-4

### MT-6: Sources-Anreicherung
- Goal: LLM-Sources (nur index+type) mit lesbaren Metadaten anreichern
- Files: `cockpit/src/app/api/knowledge/query/route.ts` (oder in search.ts)
- Expected behavior: Fuer jede LLM-referenzierte Source den originalen Chunk laden und anreichern: `{index, type, relevance, title, date, snippet (erste 150 Zeichen chunk_text), sourceUrl}`. Type-Icons werden im Frontend zugeordnet (hier nur type-String).
- Verification: Response-Sources haben title, date, snippet — nicht nur index
- Dependencies: MT-5

### MT-7: Build-Verifikation
- Goal: `npm run build` gruen
- Files: keine neuen Dateien
- Expected behavior: Build fehlerfrei
- Verification: `npm run build` exit code 0
- Dependencies: MT-5

## Acceptance Criteria
1. POST /api/knowledge/query mit natuerlichsprachlicher Frage liefert strukturierte Antwort
2. Antwort referenziert konkrete Quellen mit [1], [2] etc.
3. Sources enthalten title, date, snippet, sourceUrl, type
4. Scope-Logik: deal-scoped Query findet nur Chunks mit matching deal_id
5. Scope "all" findet Chunks ueber alle Deals hinweg
6. Confidence-Level korrekt: relevante Frage → high, vage → medium/low
7. Rate-Limiting: 11. Query innerhalb 1 Minute wird mit 429 abgelehnt
8. Latenz <10 Sekunden (Embedding ~50ms + pgvector ~20ms + Bedrock ~3-5s)
9. Auth-Pflicht: Unauthentifizierter Call wird mit 401 abgelehnt
10. `npm run build` gruen

## Dependencies
- SLC-421 (pgvector + EmbeddingProvider)
- SLC-422 (Chunk-Interface fuer Type-Definitions)
- SLC-423 (echte Vektoren in DB fuer realistische Tests)

## QA Focus
- **Deutsch-Qualitaet:** Titan V2 Embeddings mit deutschen Meeting-Transkripten — findet "Vertretungsbefugnis" bei Query "Vollmacht"? Falls nicht: DEC-048 Fallback-Entscheidung (Cohere)
- **Scope-Isolation:** Deal-scoped Query darf KEINE Chunks aus anderen Deals zurueckliefern
- **Halluzinations-Check:** LLM erfindet keine Fakten die nicht in den Quellen stehen
- **Quellen-Korrektheit:** Referenzierte Quellen-Nummern matchen tatsaechlich die angegebenen Chunks
- **Latenz:** Gesamte Pipeline <10s, Embedding <200ms, pgvector <100ms, Bedrock <8s
- **Kosten:** Ein Query kostet ~$0.03 (10k Tokens Context), nicht ~$0.30 (100k+ Tokens)
- **Rate-Limiting:** Burst von 15 Queries → letzte 5 werden rejected

## Geschaetzter Aufwand
1.5-2 Tage (Search + Context + Prompt + API + Edge-Cases)
