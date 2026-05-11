"use server";

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  STAGNIERENDE_DEALS_SYSTEM_PROMPT,
  buildStagnierendeDealsPrompt,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

const DEFAULT_THRESHOLD_DAYS = 14;

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const userPrompt = buildStagnierendeDealsPrompt({
    ctx,
    thresholdDays: DEFAULT_THRESHOLD_DAYS,
    now: new Date(),
  });
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: STAGNIERENDE_DEALS_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
