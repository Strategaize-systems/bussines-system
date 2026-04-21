/**
 * KI-basierter Contact-Matcher (FEAT-505, Stufe 2)
 *
 * Nutzt Bedrock Claude Sonnet um eingehende E-Mails ohne Kontakt-Zuordnung
 * einem bekannten Kontakt zuzuordnen. Wird im Classify-Cron aufgerufen.
 */

import { queryLLM } from "../bedrock-client";
import { parseLLMResponse } from "../parser";
import type { SchemaValidator } from "../parser";
import {
  getContactMatchSystemPrompt,
  buildContactMatchPrompt,
  type ContactMatchInput,
} from "../prompts/contact-match";

export interface ContactMatchResult {
  contactId: string | null;
  confidence: number;
  reasoning: string;
}

const validator: SchemaValidator<ContactMatchResult> = (parsed: unknown) => {
  const obj = parsed as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) return null;

  const contactId = obj.contact_id as string | null;
  const confidence = typeof obj.confidence === "number" ? obj.confidence : 0;
  const reasoning = typeof obj.reasoning === "string" ? obj.reasoning : "";

  return {
    contactId: contactId || null,
    confidence: Math.max(0, Math.min(1, confidence)),
    reasoning,
  };
};

export async function matchContactByAI(
  input: ContactMatchInput
): Promise<ContactMatchResult | null> {
  if (input.contacts.length === 0) {
    return { contactId: null, confidence: 0, reasoning: "Keine Kontakte in der Datenbank" };
  }

  try {
    const systemPrompt = getContactMatchSystemPrompt();
    const userPrompt = buildContactMatchPrompt(input);

    const llmResponse = await queryLLM(userPrompt, systemPrompt, { maxTokens: 300 });

    if (!llmResponse.success || !llmResponse.data) {
      console.error("[ContactMatcherAI] LLM failed:", llmResponse.error);
      return null;
    }

    const parsed = parseLLMResponse(llmResponse.data, validator);

    if (!parsed.success || !parsed.data) {
      console.error("[ContactMatcherAI] Parse failed:", parsed.error);
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.error("[ContactMatcherAI] Error:", err);
    return null;
  }
}
