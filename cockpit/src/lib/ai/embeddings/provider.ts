// =============================================================
// Embedding Provider Interface — DEC-047 Adapter Pattern
// =============================================================

/** Configuration for embedding providers */
export interface EmbeddingProviderConfig {
  /** AWS/Azure region (e.g. eu-central-1) */
  region: string;
  /** Embedding dimensions (256 | 512 | 1024) */
  dimensions: number;
}

/** Interface that all embedding providers must implement */
export interface EmbeddingProvider {
  /** Generate embedding for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (sequential calls) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Return the embedding dimension count */
  dimensions(): number;
  /** Return the model identifier (e.g. amazon.titan-embed-text-v2:0) */
  modelId(): string;
}
