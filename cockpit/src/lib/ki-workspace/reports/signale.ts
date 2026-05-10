"use server";

import { invokeReport } from "./_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_SIGNALE_SYSTEM_PROMPT,
  buildDealSignalePrompt,
} from "@/lib/ki-workspace/prompts/deal-signale-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Signal-Extraktion benoetigt einen Deal-Kontext");
  }

  const context = await loadDealContext(args.scope.dealId);
  const userPrompt = buildDealSignalePrompt({ context });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_SIGNALE_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.2 },
  });
}
