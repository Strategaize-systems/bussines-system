"use server";

import { invokeReport } from "./_shared";
import { getExceptionData } from "@/app/(app)/mein-tag/actions";
import {
  PIPELINE_RISIKO_SYSTEM_PROMPT,
  buildPipelineRisikoPrompt,
} from "@/lib/ki-workspace/prompts/pipeline-risiko-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const exceptions = await getExceptionData();

  const userPrompt = buildPipelineRisikoPrompt({ exceptions });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: PIPELINE_RISIKO_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
