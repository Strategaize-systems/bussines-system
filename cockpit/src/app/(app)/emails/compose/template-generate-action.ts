"use server";

// =============================================================
// generateEmailTemplate — Server Action
// =============================================================
// Erzeugt eine wiederverwendbare E-Mail-Vorlage aus einer kurzen
// User-Anweisung. on-click vom Composing-Studio (SLC-533), kein Auto-Call
// (DEC-052).
//
// Pattern: analog /api/ai/query (Auth, Rate-Limit, Bedrock, JSON-Parse) —
// aber als Server Action, weil der Aufrufer ohnehin serverseitig (Form
// Submit) ist und ein HTTP-Hop dazwischen unnoetig waere.

import { createClient } from "@/lib/supabase/server";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { parseLLMResponse } from "@/lib/ai/parser";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  EMAIL_TEMPLATE_GENERATE_SYSTEM_PROMPT,
  buildEmailTemplateGeneratePrompt,
  validateEmailTemplateGenerateResult,
  type EmailTemplateGenerateResult,
  type EmailTemplateLanguage,
} from "@/lib/ai/prompts/email-template-generate";

export type GenerateEmailTemplateResponse =
  | {
      success: true;
      data: EmailTemplateGenerateResult;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: string;
    };

const ALLOWED_LANGUAGES: readonly EmailTemplateLanguage[] = ["de", "en", "nl"];

export async function generateEmailTemplate(
  userPrompt: string,
  language: EmailTemplateLanguage = "de"
): Promise<GenerateEmailTemplateResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, error: "Nicht autorisiert" };
  }

  // 2. Input-Validation
  const trimmed = (userPrompt ?? "").trim();
  if (trimmed.length < 5) {
    return {
      success: false,
      data: null,
      error: "Bitte beschreibe die Vorlage etwas konkreter (mind. 5 Zeichen).",
    };
  }
  if (trimmed.length > 2000) {
    return {
      success: false,
      data: null,
      error: "Anweisung zu lang (max. 2000 Zeichen).",
    };
  }

  const lang: EmailTemplateLanguage = ALLOWED_LANGUAGES.includes(language)
    ? language
    : "de";

  // 3. Rate-Limit
  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return {
      success: false,
      data: null,
      error: `Rate Limit erreicht (${rateLimit.limit} Anfragen/Minute). Bitte in ${rateLimit.retryAfter} Sekunden erneut versuchen.`,
    };
  }

  // 4. Bedrock-Call
  const systemPrompt = EMAIL_TEMPLATE_GENERATE_SYSTEM_PROMPT;
  const prompt = buildEmailTemplateGeneratePrompt({
    userPrompt: trimmed,
    language: lang,
  });

  // Audit-Log: Provider, Region, Model — analog Whisper-Adapter (data-residency.md)
  // ENV-Key bewusst LLM_MODEL (gleiche Quelle wie bedrock-client.ts), damit
  // Audit-Log und tatsaechlicher Bedrock-Call nicht auseinanderlaufen.
  const region = process.env.AWS_REGION || "eu-central-1";
  const modelId =
    process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";
  console.info(
    `[ai-audit] generateEmailTemplate provider=bedrock region=${region} model=${modelId} user=${user.id} lang=${lang}`
  );

  const llmResult = await queryLLM(prompt, systemPrompt);

  if (!llmResult.success || !llmResult.data) {
    return {
      success: false,
      data: null,
      error: `KI-Anfrage fehlgeschlagen: ${llmResult.error}`,
    };
  }

  // 5. Parse + Validate
  const parsed = parseLLMResponse<EmailTemplateGenerateResult>(
    llmResult.data,
    validateEmailTemplateGenerateResult
  );

  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      data: null,
      error: "KI-Antwort nicht parsebar — bitte erneut versuchen.",
    };
  }

  return { success: true, data: parsed.data, error: null };
}
