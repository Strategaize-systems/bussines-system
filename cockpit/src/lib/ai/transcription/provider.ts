// =============================================================
// Transcription Provider — Interface for Speech-to-Text adapters
// =============================================================

/** Options passed to the transcription provider */
export interface TranscriptionOptions {
  /** ISO 639-1 language code (e.g., "de", "en"). Default: "de" */
  language?: string;
  /** Optional prompt/context to improve transcription accuracy */
  prompt?: string;
  /** Response format. Default: "text" */
  responseFormat?: "text" | "json" | "verbose_json" | "srt" | "vtt";
}

/** Result returned by every transcription provider */
export interface TranscriptionResult {
  /** Whether the transcription succeeded */
  success: boolean;
  /** The transcribed text (null on failure) */
  text: string | null;
  /** Detected or requested language */
  language: string;
  /** Audio duration in seconds (if available from the provider) */
  duration?: number;
  /** Which provider produced this result */
  provider: "openai" | "azure" | "selfhosted";
  /** Error message (null on success) */
  error: string | null;
}

/** Interface that every transcription provider must implement */
export interface TranscriptionProvider {
  /** Provider identifier */
  readonly name: "openai" | "azure" | "selfhosted";

  /**
   * Transcribe an audio buffer to text.
   *
   * @param buffer - Raw audio data (webm, mp3, mp4, wav, etc.)
   * @param filename - Original filename with extension (used for format detection)
   * @param options - Language, prompt, format overrides
   * @returns TranscriptionResult with text or error
   */
  transcribe(
    buffer: Buffer,
    filename: string,
    options?: TranscriptionOptions,
  ): Promise<TranscriptionResult>;
}
