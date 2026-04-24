// SLC-515 / MT-1 — VoiceAgentProvider Interface (FEAT-514, DEC-075)
// Generic interface for SMAO / Synthflow voice-agent webhook adapters.

export type VoiceAgentClassification =
  | "urgent"
  | "callback"
  | "info"
  | "meeting_request";

export interface VoiceAgentCallResult {
  callerNumber: string;
  callerName?: string;
  transcript: string;
  classification: VoiceAgentClassification;
  confidence: number;
  durationSeconds: number;
  recordingUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceAgentProvider {
  /** Validate webhook signature against shared secret. Returns true if valid. */
  validateWebhook(rawBody: string, signatureHeader: string | null, secret: string): boolean;
  /** Parse provider-specific payload into generic VoiceAgentCallResult. */
  parsePayload(body: unknown): VoiceAgentCallResult;
  /** Provider name for logging and audit trails. */
  getProviderName(): string;
}
