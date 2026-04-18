// =============================================================
// Knowledge Module — Public API
// =============================================================

// Chunker
export {
  estimateTokens,
  splitAtSentenceBoundary,
  chunkMeeting,
  chunkEmail,
  chunkActivity,
  chunkDocument,
  extractText,
  isExtractableFormat,
  getFileExtension,
} from "./chunker";
export type {
  Chunk,
  ChunkMetadata,
  MeetingChunkInput,
  EmailChunkInput,
  ActivityChunkInput,
  DocumentChunkInput,
} from "./chunker";

// Indexer
export {
  embedAndStore,
  indexMeeting,
  indexEmail,
  indexActivity,
  indexDocument,
} from "./indexer";
export type { EmbedResult } from "./indexer";

// Backfill
export { runBackfill } from "./backfill";
export type { BackfillResult, BackfillSourceResult } from "./backfill";

// Search (SLC-424)
export {
  searchKnowledge,
  assembleContext,
  calculateConfidence,
  queryKnowledge,
} from "./search";
export type {
  SearchScope,
  SearchOptions,
  SearchChunk,
  RAGSource,
  RAGResult,
  ConfidenceLevel,
} from "./search";
