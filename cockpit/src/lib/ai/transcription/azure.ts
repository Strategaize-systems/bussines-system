// =============================================================
// Azure Whisper Provider — Speech-to-Text via Azure OpenAI
// DEC-085: AzureOpenAI-Client aus openai-NPM-SDK
// DEC-086: API-Version via ENV mit Default 2024-06-01
// DSGVO: EU-Region (westeurope / germanywestcentral), siehe data-residency.md
// =============================================================

import { AzureOpenAI } from "openai";
import { toFile } from "openai/core/uploads";
import type {
  TranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from "./provider";

const DEFAULT_LANGUAGE = "de";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_API_VERSION = "2024-06-01";

interface AzureConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

function readConfig(): { ok: true; config: AzureConfig } | { ok: false; missing: string } {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_ID;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_API_VERSION;

  if (!endpoint) return { ok: false, missing: "AZURE_OPENAI_ENDPOINT" };
  if (!apiKey) return { ok: false, missing: "AZURE_OPENAI_API_KEY" };
  if (!deployment) return { ok: false, missing: "AZURE_OPENAI_WHISPER_DEPLOYMENT_ID" };

  return { ok: true, config: { endpoint, apiKey, deployment, apiVersion } };
}

function extractRegionFromEndpoint(endpoint: string): string {
  // Azure endpoint pattern: https://<resource>.openai.azure.com or https://<resource>.<region>.openai.azure.com
  const match = endpoint.match(/https:\/\/[^.]+\.([^.]+)\.openai\.azure\.com/);
  return match?.[1] ?? "azure-eu";
}

function logAuditEntry(
  config: AzureConfig,
  options: { success: boolean; requestId?: string; durationMs?: number },
): void {
  // Audit-Log per data-residency.md: Anbieter, Region, Modell, Request-ID, Zeitstempel
  console.info(
    "[Whisper/Azure] " + JSON.stringify({
      provider: "azure",
      region: extractRegionFromEndpoint(config.endpoint),
      model: "whisper",
      deployment: config.deployment,
      apiVersion: config.apiVersion,
      requestId: options.requestId ?? null,
      durationMs: options.durationMs ?? null,
      success: options.success,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function createAzureClient(config: AzureConfig): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    deployment: config.deployment,
    apiVersion: config.apiVersion,
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export class AzureWhisperProvider implements TranscriptionProvider {
  readonly name = "azure" as const;

  // Optional injection for tests
  private clientFactory: (config: AzureConfig) => AzureOpenAI;

  constructor(clientFactory?: (config: AzureConfig) => AzureOpenAI) {
    this.clientFactory = clientFactory ?? createAzureClient;
  }

  async transcribe(
    buffer: Buffer,
    filename: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    const language = options?.language ?? DEFAULT_LANGUAGE;
    const responseFormat = options?.responseFormat ?? "verbose_json";

    const configResult = readConfig();
    if (!configResult.ok) {
      return {
        success: false,
        text: null,
        language,
        provider: this.name,
        error: `Azure-Konfiguration unvollstaendig: ${configResult.missing}`,
      };
    }

    const { config } = configResult;
    const startedAt = Date.now();

    try {
      const client = this.clientFactory(config);
      const file = await toFile(buffer, filename);

      // Azure uses deployment-id as model. The openai-SDK's AzureOpenAI client
      // routes to the configured deployment endpoint when deployment is set in
      // the constructor; passing model is still required by the API surface.
      if (responseFormat === "text" || responseFormat === "srt" || responseFormat === "vtt") {
        const text = await client.audio.transcriptions.create({
          file,
          model: config.deployment,
          language,
          prompt: options?.prompt,
          response_format: responseFormat,
        });

        logAuditEntry(config, { success: true, durationMs: Date.now() - startedAt });

        return {
          success: true,
          text: typeof text === "string" ? text.trim() : String(text).trim(),
          language,
          provider: this.name,
          error: null,
        };
      }

      if (responseFormat === "verbose_json") {
        const result = await client.audio.transcriptions.create({
          file,
          model: config.deployment,
          language,
          prompt: options?.prompt,
          response_format: "verbose_json",
        });

        logAuditEntry(config, { success: true, durationMs: Date.now() - startedAt });

        return {
          success: true,
          text: result.text?.trim() ?? "",
          language: result.language ?? language,
          duration: result.duration,
          provider: this.name,
          error: null,
        };
      }

      const result = await client.audio.transcriptions.create({
        file,
        model: config.deployment,
        language,
        prompt: options?.prompt,
        response_format: "json",
      });

      logAuditEntry(config, { success: true, durationMs: Date.now() - startedAt });

      return {
        success: true,
        text: result.text?.trim() ?? "",
        language,
        provider: this.name,
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown Azure Whisper error";

      logAuditEntry(config, { success: false, durationMs: Date.now() - startedAt });

      if (
        message.includes("timeout") ||
        message.includes("aborted") ||
        message.includes("AbortError")
      ) {
        return {
          success: false,
          text: null,
          language,
          provider: this.name,
          error: `Azure Whisper request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
        };
      }

      return {
        success: false,
        text: null,
        language,
        provider: this.name,
        error: `Azure Whisper transcription failed: ${message}`,
      };
    }
  }
}
