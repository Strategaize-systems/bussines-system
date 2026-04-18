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
