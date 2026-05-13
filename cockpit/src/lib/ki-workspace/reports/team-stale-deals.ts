// SLC-705 MT-4
"use server";

import { invokeTeamReport } from "./_shared";
import { loadTeamContext } from "@/lib/ki-workspace/team-context";
import {
  TEAM_STALE_DEALS_SYSTEM_PROMPT,
  buildTeamStaleDealsPrompt,
} from "@/lib/ki-workspace/prompts/team-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadTeamContext();
  const userPrompt = buildTeamStaleDealsPrompt({ ctx });
  return invokeTeamReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: TEAM_STALE_DEALS_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
