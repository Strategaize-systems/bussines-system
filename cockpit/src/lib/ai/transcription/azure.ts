// =============================================================
// Azure Speech Provider — Stub for future EU-hosted Whisper
// =============================================================

import type {
  TranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from "./provider";

export class AzureWhisperProvider implements TranscriptionProvider {
  readonly name = "azure" as const;

  async transcribe(
    _buffer: Buffer,
    _filename: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult> {
    return {
      success: false,
      text: null,
      language: options?.language ?? "de",
      provider: this.name,
      error:
        "Azure Whisper Provider ist noch nicht implementiert. " +
        "Bitte TRANSCRIPTION_PROVIDER=openai setzen oder Azure-Integration in einer zukuenftigen Version aktivieren.",
    };
  }
}
