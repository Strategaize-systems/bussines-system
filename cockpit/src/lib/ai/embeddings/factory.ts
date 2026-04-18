// =============================================================
// Embedding Provider Factory — ENV-based provider selection
// =============================================================

import type { EmbeddingProvider } from "./provider";
import { TitanEmbeddingProvider } from "./titan";

let instance: EmbeddingProvider | null = null;

/**
 * Returns the configured embedding provider (singleton).
 * Reads EMBEDDING_PROVIDER env to select implementation.
 * Default: titan (Amazon Titan Text Embeddings V2 via Bedrock Frankfurt)
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (instance) return instance;

  const provider = process.env.EMBEDDING_PROVIDER || "titan";

  switch (provider) {
    case "titan":
      instance = new TitanEmbeddingProvider();
      break;
    case "cohere":
      throw new Error("Cohere embedding provider not yet implemented");
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }

  return instance;
}
