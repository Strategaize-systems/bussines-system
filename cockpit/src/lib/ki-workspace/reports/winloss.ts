"use server";

import { invokeReport } from "./_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_WINLOSS_SYSTEM_PROMPT,
  buildDealWinLossPrompt,
} from "@/lib/ki-workspace/prompts/deal-winloss-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Win/Loss-Analyse benoetigt einen Deal-Kontext");
  }

  const context = await loadDealContext(args.scope.dealId);
  const userPrompt = buildDealWinLossPrompt({ context });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_WINLOSS_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
