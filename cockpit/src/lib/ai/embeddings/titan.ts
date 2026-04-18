// =============================================================
// Titan Embedding Provider — Amazon Titan Text Embeddings V2
// via AWS Bedrock eu-central-1 (DEC-047, DEC-048)
// =============================================================

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { EmbeddingProvider, EmbeddingProviderConfig } from "./provider";

const MODEL_ID = "amazon.titan-embed-text-v2:0";
const DEFAULT_DIMENSIONS = 1024;
const DEFAULT_REGION = "eu-central-1";

export class TitanEmbeddingProvider implements EmbeddingProvider {
  private client: BedrockRuntimeClient;
  private config: EmbeddingProviderConfig;

  constructor(config?: Partial<EmbeddingProviderConfig>) {
    this.config = {
      region: config?.region || process.env.EMBEDDING_REGION || DEFAULT_REGION,
      dimensions:
        config?.dimensions ||
        Number(process.env.EMBEDDING_DIMENSIONS) ||
        DEFAULT_DIMENSIONS,
    };

    this.client = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }

  async embed(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        inputText: text,
        dimensions: this.config.dimensions,
        normalize: true,
      }),
    });

    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return body.embedding as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  dimensions(): number {
    return this.config.dimensions;
  }

  modelId(): string {
    return MODEL_ID;
  }
}
