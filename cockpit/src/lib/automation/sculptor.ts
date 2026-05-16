// V7.5 SLC-752 MT-6 — Sculptor-Core (Single-Shot + 1x Re-Prompt-Loop).
//
// `sculptRule(nlInput, userId, deps?)` ist die zentrale Pure-Function des
// Natural-Language-Sculptors (FEAT-751). Sie:
//   1. Baut Prompt aus System-Prompt + 8 Few-Shots + nlInput.
//   2. Ruft Bedrock einmal auf (DEC-205 Single-Shot).
//   3. Versucht JSON-Extraction inkl. healJsonEscapes-Fallback (IS-SLC-109).
//   4. Validiert gegen SculptSuccessSchema bzw. SculptRejectSchema.
//   5. Bei Validate-Fail: 1x Re-Prompt-Loop mit Korrektur-Hinweis (DEC-205).
//   6. Insert per-Attempt audit_log mit metadata (DEC-208 Real-Cost-Display).
//   7. Returnt SculptResult mit totalCostUsd + attemptCount.
//
// Reuse-Trail:
//   - lib/json/heal-json-escapes.ts (MT-2, IS-SLC-109-Pattern)
//   - lib/ai/bedrock-client.ts queryLLM (extended fuer usage+modelId)
//   - sculptor-schema.ts parseSculptOutput (MT-3)
//   - sculptor-prompts.ts buildSculptPrompt (MT-4)
//   - sculptor-cost.ts calculateSculptCost (MT-5)
//
// Architecture: kein UI-Touch, keine Server-Action — Pure-Function fuer V7.5
// Foundation (SLC-752). SLC-753 verdrahtet `sculptNlRule()` Server-Action,
// SLC-754 verdrahtet Apply.

import { queryLLM } from "@/lib/ai/bedrock-client";
import type { LLMResponse } from "@/lib/ai/types";
import { healJsonEscapes } from "@/lib/json/heal-json-escapes";
import {
  type SculptParsed,
  type SculptReject,
  type SculptSuccess,
  parseSculptOutput,
} from "./sculptor-schema";
import { SYSTEM_PROMPT, buildSculptPrompt } from "./sculptor-prompts";
import {
  calculateSculptCost,
  sumSculptCosts,
} from "./sculptor-cost";

// ---------------------------------------------------------------------------
// Public-Result Types
// ---------------------------------------------------------------------------

export type SculptResultStatus = "success" | "reject" | "validation_fail" | "infra_fail";

export interface SculptResultBase {
  status: SculptResultStatus;
  totalCostUsd: number;
  attemptCount: number;
  sessionId: string;
}

export interface SculptResultSuccess extends SculptResultBase {
  status: "success";
  payload: SculptSuccess;
}

export interface SculptResultReject extends SculptResultBase {
  status: "reject";
  reason: SculptReject;
}

export interface SculptResultValidationFail extends SculptResultBase {
  status: "validation_fail";
  lastError: string;
}

export interface SculptResultInfraFail extends SculptResultBase {
  status: "infra_fail";
  infraError: string;
}

export type SculptResult =
  | SculptResultSuccess
  | SculptResultReject
  | SculptResultValidationFail
  | SculptResultInfraFail;

// ---------------------------------------------------------------------------
// DI-Hooks fuer Tests
// ---------------------------------------------------------------------------

export interface SculptAuditMetadata {
  nl_input: string;
  transcript_source: "text" | "voice";
  sculptor_model_id: string | null;
  sculptor_cost_usd: number;
  attempt_count: number;
  result_status: "success" | "reject" | "validation_fail" | "infra_fail";
  result_payload: unknown;
  sculpt_session_id: string;
}

export interface SculptAuditInsertRow {
  actor_id: string;
  action: "automation_rule.sculpt_attempt";
  entity_type: "automation_rule";
  entity_id: string;
  changes: null;
  context: string;
}

export interface SculptDeps {
  /** Bedrock-Aufrufer. Default: real queryLLM aus lib/ai/bedrock-client. */
  invoke: (systemPrompt: string, userPrompt: string) => Promise<LLMResponse<string>>;
  /**
   * Audit-Log-Insert. Default: real Supabase-Admin-Client. Best-effort
   * (Failure beim Insert blockiert den Sculpt-Return NICHT — Sculpt-Flow ist
   * fuer den User wichtig, Audit-Trail ist Side-Effect).
   */
  auditInsert: (row: SculptAuditInsertRow) => Promise<void>;
  /** UUID-Generator (override fuer deterministische Tests). */
  uuid: () => string;
  /**
   * Transcript-Source-Hint. text fuer normalen Tipp-Input, voice wenn der
   * User-Input aus Whisper-Transkription kam (SLC-755). Default 'text'.
   */
  transcriptSource?: "text" | "voice";
}

const TEXT_DECODER_PAD = ""; // no-op; kept for parity-style symmetry

/**
 * Liefert die Default-Deps fuer Production-Aufrufe. Tests sollten Deps via
 * Parameter ueberschreiben (siehe sculptor.test.ts).
 */
export function defaultSculptDeps(): SculptDeps {
  return {
    invoke: (systemPrompt, userPrompt) => queryLLM(userPrompt, systemPrompt),
    auditInsert: async (row) => {
      // Lazy-Import Supabase nur in Production, damit Tests die Dep
      // ueberschreiben koennen ohne Supabase-Init zu triggern.
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const client = createAdminClient();
      const { error } = await client.from("audit_log").insert(row);
      if (error) {
        // Best-effort: never throw — Sculpt-Flow darf nicht an Audit-Insert sterben.
        console.error("[sculptor] audit_log insert failed:", error.message + TEXT_DECODER_PAD);
      }
    },
    uuid: () => crypto.randomUUID(),
    transcriptSource: "text",
  };
}

// ---------------------------------------------------------------------------
// JSON-Extraction-Helper (analog IS-SLC-109 extractJsonObject + heal-Fallback)
// ---------------------------------------------------------------------------

function extractCandidateJson(rawText: string): string | null {
  // Erst Code-Fence pruefen
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // Sonst ersten {-bis-letzten-} extrahieren
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start >= 0 && end > start) return rawText.slice(start, end + 1).trim();
  return null;
}

function tryParseSculptResponse(rawText: string): {
  parsed: SculptParsed | null;
  parseError: string | null;
} {
  const candidate = extractCandidateJson(rawText);
  if (!candidate) {
    return {
      parsed: null,
      parseError: "Bedrock-Output enthielt kein JSON-Objekt (weder Code-Fence noch Brace-Pair).",
    };
  }
  // 1. Direct JSON.parse
  try {
    const direct = JSON.parse(candidate);
    return { parsed: parseSculptOutput(direct), parseError: null };
  } catch {
    // intentional fall-through
  }
  // 2. Heal-Fallback
  const healed = healJsonEscapes(candidate);
  if (healed !== candidate) {
    try {
      const healedParsed = JSON.parse(healed);
      return { parsed: parseSculptOutput(healedParsed), parseError: null };
    } catch (e) {
      return {
        parsed: null,
        parseError: `JSON.parse nach heal scheiterte: ${(e as Error).message}`,
      };
    }
  }
  return {
    parsed: null,
    parseError: "JSON.parse scheiterte und heal-Fallback war keine Aenderung.",
  };
}

// ---------------------------------------------------------------------------
// Core: sculptRule
// ---------------------------------------------------------------------------

export async function sculptRule(
  nlInput: string,
  userId: string,
  depsOverride?: Partial<SculptDeps>
): Promise<SculptResult> {
  const deps: SculptDeps = { ...defaultSculptDeps(), ...depsOverride };
  const sessionId = deps.uuid();
  const transcriptSource = deps.transcriptSource ?? "text";
  const costs: number[] = [];

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userPrompt = buildSculptPrompt(nlInput, lastError);
    let llm: LLMResponse<string>;
    try {
      llm = await deps.invoke(SYSTEM_PROMPT, userPrompt);
    } catch (e) {
      const infraError = (e as Error).message;
      await insertAttempt(deps, userId, sessionId, {
        nl_input: nlInput,
        transcript_source: transcriptSource,
        sculptor_model_id: null,
        sculptor_cost_usd: 0,
        attempt_count: attempt,
        result_status: "infra_fail",
        result_payload: { infraError },
        sculpt_session_id: sessionId,
      });
      return {
        status: "infra_fail",
        infraError,
        totalCostUsd: sumSculptCosts(costs),
        attemptCount: attempt,
        sessionId,
      };
    }

    if (!llm.success || llm.data == null) {
      const infraError = llm.error ?? "queryLLM returned !success without error message";
      await insertAttempt(deps, userId, sessionId, {
        nl_input: nlInput,
        transcript_source: transcriptSource,
        sculptor_model_id: llm.modelId ?? null,
        sculptor_cost_usd: 0,
        attempt_count: attempt,
        result_status: "infra_fail",
        result_payload: { infraError },
        sculpt_session_id: sessionId,
      });
      return {
        status: "infra_fail",
        infraError,
        totalCostUsd: sumSculptCosts(costs),
        attemptCount: attempt,
        sessionId,
      };
    }

    const cost =
      llm.usage && llm.modelId
        ? safeCalculate(llm.usage, llm.modelId)
        : 0;
    costs.push(cost);

    const { parsed, parseError } = tryParseSculptResponse(llm.data);

    if (!parsed) {
      lastError = parseError ?? "Unknown parse error";
      await insertAttempt(deps, userId, sessionId, {
        nl_input: nlInput,
        transcript_source: transcriptSource,
        sculptor_model_id: llm.modelId ?? null,
        sculptor_cost_usd: cost,
        attempt_count: attempt,
        result_status: "validation_fail",
        result_payload: { parseError: lastError, raw: llm.data },
        sculpt_session_id: sessionId,
      });
      continue;
    }

    if (parsed.kind === "success") {
      await insertAttempt(deps, userId, sessionId, {
        nl_input: nlInput,
        transcript_source: transcriptSource,
        sculptor_model_id: llm.modelId ?? null,
        sculptor_cost_usd: cost,
        attempt_count: attempt,
        result_status: "success",
        result_payload: parsed.data,
        sculpt_session_id: sessionId,
      });
      return {
        status: "success",
        payload: parsed.data,
        totalCostUsd: sumSculptCosts(costs),
        attemptCount: attempt,
        sessionId,
      };
    }
    if (parsed.kind === "reject") {
      await insertAttempt(deps, userId, sessionId, {
        nl_input: nlInput,
        transcript_source: transcriptSource,
        sculptor_model_id: llm.modelId ?? null,
        sculptor_cost_usd: cost,
        attempt_count: attempt,
        result_status: "reject",
        result_payload: parsed.data,
        sculpt_session_id: sessionId,
      });
      return {
        status: "reject",
        reason: parsed.data,
        totalCostUsd: sumSculptCosts(costs),
        attemptCount: attempt,
        sessionId,
      };
    }
    // parsed.kind === "invalid"
    lastError = `zod-Validate scheiterte. Success-Errors: ${parsed.successErrors}. Reject-Errors: ${parsed.rejectErrors}.`;
    await insertAttempt(deps, userId, sessionId, {
      nl_input: nlInput,
      transcript_source: transcriptSource,
      sculptor_model_id: llm.modelId ?? null,
      sculptor_cost_usd: cost,
      attempt_count: attempt,
      result_status: "validation_fail",
      result_payload: { zodError: lastError, raw: llm.data },
      sculpt_session_id: sessionId,
    });
  }

  return {
    status: "validation_fail",
    lastError: lastError ?? "Unknown validation error after 2 attempts",
    totalCostUsd: sumSculptCosts(costs),
    attemptCount: 2,
    sessionId,
  };
}

function safeCalculate(
  usage: { input_tokens: number; output_tokens: number },
  modelId: string
): number {
  try {
    return calculateSculptCost(usage, modelId);
  } catch {
    return 0;
  }
}

async function insertAttempt(
  deps: SculptDeps,
  userId: string,
  sessionId: string,
  metadata: SculptAuditMetadata
): Promise<void> {
  try {
    await deps.auditInsert({
      actor_id: userId,
      action: "automation_rule.sculpt_attempt",
      entity_type: "automation_rule",
      entity_id: sessionId,
      changes: null,
      context: JSON.stringify(metadata),
    });
  } catch {
    // best-effort; never throw — Sculpt-Flow ist wichtiger als Audit-Trail.
  }
}
