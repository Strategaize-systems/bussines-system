"use server";

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  CONVERSION_RATE_SYSTEM_PROMPT,
  buildConversionRatePrompt,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const userPrompt = buildConversionRatePrompt(ctx);
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: CONVERSION_RATE_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
