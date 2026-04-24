// SLC-515 / MT-2 — SMAO Voice-Agent Adapter (FEAT-514, DEC-075)
// Best-guess payload parser. Validate against real SMAO docs at go-live.

import crypto from "node:crypto";
import type {
  VoiceAgentCallResult,
  VoiceAgentClassification,
  VoiceAgentProvider,
} from "./provider";

const VALID_CLASSIFICATIONS: VoiceAgentClassification[] = [
  "urgent",
  "callback",
  "info",
  "meeting_request",
];

type SmaoPayload = {
  caller?: { number?: string; name?: string };
  call?: {
    duration_seconds?: number;
    recording_url?: string;
  };
  transcript?: string;
  classification?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export class SmaoProvider implements VoiceAgentProvider {
  getProviderName(): string {
    return "smao";
  }

  validateWebhook(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    if (!signatureHeader || !secret) return false;

    // Strip optional "sha256=" prefix (common convention).
    const received = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : signatureHeader;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    if (received.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(received, "hex"),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  }

  parsePayload(body: unknown): VoiceAgentCallResult {
    if (!body || typeof body !== "object") {
      throw new Error("SMAO payload is not an object");
    }
    const p = body as SmaoPayload;

    const callerNumber = p.caller?.number?.trim();
    if (!callerNumber) {
      throw new Error("SMAO payload missing caller.number");
    }

    const transcript = typeof p.transcript === "string" ? p.transcript : "";

    const rawClassification = (p.classification || "info").toString() as VoiceAgentClassification;
    const classification: VoiceAgentClassification = VALID_CLASSIFICATIONS.includes(rawClassification)
      ? rawClassification
      : "info";

    const confidence =
      typeof p.confidence === "number" && p.confidence >= 0 && p.confidence <= 1
        ? p.confidence
        : 0;

    const durationSeconds =
      typeof p.call?.duration_seconds === "number" ? Math.max(0, Math.round(p.call.duration_seconds)) : 0;

    return {
      callerNumber,
      callerName: p.caller?.name,
      transcript,
      classification,
      confidence,
      durationSeconds,
      recordingUrl: p.call?.recording_url,
      metadata: p.metadata,
    };
  }
}
