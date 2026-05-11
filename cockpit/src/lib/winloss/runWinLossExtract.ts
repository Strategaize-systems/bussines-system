// SLC-665 MT-6 (DEC-171) — Bedrock-Wrapper fuer Win/Loss-Extract.
//
// Wiederverwendet die FEAT-114-Loss-Analysis-Logik (gleicher Prompt fuer
// won/lost — der Prompt selbst klassifiziert anhand der Daten). Aufgerufen
// sowohl vom Auto-Trigger (`auto_winloss_extract.ts`) als auch vom manuellen
// Re-Run-Pfad (`reports/winloss.ts`).

import { queryLLM } from "@/lib/ai/bedrock-client";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_WINLOSS_SYSTEM_PROMPT,
  buildDealWinLossPrompt,
} from "@/lib/ki-workspace/prompts/deal-winloss-prompt";

export interface RunWinLossExtractArgs {
  dealId: string;
  targetStatus: "won" | "lost";
}

export interface RunWinLossExtractResult {
  markdown: string;
  model: string;
  completedAt: string;
}

const MODEL_ID =
  process.env.LLM_MODEL || "eu.anthropic.claude-sonnet-4-6-20250514-v1:0";

export async function runWinLossExtract(
  args: RunWinLossExtractArgs
): Promise<RunWinLossExtractResult> {
  // Wir nutzen denselben Loader wie der manuelle Bericht — same context,
  // same prompt. Target-Status ist im Deal-State enthalten (deal.status),
  // der Prompt klassifiziert das selbststaendig.
  const context = await loadDealContext(args.dealId);
  const userPrompt = buildDealWinLossPrompt({ context });

  const llm = await queryLLM(userPrompt, DEAL_WINLOSS_SYSTEM_PROMPT, {
    maxTokens: 1280,
    temperature: 0.3,
  });

  if (!llm.success || !llm.data) {
    throw new Error(llm.error ?? "Bedrock-Call fehlgeschlagen");
  }

  return {
    markdown: llm.data.trim(),
    model: MODEL_ID,
    completedAt: new Date().toISOString(),
  };
}
