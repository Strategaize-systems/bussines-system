"use server";

// =============================================================
// applyInlineEdit — Server Action (SLC-535 MT-2)
// =============================================================
// Modifiziert den Body einer im Composing-Studio offenen E-Mail
// gemaess transkribierter Sprach-Anweisung. Strikte Constraints
// (siehe email-inline-edit.ts), Audit-Log analog generateEmailTemplate.

import { createClient } from "@/lib/supabase/server";
import { queryLLM } from "@/lib/ai/bedrock-client";
import { parseLLMResponse } from "@/lib/ai/parser";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  EMAIL_INLINE_EDIT_SYSTEM_PROMPT,
  EMAIL_INLINE_EDIT_LANGUAGES,
  buildEmailInlineEditPrompt,
  validateEmailInlineEditResult,
  type EmailInlineEditLanguage,
  type EmailInlineEditResult,
} from "@/lib/ai/prompts/email-inline-edit";

export type ApplyInlineEditResponse =
  | {
      success: true;
      data: EmailInlineEditResult;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: string;
    };

const ALLOWED_LANGUAGES: readonly EmailInlineEditLanguage[] =
  EMAIL_INLINE_EDIT_LANGUAGES;

export async function applyInlineEdit(
  originalBody: string,
  transcript: string,
  language: EmailInlineEditLanguage = "de"
): Promise<ApplyInlineEditResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, error: "Nicht autorisiert" };
  }

  // 2. Input-Validation
  const trimmedTranscript = (transcript ?? "").trim();
  if (trimmedTranscript.length === 0) {
    return {
      success: false,
      data: null,
      error: "Keine Sprache erkannt. Bitte erneut diktieren.",
    };
  }

  const trimmedBody = (originalBody ?? "").trim();
  if (trimmedBody.length === 0) {
    return {
      success: false,
      data: null,
      error: "Body ist leer — kein Inline-Edit moeglich.",
    };
  }

  if (originalBody.length > 20000) {
    return {
      success: false,
      data: null,
      error: "Body zu lang (max. 20.000 Zeichen).",
    };
  }

  if (trimmedTranscript.length > 2000) {
    return {
      success: false,
      data: null,
      error: "Anweisung zu lang (max. 2000 Zeichen).",
    };
  }

  const lang: EmailInlineEditLanguage = ALLOWED_LANGUAGES.includes(language)
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
  const systemPrompt = EMAIL_INLINE_EDIT_SYSTEM_PROMPT;
  const prompt = buildEmailInlineEditPrompt({
    originalBody,
    transcript: trimmedTranscript,
    language: lang,
  });

  // Audit-Log: Provider, Region, Model — analog email-template-generate.
  // ENV-Key bewusst LLM_MODEL (gleiche Quelle wie bedrock-client.ts), damit
  // Audit-Log und tatsaechlicher Bedrock-Call nicht auseinanderlaufen
  // (IMP-169).
  const region = process.env.AWS_REGION || "eu-central-1";
  const modelId =
    process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";
  console.info(
    `[ai-audit] applyInlineEdit provider=bedrock region=${region} model=${modelId} user=${user.id} lang=${lang} bodyLen=${originalBody.length} transcriptLen=${trimmedTranscript.length}`
  );

  // maxTokens hochsetzen: Output muss den VOLLEN newBody enthalten, nicht nur
  // den geaenderten Teil. Default 2048 reicht nicht aus, wenn der Body zur
  // Vollausschoepfung des 20k-Char-Limits geht (~5000 Tokens). 6000 Tokens
  // decken 20k Chars + Reserve fuer summary-Feld ab.
  const llmResult = await queryLLM(prompt, systemPrompt, { maxTokens: 6000 });

  if (!llmResult.success || !llmResult.data) {
    return {
      success: false,
      data: null,
      error: `KI-Anfrage fehlgeschlagen: ${llmResult.error}`,
    };
  }

  // 5. Parse + Validate
  const parsed = parseLLMResponse<EmailInlineEditResult>(
    llmResult.data,
    validateEmailInlineEditResult
  );

  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      data: null,
      error: "KI-Antwort nicht parsebar — bitte erneut versuchen.",
    };
  }

  // 6. Identitaets-Check: KI hat den Body unveraendert zurueckgegeben →
  // vermutlich Anweisung nicht verstanden. Vergleich nach Trim + Whitespace-
  // Normalisierung, damit reine Whitespace-Aenderungen nicht als "Aenderung"
  // durchrutschen.
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
  if (normalize(parsed.data.newBody) === normalize(originalBody)) {
    return {
      success: false,
      data: null,
      error:
        "KI hat keine Aenderung vorgenommen. Bitte Anweisung praeziser formulieren.",
    };
  }

  return { success: true, data: parsed.data, error: null };
}
