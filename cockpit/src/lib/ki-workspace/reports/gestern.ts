"use server";

import { invokeReport } from "./_shared";
import { getYesterdayReview } from "@/app/(app)/mein-tag/actions";
import {
  GESTERN_SYSTEM_PROMPT,
  buildGesternPrompt,
} from "@/lib/ki-workspace/prompts/gestern-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const review = await getYesterdayReview();

  const userPrompt = buildGesternPrompt({ review });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: GESTERN_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
