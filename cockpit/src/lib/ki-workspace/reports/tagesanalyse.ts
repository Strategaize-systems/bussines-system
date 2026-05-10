"use server";

import { invokeReport } from "./_shared";
import {
  getTodayItems,
  getCalendarEventsForToday,
  getExceptionData,
  getTopDeals,
} from "@/app/(app)/mein-tag/actions";
import { getDailyActivityKpis } from "@/app/actions/activity-kpis";
import {
  TAGESANALYSE_SYSTEM_PROMPT,
  buildTagesanalysePrompt,
} from "@/lib/ki-workspace/prompts/tagesanalyse-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const [todayData, calendarSlots, exceptions, topDeals, activityKpis] = await Promise.all([
    getTodayItems(),
    getCalendarEventsForToday(),
    getExceptionData(),
    getTopDeals(5),
    getDailyActivityKpis(),
  ]);

  const items = [...todayData.overdue, ...todayData.today, ...todayData.upcoming];
  const userPrompt = buildTagesanalysePrompt({
    items,
    calendarSlots,
    exceptions,
    topDeals,
    activityKpis,
  });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: TAGESANALYSE_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1024, temperature: 0.3 },
  });
}
