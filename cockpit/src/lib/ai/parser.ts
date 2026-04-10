// =============================================================
// Response Parser — Extracts and validates JSON from LLM output
// =============================================================

import type { LLMResponse } from "./types";

/**
 * Extracts JSON from an LLM response string.
 * Handles common LLM output patterns:
 * - Raw JSON
 * - JSON wrapped in markdown code blocks (```json ... ```)
 * - JSON with leading/trailing text
 */
function extractJSON(raw: string): string | null {
  const trimmed = raw.trim();

  // Try 1: Direct JSON parse (cleanest case)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  // Try 2: Extract from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try 3: Find first { ... } or [ ... ] in the text
  const jsonObjectMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (jsonObjectMatch?.[1]) {
    return jsonObjectMatch[1].trim();
  }

  const jsonArrayMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (jsonArrayMatch?.[1]) {
    return jsonArrayMatch[1].trim();
  }

  return null;
}

/**
 * Schema validator type — a function that checks if parsed data
 * matches the expected structure and returns typed data or null.
 */
export type SchemaValidator<T> = (data: unknown) => T | null;

/**
 * Parses an LLM response string into a typed object.
 *
 * @param raw - Raw LLM response text
 * @param validator - Function to validate the parsed JSON against expected schema
 * @returns LLMResponse with typed data or descriptive error
 */
export function parseLLMResponse<T>(
  raw: string,
  validator: SchemaValidator<T>
): LLMResponse<T> {
  // Step 1: Extract JSON string
  const jsonString = extractJSON(raw);

  if (!jsonString) {
    return {
      success: false,
      data: null,
      error: "Could not extract JSON from LLM response",
      raw,
    };
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      data: null,
      error: `Invalid JSON in LLM response: ${jsonString.slice(0, 200)}...`,
      raw,
    };
  }

  // Step 3: Validate against schema
  const validated = validator(parsed);

  if (validated === null) {
    return {
      success: false,
      data: null,
      error: "LLM response JSON does not match expected schema",
      raw,
    };
  }

  return {
    success: true,
    data: validated,
    error: null,
    raw,
  };
}

// =============================================================
// Built-in validators for known response types
// =============================================================

import type { DealBriefing, DailySummary, PipelineSearchFilter } from "./types";

/** Validates a DealBriefing response */
export function validateDealBriefing(data: unknown): DealBriefing | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.summary !== "string") return null;
  if (!Array.isArray(d.keyFacts)) return null;
  if (!Array.isArray(d.openRisks)) return null;
  if (!Array.isArray(d.suggestedNextSteps)) return null;
  if (typeof d.confidence !== "number") return null;

  return {
    summary: d.summary,
    keyFacts: d.keyFacts.map(String),
    openRisks: d.openRisks.map(String),
    suggestedNextSteps: d.suggestedNextSteps.map(String),
    confidence: Math.max(0, Math.min(100, d.confidence)),
  };
}

/** Validates a DailySummary response */
export function validateDailySummary(data: unknown): DailySummary | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.greeting !== "string") return null;
  if (!Array.isArray(d.priorities)) return null;
  if (!Array.isArray(d.meetingPrep)) return null;
  if (!Array.isArray(d.warnings)) return null;
  if (typeof d.suggestedFocus !== "string") return null;

  return {
    greeting: d.greeting,
    priorities: d.priorities.map(String),
    meetingPrep: d.meetingPrep.map(String),
    warnings: d.warnings.map(String),
    suggestedFocus: d.suggestedFocus,
  };
}

/** Validates a PipelineSearchFilter response */
export function validatePipelineSearchFilter(data: unknown): PipelineSearchFilter | null {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  // All fields are nullable, so we just normalize types
  return {
    stage: typeof d.stage === "string" ? d.stage : null,
    minValue: typeof d.minValue === "number" ? d.minValue : null,
    maxValue: typeof d.maxValue === "number" ? d.maxValue : null,
    status: typeof d.status === "string" ? d.status : null,
    contactName: typeof d.contactName === "string" ? d.contactName : null,
    companyName: typeof d.companyName === "string" ? d.companyName : null,
    titleSearch: typeof d.titleSearch === "string" ? d.titleSearch : null,
    hasNextAction: typeof d.hasNextAction === "boolean" ? d.hasNextAction : null,
    isStagnant: typeof d.isStagnant === "boolean" ? d.isStagnant : null,
  };
}
