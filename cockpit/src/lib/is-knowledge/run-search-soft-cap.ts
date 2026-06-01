// V8.7-A SLC-871 MT-4 — Wrapper-Function um searchKnowledge() mit
// Soft-Cap-Bypass (DEC-252) und IsKnowledgeError -> UserMessage-Mapping
// (DEC-256). Server-Actions rufen statt searchKnowledge direkt diese
// Envelope-Variante auf — kein eigenes try/catch und keine eigene
// soft-cap-Logik mehr.

import { searchKnowledge } from "./client";
import { mapIsErrorToUserMessage, SOFT_CAP_ERROR_MARKER } from "./format-hits";
import { IsKnowledgeError, type Domain, type KnowledgeSearchHit } from "./types";

export type IsSearchEnvelope =
  | { kind: "ok"; items: KnowledgeSearchHit[]; queryEmbeddingCostUsd: number; totalMs: number }
  | { kind: "skipped"; reason: "soft_cap_reached" }
  | { kind: "error"; userMessage: string; isError: IsKnowledgeError };

export interface RunIsSearchOptions {
  softCapReached?: boolean;
  domain?: Domain;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Fuehrt eine IS-Knowledge-Search aus, ausser der Soft-Cap ist erreicht
 * (DEC-252). Wandelt IsKnowledgeError zu einem Envelope mit user-facing
 * Message (DEC-256) — die rohe Error-Klasse landet zusaetzlich im Envelope
 * fuer Logging-Zwecke.
 */
export async function runIsSearchWithSoftCap(
  question: string,
  options: RunIsSearchOptions = {}
): Promise<IsSearchEnvelope> {
  if (options.softCapReached === true) {
    return { kind: "skipped", reason: "soft_cap_reached" };
  }

  try {
    const result = await searchKnowledge(question, {
      domain: options.domain,
      limit: options.limit,
      signal: options.signal,
    });
    return {
      kind: "ok",
      items: result.items,
      queryEmbeddingCostUsd: result.query_embedding_cost_usd,
      totalMs: result.total_ms,
    };
  } catch (e) {
    if (e instanceof IsKnowledgeError) {
      return {
        kind: "error",
        userMessage: mapIsErrorToUserMessage(e),
        isError: e,
      };
    }
    // Unbekannte Fehler bubbeln durch — kein silent-fail
    throw e;
  }
}

/**
 * Konvertiert einen Envelope in den isKnowledgeError-String fuer ReportResult.
 * - ok: null (kein Fehler)
 * - skipped: SOFT_CAP_ERROR_MARKER (KIWorkspace.tsx erkennt das fuer Footer)
 * - error: die user-facing Message
 */
export function envelopeToErrorString(
  envelope: IsSearchEnvelope
): string | null {
  if (envelope.kind === "ok") return null;
  if (envelope.kind === "skipped") return SOFT_CAP_ERROR_MARKER;
  return envelope.userMessage;
}
