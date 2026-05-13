// SLC-705 MT-4
"use server";

import { invokeTeamReport } from "./_shared";
import { loadTeamContext } from "@/lib/ki-workspace/team-context";
import {
  TEAM_BURNOUT_SYSTEM_PROMPT,
  buildTeamBurnoutPrompt,
} from "@/lib/ki-workspace/prompts/team-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadTeamContext();
  const userPrompt = buildTeamBurnoutPrompt({ ctx });
  return invokeTeamReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: TEAM_BURNOUT_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1280, temperature: 0.3 },
  });
}
