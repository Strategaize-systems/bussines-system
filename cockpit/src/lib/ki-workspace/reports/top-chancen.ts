"use server";

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  TOP_CHANCEN_SYSTEM_PROMPT,
  buildTopChancenPrompt,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const userPrompt = buildTopChancenPrompt(ctx);
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: TOP_CHANCEN_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1536, temperature: 0.3 },
  });
}
