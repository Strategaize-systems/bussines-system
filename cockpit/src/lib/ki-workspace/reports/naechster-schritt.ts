"use server";

import { invokeReport } from "./_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT,
  buildDealNaechsterSchrittPrompt,
} from "@/lib/ki-workspace/prompts/deal-naechster-schritt-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Naechster-Schritt-Empfehlung benoetigt einen Deal-Kontext");
  }

  const context = await loadDealContext(args.scope.dealId);
  const userPrompt = buildDealNaechsterSchrittPrompt({ context });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 768, temperature: 0.3 },
  });
}
