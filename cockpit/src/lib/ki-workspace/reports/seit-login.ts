"use server";

import { invokeReport } from "./_shared";
import { getUnseenEvents, updateLastLogin } from "@/app/(app)/mein-tag/actions";
import {
  SEIT_LOGIN_SYSTEM_PROMPT,
  buildSeitLoginPrompt,
} from "@/lib/ki-workspace/prompts/seit-login-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const events = await getUnseenEvents();

  const userPrompt = buildSeitLoginPrompt({ events });

  const result = await invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: SEIT_LOGIN_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });

  // After successful Bedrock-Call: roll the cutoff forward, parity with the
  // legacy ki-workspace.tsx loadUnseen flow. Failure is non-fatal — the next
  // run just shows the same window again.
  void updateLastLogin();

  return result;
}
