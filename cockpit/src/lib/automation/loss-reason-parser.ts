// V8 SLC-813 MT-1 — Pure-Function Response-Parser fuer KI-Verlustgrund-Vorschlag.
//
// DEC-220 V8 strict JSON-Schema-Validation auf Bedrock-Response.
//
// Bedrock-JSON-Drift-Mitigation: bei Parse-Error wird `tryParseHealedJson`
// aus lib/json/heal-json-escapes.ts verwendet (V7.5 SLC-752 MT-2 Pattern,
// portiert aus IS-SLC-109 healJsonEscapes; siehe Memory
// feedback_bedrock_json_drift_pattern.md).

import { z } from "zod";
import { tryParseHealedJson } from "@/lib/json/heal-json-escapes";

export const LossReasonSuggestionSchema = z
  .object({
    reason: z.string().min(1).max(200),
    source: z.string().min(1).max(200),
  })
  .strict();

export type LossReasonSuggestion = z.infer<typeof LossReasonSuggestionSchema>;

export const LossReasonResponseSchema = z
  .object({
    suggestions: z.array(LossReasonSuggestionSchema).min(1).max(3),
  })
  .strict();

export type LossReasonResponse = z.infer<typeof LossReasonResponseSchema>;

export type LossReasonParseResult =
  | { kind: "success"; data: LossReasonResponse }
  | { kind: "parse_error"; error: string; raw: string }
  | { kind: "schema_error"; error: string; raw: string };

/**
 * Parsed Bedrock-Response-Text in ein validiertes Suggestion-Array.
 *
 * Pipeline:
 * 1. Code-Fences abtrennen (defensive — Modell antwortet manchmal trotz
 *    Direktive mit ```json … ```).
 * 2. JSON-Parse + heal-Fallback (unescaped Quotes).
 * 3. Zod-Schema-Validation.
 *
 * Returnt ein Discriminated-Union mit `kind`, sodass der Aufrufer den
 * Audit-Log-Status (`parse_error` vs `schema_error`) korrekt setzen kann.
 */
export function parseLossReasonResponse(raw: string): LossReasonParseResult {
  const trimmed = stripCodeFences(raw).trim();

  const parsed = tryParseHealedJson(trimmed);
  if (parsed === null) {
    return {
      kind: "parse_error",
      error: "JSON.parse fehlgeschlagen (auch nach heal-Versuch).",
      raw: trimmed,
    };
  }

  const validation = LossReasonResponseSchema.safeParse(parsed);
  if (!validation.success) {
    return {
      kind: "schema_error",
      error: validation.error.message,
      raw: trimmed,
    };
  }

  return { kind: "success", data: validation.data };
}

function stripCodeFences(text: string): string {
  const fenceRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = text.trim().match(fenceRegex);
  return m ? m[1] : text;
}
