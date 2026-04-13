// =============================================================
// LLM-Based Email Classifier — Bedrock Claude Sonnet classification
// =============================================================

import type { EmailClassification, EmailPriority } from "@/types/email";
import type { AIActionType } from "@/types/ai-queue";
import { queryLLM } from "../bedrock-client";
import { parseLLMResponse } from "../parser";
import type { SchemaValidator } from "../parser";
import {
  getEmailClassifySystemPrompt,
  buildEmailClassifyPrompt,
} from "../prompts/email-classify";

export interface LLMClassificationInput {
  subject: string | null;
  from_address: string;
  from_name: string | null;
  body_text: string | null;
  received_at: string;
  // CRM context
  contactName?: string | null;
  companyName?: string | null;
  dealTitle?: string | null;
  dealStage?: string | null;
  recentActivityCount?: number;
}

export interface LLMClassificationResult {
  classification: EmailClassification;
  priority: EmailPriority;
  suggested_action: AIActionType;
  action_description: string;
  gatekeeper_summary: string;
  reasoning: string;
}

// Valid values for LLM-returned classifications
// Note: "auto_reply", "newsletter", "unclassified" are handled by rule-based
// pre-filter — the LLM should never return them.
const VALID_CLASSIFICATIONS = new Set<string>([
  "anfrage",
  "antwort",
  "intern",
  "spam",
]);

const VALID_PRIORITIES = new Set<string>([
  "dringend",
  "normal",
  "niedrig",
  "irrelevant",
]);

const VALID_ACTIONS = new Set<string>([
  "reply",
  "followup",
  "meeting",
  "assign_contact",
  "reclassify",
  "task",
  "info",
]);

/**
 * Validates the parsed LLM response against expected schema.
 */
const validateEmailClassification: SchemaValidator<LLMClassificationResult> = (
  data: unknown
): LLMClassificationResult | null => {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  // classification — must be one of the LLM-allowed values
  if (
    typeof d.classification !== "string" ||
    !VALID_CLASSIFICATIONS.has(d.classification)
  ) {
    return null;
  }

  // priority — must be a valid EmailPriority
  if (typeof d.priority !== "string" || !VALID_PRIORITIES.has(d.priority)) {
    return null;
  }

  // suggested_action — must be a valid AIActionType
  if (
    typeof d.suggested_action !== "string" ||
    !VALID_ACTIONS.has(d.suggested_action)
  ) {
    return null;
  }

  // gatekeeper_summary — must be non-empty string
  if (typeof d.gatekeeper_summary !== "string" || !d.gatekeeper_summary.trim()) {
    return null;
  }

  // action_description — must be a string (can be empty)
  if (typeof d.action_description !== "string") return null;

  // reasoning — must be a string (can be empty)
  if (typeof d.reasoning !== "string") return null;

  return {
    classification: d.classification as EmailClassification,
    priority: d.priority as EmailPriority,
    suggested_action: d.suggested_action as AIActionType,
    action_description: d.action_description,
    gatekeeper_summary: d.gatekeeper_summary,
    reasoning: d.reasoning,
  };
};

/**
 * Classify an email using Bedrock LLM.
 * Returns null if the LLM call fails (caller should fall back to defaults).
 */
export async function classifyByLLM(
  input: LLMClassificationInput
): Promise<LLMClassificationResult | null> {
  const systemPrompt = getEmailClassifySystemPrompt();
  const userPrompt = buildEmailClassifyPrompt(input);

  // Call Bedrock with low temperature for deterministic classification
  const llmResponse = await queryLLM(userPrompt, systemPrompt, {
    temperature: 0.2,
    maxTokens: 1024,
  });

  if (!llmResponse.success || !llmResponse.data) {
    console.error(
      "[llm-based] Bedrock classification failed:",
      llmResponse.error
    );
    return null;
  }

  // Parse and validate the response
  const parsed = parseLLMResponse(llmResponse.data, validateEmailClassification);

  if (!parsed.success || !parsed.data) {
    console.error(
      "[llm-based] Failed to parse classification response:",
      parsed.error
    );
    return null;
  }

  return parsed.data;
}
