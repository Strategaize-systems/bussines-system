// =============================================================
// Signal Extractor — Core extraction logic (SLC-432, MT-2..4)
// =============================================================
//
// Takes source text (meeting summary or email body) + deal context,
// calls Bedrock Claude via the shared client, parses structured
// signals via Zod, filters by confidence threshold, and writes
// valid signals to the ai_action_queue.

import { queryLLM } from "@/lib/ai/bedrock-client";
import { createAction } from "@/lib/ai/action-queue";
import { searchKnowledge } from "@/lib/knowledge/search";
import type { AIActionSource, AIActionType } from "@/types/ai-queue";
import {
  SignalExtractionSchema,
  SIGNAL_EXTRACTION_SYSTEM_PROMPT,
  buildSignalPrompt,
} from "./prompts";
import type { ExtractedSignal, SignalDealContext } from "./prompts";

// ── Configuration ─────────────────────────────────────────────

const MIN_CONFIDENCE = parseFloat(
  process.env.AI_SIGNAL_MIN_CONFIDENCE || "0.4"
);

const EXPIRE_DAYS = parseInt(
  process.env.AI_SIGNAL_EXPIRE_DAYS || "7",
  10
);

// ── Public types ──────────────────────────────────────────────

export type SignalSourceType = "meeting" | "email" | "manual";

export interface SignalResult {
  signal: ExtractedSignal;
  queueItemId: string;
}

// ── Main entry point ──────────────────────────────────────────

/**
 * Extracts deal-property signals from source text and writes
 * qualifying signals (above confidence threshold) to the
 * ai_action_queue for human review.
 *
 * @param sourceText  - Meeting summary or email body text
 * @param dealContext - Current deal properties for comparison
 * @param sourceType  - Origin: meeting, email, or manual trigger
 * @param sourceId    - ID of the source record (meeting.id or email_message.id)
 * @returns Array of extracted signals with their queue item IDs
 */
export async function extractSignals(
  sourceText: string,
  dealContext: SignalDealContext,
  sourceType: SignalSourceType,
  sourceId: string,
): Promise<SignalResult[]> {
  if (!sourceText.trim()) {
    return [];
  }

  // ── MT-3: Optional RAG context lookup ─────────────────────
  let ragContext: string | undefined;

  if (dealContext.dealId) {
    try {
      const chunks = await searchKnowledge(sourceText, {
        scope: "deal",
        dealId: dealContext.dealId,
        limit: 5,
      });

      if (chunks.length > 0) {
        ragContext = chunks
          .map(
            (c, i) =>
              `[${i + 1}] (${c.source_type}, ${c.metadata.date ?? ""}): ${c.chunk_text.slice(0, 400)}`
          )
          .join("\n\n");
      }
    } catch (err) {
      // RAG is optional — log and continue without
      console.warn(
        "[signals] RAG lookup failed, continuing without:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // ── MT-2: Build prompt + call Bedrock ─────────────────────

  const userPrompt = buildSignalPrompt(sourceText, dealContext, ragContext);

  const llmResponse = await queryLLM(
    userPrompt,
    SIGNAL_EXTRACTION_SYSTEM_PROMPT,
    {
      temperature: 0.2,
      maxTokens: 2048,
      timeoutMs: 60_000,
    }
  );

  if (!llmResponse.success || !llmResponse.data) {
    console.error("[signals] LLM call failed:", llmResponse.error);
    return [];
  }

  // Parse via Zod
  const parsed = parseSignalResponse(llmResponse.data);
  if (!parsed || parsed.signals.length === 0) {
    return [];
  }

  // Filter by confidence threshold (DEC-052)
  const validSignals = parsed.signals.filter(
    (s) => s.confidence >= MIN_CONFIDENCE
  );

  if (validSignals.length === 0) {
    return [];
  }

  // ── MT-4: Write to ai_action_queue ────────────────────────

  const results: SignalResult[] = [];
  const expiresAt = getExpiryDate();

  for (const signal of validSignals) {
    try {
      const queueItem = await createAction({
        type: mapSignalToActionType(signal.type),
        action_description: buildActionDescription(signal, dealContext),
        reasoning: signal.reasoning,
        entity_type: "deal",
        entity_id: dealContext.dealId,
        context_json: {
          source_type: sourceType,
          source_id: sourceId,
          deal_name: dealContext.dealName,
          signal_type: signal.type,
        },
        priority: "normal",
        source: mapSourceToActionSource(sourceType),
        dedup_key: `signal_${sourceType}_${sourceId}_${signal.type}_${signal.field}`,
        expires_at: expiresAt,
        // V4.3 fields
        target_entity_type: "deal",
        target_entity_id: dealContext.dealId,
        proposed_changes: {
          field: signal.field,
          old: signal.current_value,
          new: signal.proposed_value,
        },
        confidence: signal.confidence,
      });

      results.push({ signal, queueItemId: queueItem.id });
    } catch (err) {
      console.error(
        `[signals] Failed to queue signal ${signal.type}/${signal.field}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return results;
}

// ── Response parsing ──────────────────────────────────────────

function parseSignalResponse(
  raw: string
): { signals: ExtractedSignal[] } | null {
  try {
    const trimmed = raw.trim();
    let json: unknown;

    // Try direct parse
    if (trimmed.startsWith("{")) {
      json = JSON.parse(trimmed);
    } else {
      // Try markdown code block
      const codeBlockMatch = trimmed.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?```/
      );
      if (codeBlockMatch?.[1]) {
        json = JSON.parse(codeBlockMatch[1].trim());
      } else {
        // Try find JSON object
        const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
        if (jsonMatch?.[1]) {
          json = JSON.parse(jsonMatch[1].trim());
        }
      }
    }

    if (!json) return null;

    // Validate with Zod
    const result = SignalExtractionSchema.safeParse(json);
    if (!result.success) {
      console.warn(
        "[signals] Zod validation failed:",
        result.error.message
      );
      return null;
    }

    return result.data;
  } catch (err) {
    console.error(
      "[signals] Failed to parse LLM response:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ── Mapping helpers ───────────────────────────────────────────

function mapSignalToActionType(
  signalType: ExtractedSignal["type"]
): AIActionType {
  switch (signalType) {
    case "stage_suggestion":
      return "status_change";
    case "value_update":
      return "value_change";
    case "tag_addition":
      return "tag_change";
    case "priority_change":
      return "property_change";
  }
}

function mapSourceToActionSource(
  sourceType: SignalSourceType
): AIActionSource {
  switch (sourceType) {
    case "meeting":
      return "signal_meeting";
    case "email":
      return "signal_email";
    case "manual":
      return "signal_manual";
  }
}

function buildActionDescription(
  signal: ExtractedSignal,
  dealContext: SignalDealContext,
): string {
  const dealName = dealContext.dealName;
  switch (signal.type) {
    case "stage_suggestion":
      return `Phase-Wechsel fuer "${dealName}": ${signal.current_value ?? "?"} → ${signal.proposed_value}`;
    case "value_update":
      return `Wert-Aktualisierung fuer "${dealName}": ${signal.current_value ?? "?"} → ${signal.proposed_value} EUR`;
    case "tag_addition":
      return `Tag hinzufuegen fuer "${dealName}": ${signal.proposed_value}`;
    case "priority_change":
      return `Prioritaet aendern fuer "${dealName}": ${signal.current_value ?? "?"} → ${signal.proposed_value}`;
  }
}

function getExpiryDate(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + EXPIRE_DAYS);
  return expiry.toISOString();
}
