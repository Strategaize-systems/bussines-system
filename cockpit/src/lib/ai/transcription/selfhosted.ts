// =============================================================
// Self-hosted Whisper Provider — Stub for future local deployment
// =============================================================

import type {
  TranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from "./provider";

export class SelfhostedWhisperProvider implements TranscriptionProvider {
  readonly name = "selfhosted" as const;

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
        "Self-hosted Whisper Provider ist noch nicht implementiert. " +
        "Bitte TRANSCRIPTION_PROVIDER=openai setzen oder Self-hosted-Integration in einer zukuenftigen Version aktivieren.",
    };
  }
}
