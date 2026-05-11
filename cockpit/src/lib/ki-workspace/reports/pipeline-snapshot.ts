"use server";

import { invokeReport } from "./_shared";
import { loadCockpitContext } from "@/lib/ki-workspace/cockpit-context";
import {
  PIPELINE_SNAPSHOT_SYSTEM_PROMPT,
  buildPipelineSnapshotPrompt,
} from "@/lib/ki-workspace/prompts/cockpit-prompts";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const ctx = await loadCockpitContext();
  const userPrompt = buildPipelineSnapshotPrompt(ctx);
  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: PIPELINE_SNAPSHOT_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
