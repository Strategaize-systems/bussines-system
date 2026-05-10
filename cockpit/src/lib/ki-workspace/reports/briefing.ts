"use server";

import { invokeReport } from "./_shared";
import { loadDealContext } from "@/lib/ki-workspace/deal-context";
import {
  DEAL_BRIEFING_SYSTEM_PROMPT,
  buildDealBriefingPrompt,
} from "@/lib/ki-workspace/prompts/deal-briefing-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  if (!args.scope.dealId) {
    throw new Error("Briefing benoetigt einen Deal-Kontext");
  }

  const context = await loadDealContext(args.scope.dealId);
  const userPrompt = buildDealBriefingPrompt({ context });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: DEAL_BRIEFING_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
