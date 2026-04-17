// =============================================================
// Transcription Factory — ENV-based provider selection
// =============================================================

import type { TranscriptionProvider } from "./provider";
import { OpenAIWhisperProvider } from "./openai";
import { AzureWhisperProvider } from "./azure";
import { SelfhostedWhisperProvider } from "./selfhosted";

type ProviderName = "openai" | "azure" | "selfhosted";

const DEFAULT_PROVIDER: ProviderName = "openai";

let cachedProvider: TranscriptionProvider | null = null;
let cachedProviderName: ProviderName | null = null;

/**
 * Returns a TranscriptionProvider instance based on TRANSCRIPTION_PROVIDER env var.
 *
 * Supported values: "openai" (default), "azure", "selfhosted"
 *
 * The instance is cached per provider name — switching the env var
 * at runtime creates a new instance on next call.
 */
export function getTranscriptionProvider(): TranscriptionProvider {
  const envValue = (process.env.TRANSCRIPTION_PROVIDER ?? DEFAULT_PROVIDER).toLowerCase() as ProviderName;

  // Return cached instance if provider hasn't changed
  if (cachedProvider && cachedProviderName === envValue) {
    return cachedProvider;
  }

  switch (envValue) {
    case "openai":
      cachedProvider = new OpenAIWhisperProvider();
      break;
    case "azure":
      cachedProvider = new AzureWhisperProvider();
      break;
    case "selfhosted":
      cachedProvider = new SelfhostedWhisperProvider();
      break;
    default:
      // Fallback to OpenAI for unknown values
      cachedProvider = new OpenAIWhisperProvider();
      break;
  }

  cachedProviderName = envValue;
  return cachedProvider;
}
