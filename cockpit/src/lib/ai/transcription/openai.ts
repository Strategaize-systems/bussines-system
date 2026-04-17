// =============================================================
// OpenAI Whisper Provider — Speech-to-Text via OpenAI API
// =============================================================

import OpenAI from "openai";
import { toFile } from "openai/core/uploads";
import type {
  TranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from "./provider";

const DEFAULT_MODEL = "whisper-1";
const DEFAULT_LANGUAGE = "de";
const DEFAULT_TIMEOUT_MS = 120_000; // 2 min for large audio files

let clientInstance: OpenAI | null = null;

function getClient(): OpenAI {
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: DEFAULT_TIMEOUT_MS,
    });
  }
  return clientInstance;
}

export class OpenAIWhisperProvider implements TranscriptionProvider {
  readonly name = "openai" as const;

  async transcribe(
    buffer: Buffer,
    filename: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        text: null,
        language: options?.language ?? DEFAULT_LANGUAGE,
        provider: this.name,
        error: "OPENAI_API_KEY nicht konfiguriert",
      };
    }

    const language = options?.language ?? DEFAULT_LANGUAGE;
    const responseFormat = options?.responseFormat ?? "verbose_json";

    try {
      const client = getClient();
      const file = await toFile(buffer, filename);

      if (responseFormat === "text" || responseFormat === "srt" || responseFormat === "vtt") {
        // Text-based formats return a plain string
        const text = await client.audio.transcriptions.create({
          file,
          model: DEFAULT_MODEL,
          language,
          prompt: options?.prompt,
          response_format: responseFormat,
        });

        return {
          success: true,
          text: typeof text === "string" ? text.trim() : String(text).trim(),
          language,
          provider: this.name,
          error: null,
        };
      }

      // verbose_json returns duration + language info
      if (responseFormat === "verbose_json") {
        const result = await client.audio.transcriptions.create({
          file,
          model: DEFAULT_MODEL,
          language,
          prompt: options?.prompt,
          response_format: "verbose_json",
        });

        return {
          success: true,
          text: result.text?.trim() ?? "",
          language: result.language ?? language,
          duration: result.duration,
          provider: this.name,
          error: null,
        };
      }

      // Default: json format
      const result = await client.audio.transcriptions.create({
        file,
        model: DEFAULT_MODEL,
        language,
        prompt: options?.prompt,
        response_format: "json",
      });

      return {
        success: true,
        text: result.text?.trim() ?? "",
        language,
        provider: this.name,
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown OpenAI Whisper error";

      // Detect timeout
      if (message.includes("timeout") || message.includes("aborted") || message.includes("AbortError")) {
        return {
          success: false,
          text: null,
          language,
          provider: this.name,
          error: `Whisper request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
        };
      }

      return {
        success: false,
        text: null,
        language,
        provider: this.name,
        error: `Whisper transcription failed: ${message}`,
      };
    }
  }
}
