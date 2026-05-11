"use server";

// SLC-666 MT-3 — Cockpit-Variant von winloss.ts (per-Deal).
// Hier aggregiert ueber alle Won+Lost-Deals der letzten 90 Tage.

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  WINLOSS_AGGREGATE_SYSTEM_PROMPT,
  buildWinLossAggregatePrompt,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const userPrompt = buildWinLossAggregatePrompt(ctx);
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: WINLOSS_AGGREGATE_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
