# SLC-421 — pgvector + Schema + Embedding-Adapter

## Slice Info
- Feature: FEAT-401 (Wissensbasis Cross-Source)
- Priority: Blocker
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-352 (pgvector+Schema), BL-353 (Adapter)

## Goal
Fundament fuer die gesamte RAG-Pipeline legen: pgvector Extension aktivieren, knowledge_chunks Tabelle mit HNSW-Index anlegen (MIG-014), EmbeddingProvider-Interface + TitanProvider + Factory implementieren (DEC-047), ENV-Variablen in Coolify konfigurieren, IAM-Policy fuer Titan Embeddings V2 verifizieren. Nach diesem Slice koennen Chunks embedded und gespeichert werden.

## Scope
- MIG-014: `CREATE EXTENSION IF NOT EXISTS vector` + knowledge_chunks Tabelle + HNSW-Index + Lookup-Indizes + Unique Constraint + RLS (exakt wie in ARCHITECTURE.md V4.2 Data Model)
- SQL-Migrationsdatei: `sql/migrations/014_v42_pgvector_knowledge_chunks.sql`
- EmbeddingProvider Interface: `/lib/ai/embeddings/provider.ts`
- TitanEmbeddingProvider: `/lib/ai/embeddings/titan.ts` (Bedrock eu-central-1, DEC-048: 1024 Dimensionen)
- Factory: `/lib/ai/embeddings/factory.ts` (ENV-Switch titan/cohere)
- Re-Export: `/lib/ai/embeddings/index.ts`
- ENV-Variablen: `EMBEDDING_PROVIDER=titan`, `EMBEDDING_DIMENSIONS=1024`, `EMBEDDING_REGION=eu-central-1` in Coolify
- IAM-Policy: `bedrock:InvokeModel` fuer `amazon.titan-embed-text-v2:0` pruefen
- Smoke-Test: Ein einzelner Embedding-Call mit echtem Text, Vektor in DB speichern und per Similarity Search zurueckfinden
- npm-Dependencies: keine neuen (aws-sdk bereits vorhanden)

## Out of Scope
- Chunking-Logik (SLC-422)
- Backfill bestehender Daten (SLC-423)
- Query-API (SLC-424)
- UI (SLC-425)
- Auto-Embedding-Trigger (SLC-426)
- Cohere-Provider-Implementierung (Platzhalter-Import reicht)

## Micro-Tasks

### MT-1: SQL-Migrationsdatei erstellen
- Goal: MIG-014 als ausfuehrbare SQL-Datei im Repo ablegen
- Files: `cockpit/sql/migrations/014_v42_pgvector_knowledge_chunks.sql`
- Expected behavior: CREATE EXTENSION vector, CREATE TABLE knowledge_chunks mit allen Spalten (id, source_type, source_id, chunk_index, chunk_text, embedding vector(1024), metadata JSONB, embedding_model, status, created_at, updated_at), HNSW-Index, Lookup-Indizes, Unique Constraint, RLS + Grants — exakt wie ARCHITECTURE.md Zeile 2166-2206
- Verification: SQL-Syntax-Review, Datei existiert
- Dependencies: none

### MT-2: Migration auf Hetzner ausfuehren
- Goal: pgvector Extension + knowledge_chunks Tabelle auf Production-DB anlegen
- Files: keine Code-Dateien, DB-Operation
- Expected behavior: `\d knowledge_chunks` zeigt Tabelle mit allen Spalten, `\dx` zeigt vector Extension
- Verification: `docker exec ... psql -U postgres -d postgres -c "\d knowledge_chunks"` + `\dx vector`
- Dependencies: MT-1

### MT-3: EmbeddingProvider Interface
- Goal: TypeScript-Interface definieren das alle Embedding-Provider implementieren muessen
- Files: `cockpit/src/lib/ai/embeddings/provider.ts`
- Expected behavior: Exportiert `EmbeddingProvider` Interface (embed, embedBatch, dimensions, modelId) + `EmbeddingProviderConfig` Interface (region, dimensions)
- Verification: TypeScript kompiliert fehlerfrei
- Dependencies: none

### MT-4: TitanEmbeddingProvider implementieren
- Goal: Amazon Titan Text Embeddings V2 via Bedrock eu-central-1 anbinden
- Files: `cockpit/src/lib/ai/embeddings/titan.ts`
- Expected behavior: Klasse implementiert EmbeddingProvider, nutzt BedrockRuntimeClient mit InvokeModelCommand, Model-ID `amazon.titan-embed-text-v2:0`, 1024 Dimensionen default, normalize=true, embedBatch als sequentielle Calls
- Verification: TypeScript kompiliert, manueller Test mit echtem Bedrock-Call in MT-6
- Dependencies: MT-3

### MT-5: Factory + Re-Export
- Goal: Factory-Funktion die basierend auf ENV den richtigen Provider liefert
- Files: `cockpit/src/lib/ai/embeddings/factory.ts`, `cockpit/src/lib/ai/embeddings/index.ts`
- Expected behavior: `getEmbeddingProvider()` liest EMBEDDING_PROVIDER ENV, liefert TitanEmbeddingProvider (default). Index re-exportiert alles. Cohere-Case wirft vorerst Error ("Cohere provider not yet implemented").
- Verification: TypeScript kompiliert, Import aus `@/lib/ai/embeddings` funktioniert
- Dependencies: MT-3, MT-4

### MT-6: ENV-Variablen in Coolify + IAM-Policy verifizieren
- Goal: Neue ENV-Vars in Coolify setzen und IAM-Policy fuer Titan Embeddings pruefen
- Files: keine Code-Dateien, Coolify + AWS Console Operation
- Expected behavior: EMBEDDING_PROVIDER=titan, EMBEDDING_DIMENSIONS=1024, EMBEDDING_REGION=eu-central-1 in Coolify gesetzt. IAM-Policy erlaubt bedrock:InvokeModel fuer amazon.titan-embed-text-v2:0.
- Verification: Coolify UI zeigt ENV-Vars, AWS-IAM-Check oder direkter Test-Call
- Dependencies: MT-4

### MT-7: Smoke-Test — Embed + Store + Retrieve
- Goal: End-to-End-Verifikation: Text embedden, als knowledge_chunk in DB speichern, per Cosine Similarity zurueckfinden
- Files: Temporaeres Test-Script oder manueller API-Test (kein permanenter Test-Endpoint)
- Expected behavior: (1) `getEmbeddingProvider().embed("Testtext ueber Vollmacht")` liefert 1024-dim Float-Array, (2) INSERT in knowledge_chunks, (3) `SELECT ... ORDER BY embedding <=> query_vector LIMIT 5` findet den Chunk, (4) Similarity-Score >0.8 bei identischem Text
- Verification: Manueller Test auf deployed App oder via Script, Log-Output zeigt Embedding-Dimensionen + Similarity-Score
- Dependencies: MT-2, MT-5, MT-6

### MT-8: Build-Verifikation
- Goal: `npm run build` gruen nach allen Aenderungen
- Files: keine neuen Dateien
- Expected behavior: Build laeuft fehlerfrei durch, keine TypeScript-Fehler in neuen Dateien
- Verification: `npm run build` exit code 0
- Dependencies: MT-5

## Acceptance Criteria
1. pgvector Extension ist auf Hetzner-DB aktiv (`\dx vector`)
2. knowledge_chunks Tabelle existiert mit korrektem Schema (vector(1024), HNSW-Index, Unique Constraint, RLS)
3. EmbeddingProvider Interface + TitanProvider + Factory kompilieren fehlerfrei
4. `getEmbeddingProvider().embed("Testtext")` liefert 1024-dimensionalen Float-Vektor via Bedrock Frankfurt
5. Ein Chunk kann in knowledge_chunks gespeichert und per Cosine Similarity zurueckgefunden werden
6. ENV-Variablen (EMBEDDING_PROVIDER, EMBEDDING_DIMENSIONS, EMBEDDING_REGION) sind in Coolify gesetzt
7. `npm run build` gruen

## Dependencies
- Keine Slice-Dependencies (Basis-Slice, blockiert SLC-422..426)
- Bedrock-Zugang eu-central-1 (bereits konfiguriert fuer Claude Sonnet)
- SSH-Zugang Hetzner (fuer Migration)

## QA Focus
- **pgvector-Verifikation:** Extension tatsaechlich geladen, nicht nur CREATE EXTENSION erfolgreich
- **HNSW-Index-Typ:** Index muss `hnsw` sein (nicht `ivfflat`), mit `vector_cosine_ops`
- **Dimensionen-Match:** Provider liefert exakt 1024 Dimensionen, Spalte ist vector(1024) — Mismatch = INSERT-Fehler
- **Region-Check:** Embedding-Call geht an eu-central-1, nicht us-east-1 (Data-Residency)
- **IAM-Policy:** Titan V2 Model-ID ist `amazon.titan-embed-text-v2:0` — oft verwechselt mit V1
- **RLS:** `authenticated` hat Full Access, `service_role` hat Full Access
- **Unique Constraint:** Doppelter INSERT mit gleicher (source_type, source_id, chunk_index) wird rejected

## Geschaetzter Aufwand
1-1.5 Tage (Schema + Adapter + Verifikation)
