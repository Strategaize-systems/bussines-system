"use server";

import { invokeReport } from "./_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_RISIKEN_SYSTEM_PROMPT,
  buildDealRisikenPrompt,
} from "@/lib/ki-workspace/prompts/deal-risiken-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Risiko-Analyse benoetigt einen Deal-Kontext");
  }

  const context = await loadDealContext(args.scope.dealId);
  const userPrompt = buildDealRisikenPrompt({ context });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_RISIKEN_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
