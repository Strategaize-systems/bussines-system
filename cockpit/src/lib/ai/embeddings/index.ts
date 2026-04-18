// =============================================================
// Embedding Module — Public API
// =============================================================

export type { EmbeddingProvider, EmbeddingProviderConfig } from "./provider";
export { TitanEmbeddingProvider } from "./titan";
export { getEmbeddingProvider } from "./factory";
