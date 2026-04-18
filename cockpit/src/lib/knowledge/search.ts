// =============================================================
// Knowledge Search — RAG Query Pipeline (SLC-424)
// MT-1: Similarity Search, MT-2: Context Assembly,
// MT-3: Bedrock RAG Query, MT-4: Confidence Calculation
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai/embeddings";
import { queryLLM } from "@/lib/ai/bedrock-client";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type SearchScope = "deal" | "contact" | "company" | "all";

export interface SearchOptions {
  scope: SearchScope;
  dealId?: string;
  contactId?: string;
  companyId?: string;
  limit?: number;
}

export interface SearchChunk {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  chunk_text: string;
  metadata: ChunkMetadata;
  similarity: number;
}

export interface ChunkMetadata {
  title?: string;
  date?: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  source_url?: string;
  [key: string]: unknown;
}

export interface RAGSource {
  index: number;
  type: string;
  relevance: "high" | "medium" | "low";
  title: string;
  date: string;
  snippet: string;
  sourceUrl: string | null;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
  confidence: ConfidenceLevel;
  queryTimeMs: number;
}

// ---------------------------------------------------------------
// MT-1: searchKnowledge — Query Embedding + pgvector Search
// ---------------------------------------------------------------

/**
 * Embeds the query text and performs pgvector similarity search
 * via the search_knowledge_chunks RPC function.
 */
export async function searchKnowledge(
  query: string,
  options: SearchOptions,
): Promise<SearchChunk[]> {
  const provider = getEmbeddingProvider();
  const admin = createAdminClient();

  // 1. Embed the query
  const queryEmbedding = await provider.embed(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // 2. Determine scope filter
  let filterScope: string | null = null;
  let filterId: string | null = null;

  if (options.scope === "deal" && options.dealId) {
    filterScope = "deal";
    filterId = options.dealId;
  } else if (options.scope === "contact" && options.contactId) {
    filterScope = "contact";
    filterId = options.contactId;
  } else if (options.scope === "company" && options.companyId) {
    filterScope = "company";
    filterId = options.companyId;
  }
  // scope "all" → no filter

  // 3. Call RPC function
  const { data, error } = await admin.rpc("search_knowledge_chunks", {
    query_embedding: embeddingStr,
    match_count: options.limit ?? 20,
    filter_scope: filterScope,
    filter_id: filterId,
  });

  if (error) {
    console.error("[search] pgvector search failed:", error.message);
    throw new Error(`Knowledge search failed: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    source_type: String(row.source_type),
    source_id: String(row.source_id),
    chunk_index: Number(row.chunk_index),
    chunk_text: String(row.chunk_text),
    metadata: (row.metadata ?? {}) as ChunkMetadata,
    similarity: Number(row.similarity),
  }));
}

// ---------------------------------------------------------------
// MT-2: assembleContext — Format chunks for LLM context
// ---------------------------------------------------------------

interface DealContext {
  dealName?: string;
  stage?: string;
  contactName?: string;
  companyName?: string;
}

/**
 * Formats the top-N search chunks into a numbered context string
 * suitable for the RAG system prompt.
 */
export function assembleContext(
  chunks: SearchChunk[],
  dealContext?: DealContext,
): string {
  const parts: string[] = [];

  // Optional: Deal metadata header
  if (dealContext) {
    const headerParts: string[] = [];
    if (dealContext.dealName) headerParts.push(`Deal: ${dealContext.dealName}`);
    if (dealContext.stage) headerParts.push(`Phase: ${dealContext.stage}`);
    if (dealContext.contactName) headerParts.push(`Kontakt: ${dealContext.contactName}`);
    if (dealContext.companyName) headerParts.push(`Firma: ${dealContext.companyName}`);
    if (headerParts.length > 0) {
      parts.push(`DEAL-KONTEXT: ${headerParts.join(" | ")}`);
      parts.push("");
    }
  }

  parts.push("QUELLEN:");
  parts.push("");

  // Token budget check: estimate total and truncate if needed
  const maxContextTokens = 15_000;
  let totalTokens = 0;
  const selectedChunks: SearchChunk[] = [];

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.chunk_text) + 30; // +30 for formatting
    if (totalTokens + chunkTokens > maxContextTokens && selectedChunks.length >= 10) {
      break; // Stop if we exceed budget after at least 10 chunks
    }
    selectedChunks.push(chunk);
    totalTokens += chunkTokens;
  }

  for (let i = 0; i < selectedChunks.length; i++) {
    const chunk = selectedChunks[i];
    const typeLabel = formatSourceType(chunk.source_type);
    const date = chunk.metadata.date ? `, ${chunk.metadata.date}` : "";
    const title = chunk.metadata.title ? ` "${chunk.metadata.title}"` : "";

    parts.push(`[${i + 1}] (${typeLabel}${date}${title})`);
    parts.push(chunk.chunk_text);
    parts.push("");
  }

  return parts.join("\n");
}

function formatSourceType(type: string): string {
  switch (type) {
    case "meeting": return "Meeting-Transkript";
    case "email": return "E-Mail";
    case "deal_activity": return "Aktivitaet";
    case "document": return "Dokument";
    default: return type;
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------
// MT-4: calculateConfidence — Based on similarity scores
// ---------------------------------------------------------------

/**
 * Determines confidence level from the top chunk's similarity score.
 * high: >0.7, medium: 0.5-0.7, low: <0.5
 */
export function calculateConfidence(
  chunks: SearchChunk[],
  llmConfidence?: ConfidenceLevel,
): ConfidenceLevel {
  // Vector-based confidence from top chunk
  let vectorConfidence: ConfidenceLevel = "low";
  if (chunks.length > 0) {
    const topSimilarity = chunks[0].similarity;
    if (topSimilarity > 0.7) {
      vectorConfidence = "high";
    } else if (topSimilarity >= 0.5) {
      vectorConfidence = "medium";
    }
  }

  // If LLM provided its own confidence, take the higher of both
  if (llmConfidence) {
    const order: ConfidenceLevel[] = ["low", "medium", "high"];
    const vectorIdx = order.indexOf(vectorConfidence);
    const llmIdx = order.indexOf(llmConfidence);
    return order[Math.max(vectorIdx, llmIdx)];
  }

  return vectorConfidence;
}

// ---------------------------------------------------------------
// MT-3: queryKnowledge — Full RAG pipeline
// ---------------------------------------------------------------

const RAG_SYSTEM_PROMPT = `Du bist ein Business-Intelligence-Assistent. Du beantwortest Fragen basierend auf
den bereitgestellten Quellen aus einem CRM-System.

REGELN:
- Antworte auf Deutsch, praezise und direkt.
- Beziehe dich NUR auf die bereitgestellten Quellen. Erfinde keine Informationen.
- Wenn die Frage nicht aus den Quellen beantwortet werden kann, sag das ehrlich.
- Nenne Quellen-Nummern [1], [2] etc. in deiner Antwort.
- Gib bei Datumsangaben das konkrete Datum an.

Antworte als JSON:
{
  "answer": "Deine Antwort mit [Quellen-Nummern]",
  "sources": [{"index": N, "type": "meeting|email|deal_activity|document", "relevance": "high|medium|low"}],
  "confidence": "high|medium|low"
}

Confidence-Regeln:
- high: Mindestens eine Quelle beantwortet die Frage direkt
- medium: Quellen enthalten relevante Informationen, aber keine direkte Antwort
- low: Keine der Quellen scheint relevant zu sein`;

interface LLMRAGResponse {
  answer: string;
  sources: Array<{ index: number; type: string; relevance: string }>;
  confidence: string;
}

/**
 * Executes the full RAG pipeline:
 * 1. Embed query + pgvector similarity search
 * 2. Assemble context from top chunks
 * 3. Send to Bedrock Claude Sonnet
 * 4. Parse response + calculate confidence
 * 5. Enrich sources with metadata
 */
export async function queryKnowledge(
  query: string,
  options: SearchOptions,
  dealContext?: DealContext,
): Promise<RAGResult> {
  const startTime = Date.now();

  // Step 1: Search
  const chunks = await searchKnowledge(query, options);

  if (chunks.length === 0) {
    return {
      answer: "Zu dieser Frage wurden keine relevanten Quellen gefunden.",
      sources: [],
      confidence: "low",
      queryTimeMs: Date.now() - startTime,
    };
  }

  // Step 2: Context Assembly
  const context = assembleContext(chunks, dealContext);

  // Step 3: Bedrock RAG Query
  const userPrompt = `${context}\n\nFRAGE: ${query}`;

  const llmResponse = await queryLLM(userPrompt, RAG_SYSTEM_PROMPT, {
    temperature: 0.2,
    maxTokens: 2048,
    timeoutMs: 30_000,
  });

  if (!llmResponse.success || !llmResponse.data) {
    return {
      answer: "Die Wissensbasis konnte die Frage momentan nicht verarbeiten. Bitte versuche es erneut.",
      sources: [],
      confidence: "low",
      queryTimeMs: Date.now() - startTime,
    };
  }

  // Step 4: Parse LLM response
  const parsed = parseLLMRAGResponse(llmResponse.data);

  // Step 5: Calculate confidence (max of vector + LLM)
  const llmConfidence = parseConfidence(parsed?.confidence);
  const confidence = calculateConfidence(chunks, llmConfidence);

  // Step 6: Enrich sources with chunk metadata
  const sources = enrichSources(parsed?.sources ?? [], chunks);

  return {
    answer: parsed?.answer ?? llmResponse.data,
    sources,
    confidence,
    queryTimeMs: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------
// Response parsing helpers
// ---------------------------------------------------------------

function parseLLMRAGResponse(raw: string): LLMRAGResponse | null {
  try {
    const trimmed = raw.trim();

    // Try direct parse
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed) as LLMRAGResponse;
    }

    // Try markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1].trim()) as LLMRAGResponse;
    }

    // Try find JSON object
    const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
    if (jsonMatch?.[1]) {
      return JSON.parse(jsonMatch[1].trim()) as LLMRAGResponse;
    }

    return null;
  } catch {
    return null;
  }
}

function parseConfidence(value: string | undefined): ConfidenceLevel | undefined {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return undefined;
}

// ---------------------------------------------------------------
// MT-6: enrichSources — Add metadata from original chunks
// ---------------------------------------------------------------

function enrichSources(
  llmSources: Array<{ index: number; type: string; relevance: string }>,
  chunks: SearchChunk[],
): RAGSource[] {
  return llmSources
    .filter((s) => s.index >= 1 && s.index <= chunks.length)
    .map((s) => {
      const chunk = chunks[s.index - 1]; // LLM uses 1-based index
      return {
        index: s.index,
        type: s.type || chunk.source_type,
        relevance: parseConfidence(s.relevance) ?? "medium",
        title: String(chunk.metadata.title ?? ""),
        date: String(chunk.metadata.date ?? ""),
        snippet: chunk.chunk_text.slice(0, 150),
        sourceUrl: chunk.metadata.source_url
          ? String(chunk.metadata.source_url)
          : null,
      };
    });
}
