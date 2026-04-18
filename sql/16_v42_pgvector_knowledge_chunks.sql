-- =============================================================
-- V4.2 Migration: pgvector Extension + knowledge_chunks Tabelle
-- MIG-014 — FEAT-401 Wissensbasis Cross-Source
-- =============================================================

-- 1. pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. knowledge_chunks Tabelle
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,              -- 'meeting', 'email', 'deal_activity', 'document'
  source_id UUID NOT NULL,                -- FK zur Quell-Tabelle (meetings.id, email_messages.id, etc.)
  chunk_index INTEGER NOT NULL,           -- Position innerhalb des Quelldokuments (0-basiert)
  chunk_text TEXT NOT NULL,               -- Der tatsaechliche Text-Chunk
  embedding vector(1024) NOT NULL,        -- Titan V2 Embedding (DEC-048)
  metadata JSONB DEFAULT '{}' NOT NULL,   -- Kontextuelle Metadaten (title, date, deal_id, contact_id, company_id, source_url)
  embedding_model TEXT NOT NULL,          -- 'amazon.titan-embed-text-v2:0'
  status TEXT DEFAULT 'active' NOT NULL,  -- 'active', 'pending', 'failed', 'deleted'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HNSW-Index fuer schnelle Approximate Nearest Neighbor Search
-- m=16: Konnektivitaet pro Knoten (Standard, guter Tradeoff)
-- ef_construction=64: Build-Qualitaet (hoeher = besser, langsamer Build)
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Lookup-Indizes
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(source_type, source_id);
CREATE INDEX idx_knowledge_chunks_status ON knowledge_chunks(status)
  WHERE status != 'active';
CREATE INDEX idx_knowledge_chunks_deal ON knowledge_chunks((metadata->>'deal_id'))
  WHERE metadata->>'deal_id' IS NOT NULL;

-- 5. Unique Constraint: kein doppeltes Embedding fuer gleichen Source+Chunk
CREATE UNIQUE INDEX idx_knowledge_chunks_unique
  ON knowledge_chunks(source_type, source_id, chunk_index);

-- 6. RLS
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON knowledge_chunks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON knowledge_chunks TO authenticated;
GRANT ALL ON knowledge_chunks TO service_role;
