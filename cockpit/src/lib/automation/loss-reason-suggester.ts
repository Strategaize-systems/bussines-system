// V8 SLC-813 MT-2 — Core-Logic fuer suggestLossReason Server-Action.
//
// Architektur analog V7.5 SLC-752 sculptor.ts: Pure Core mit DI fuer
// Bedrock-Invoke + Supabase-Queries + Audit-Insert. Der Production-Wrapper
// `suggestLossReason` lebt in `pipeline/actions.ts` und baut die Default-Deps
// (queryLLM, real Supabase-Client, real Audit-Insert).
//
// Audit-Status (V8 DEC-225 — keine Schema-Migration):
//   - succeeded               — Bedrock-Call + Parse + Schema OK
//   - skipped_empty_context   — 0 Activities + 0 Emails (Bedrock-Skip)
//   - bedrock_error           — invoke schlug fehl
//   - parse_error             — JSON.parse + heal beide fehlgeschlagen
//   - schema_error            — JSON ok, Zod-Schema-Validation fehlgeschlagen
//   - deal_not_found          — Deal-Row existiert nicht

import type { LLMResponse, LLMOptions } from "@/lib/ai/types";
import {
  buildLossReasonPrompt,
  LOSS_REASON_SYSTEM_PROMPT,
  type LossReasonActivity,
  type LossReasonDeal,
  type LossReasonEmail,
} from "./loss-reason-prompt";
import {
  parseLossReasonResponse,
  type LossReasonSuggestion,
} from "./loss-reason-parser";
import { calculateSculptCost } from "./sculptor-cost";

export interface SuggestLossReasonResult {
  primary: string;
  alternatives: string[];
  costUsd: number;
}

export type SuggestLossReasonAuditStatus =
  | "succeeded"
  | "skipped_empty_context"
  | "bedrock_error"
  | "parse_error"
  | "schema_error"
  | "deal_not_found";

export interface SuggestLossReasonAuditContext {
  status: SuggestLossReasonAuditStatus;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  model_id: string | null;
  suggestion_count: number;
  error?: string;
}

export interface SuggestLossReasonDeps {
  /**
   * Bedrock-Aufrufer. Default: queryLLM aus lib/ai/bedrock-client (in der
   * Wrapper-Action gebunden).
   */
  invokeLLM: (
    userPrompt: string,
    systemPrompt: string,
    options?: LLMOptions
  ) => Promise<LLMResponse<string>>;
  fetchDealSnapshot: (dealId: string) => Promise<LossReasonDeal | null>;
  fetchActivities: (dealId: string) => Promise<readonly LossReasonActivity[]>;
  fetchEmails: (dealId: string) => Promise<readonly LossReasonEmail[]>;
  /**
   * Best-Effort-Audit-Insert. Fehlschlag blockiert NICHT — KI-Suggest-Pfad ist
   * fuer den User wichtiger als der Audit-Trail (analog sculptor.ts Pattern).
   */
  insertAudit: (
    dealId: string,
    context: SuggestLossReasonAuditContext
  ) => Promise<void>;
}

const LLM_OPTIONS: LLMOptions = {
  temperature: 0.3,
  maxTokens: 600,
  timeoutMs: 30_000,
};

/**
 * Pure-Core fuer den KI-Verlustgrund-Vorschlag. Returnt:
 *   - `SuggestLossReasonResult` bei Erfolg
 *   - `null` bei jedem Skip-/Error-Pfad (Audit dokumentiert den Grund)
 *
 * Wirft NICHT — der Aufrufer (Modal-Opener) soll auf null mit "kein KI-
 * Vorschlag, leeres Feld" reagieren.
 */
export async function suggestLossReasonCore(
  dealId: string,
  deps: SuggestLossReasonDeps
): Promise<SuggestLossReasonResult | null> {
  const deal = await deps.fetchDealSnapshot(dealId);
  if (!deal) {
    await safeAudit(deps, dealId, {
      status: "deal_not_found",
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      model_id: null,
      suggestion_count: 0,
    });
    return null;
  }

  const [activities, emails] = await Promise.all([
    deps.fetchActivities(dealId),
    deps.fetchEmails(dealId),
  ]);

  if (activities.length === 0 && emails.length === 0) {
    await safeAudit(deps, dealId, {
      status: "skipped_empty_context",
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      model_id: null,
      suggestion_count: 0,
    });
    return null;
  }

  const userPrompt = buildLossReasonPrompt(deal, activities, emails);

  let llm: LLMResponse<string>;
  try {
    llm = await deps.invokeLLM(userPrompt, LOSS_REASON_SYSTEM_PROMPT, LLM_OPTIONS);
  } catch (e) {
    await safeAudit(deps, dealId, {
      status: "bedrock_error",
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      model_id: null,
      suggestion_count: 0,
      error: (e as Error).message,
    });
    return null;
  }

  if (!llm.success || llm.data == null) {
    await safeAudit(deps, dealId, {
      status: "bedrock_error",
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
      model_id: llm.modelId ?? null,
      suggestion_count: 0,
      error: llm.error ?? "queryLLM returned !success without error",
    });
    return null;
  }

  const inputTokens = llm.usage?.input_tokens ?? 0;
  const outputTokens = llm.usage?.output_tokens ?? 0;
  const costUsd = computeCost(llm.usage, llm.modelId);

  const parsed = parseLossReasonResponse(llm.data);
  if (parsed.kind === "parse_error") {
    await safeAudit(deps, dealId, {
      status: "parse_error",
      cost_usd: costUsd,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model_id: llm.modelId ?? null,
      suggestion_count: 0,
      error: parsed.error,
    });
    return null;
  }
  if (parsed.kind === "schema_error") {
    await safeAudit(deps, dealId, {
      status: "schema_error",
      cost_usd: costUsd,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model_id: llm.modelId ?? null,
      suggestion_count: 0,
      error: parsed.error,
    });
    return null;
  }

  await safeAudit(deps, dealId, {
    status: "succeeded",
    cost_usd: costUsd,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    model_id: llm.modelId ?? null,
    suggestion_count: parsed.data.suggestions.length,
  });

  return {
    primary: formatSuggestion(parsed.data.suggestions[0]),
    alternatives: parsed.data.suggestions.slice(1).map(formatSuggestion),
    costUsd,
  };
}

function formatSuggestion(s: LossReasonSuggestion): string {
  return `${s.reason} (Quelle: ${s.source})`;
}

function computeCost(
  usage: { input_tokens: number; output_tokens: number } | undefined,
  modelId: string | undefined
): number {
  if (!usage || !modelId) return 0;
  try {
    return calculateSculptCost(usage, modelId);
  } catch {
    return 0;
  }
}

async function safeAudit(
  deps: SuggestLossReasonDeps,
  dealId: string,
  context: SuggestLossReasonAuditContext
): Promise<void> {
  try {
    await deps.insertAudit(dealId, context);
  } catch {
    // best-effort; audit failure must never block the suggest path.
  }
}
