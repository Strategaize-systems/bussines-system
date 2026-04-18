-- =============================================================
-- V4.2 Migration: Knowledge Search RPC Function
-- MIG-015 — SLC-424 RAG Query API
-- =============================================================

-- search_knowledge_chunks: pgvector Similarity Search via RPC
-- Called from Next.js via supabase.rpc('search_knowledge_chunks', {...})
-- Returns Top-N chunks ordered by cosine similarity

CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding TEXT,        -- JSON array string '[0.1, 0.2, ...]'
  match_count INT DEFAULT 20,
  filter_scope TEXT DEFAULT NULL,   -- 'deal', 'contact', 'company', or NULL for all
  filter_id TEXT DEFAULT NULL       -- The ID to filter by (deal_id, contact_id, company_id)
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT8
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_type,
    kc.source_id,
    kc.chunk_index,
    kc.chunk_text,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding::vector) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.status = 'active'
    AND (
      filter_scope IS NULL
      OR (filter_scope = 'deal' AND kc.metadata->>'deal_id' = filter_id)
      OR (filter_scope = 'contact' AND kc.metadata->>'contact_id' = filter_id)
      OR (filter_scope = 'company' AND kc.metadata->>'company_id' = filter_id)
    )
  ORDER BY kc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION search_knowledge_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_chunks TO service_role;
