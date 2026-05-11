"use server";

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  FORECAST_SYSTEM_PROMPT,
  buildForecastPrompt,
  currentQuarterRange,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const quarter = currentQuarterRange();
  const userPrompt = buildForecastPrompt({
    ctx,
    quarterStart: quarter.start,
    quarterEnd: quarter.end,
    quarterLabel: quarter.label,
  });
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: FORECAST_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
