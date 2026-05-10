"use server";

import { invokeReport } from "./_shared";
import { getGoalsWithProgress } from "@/app/actions/goals";
import {
  getDailyActivityKpis,
  getWeeklyActivityKpisPerDay,
} from "@/app/actions/activity-kpis";
import { getSnapshotComparison } from "@/app/actions/kpi-snapshots";
import {
  WOCHEN_PERFORMANCE_SYSTEM_PROMPT,
  buildWochenPerformancePrompt,
  type TrendEntry,
} from "@/lib/ki-workspace/prompts/wochen-performance-prompt";
import type { RunReportArgs, ReportResult } from "@/components/ki-workspace/types";
import type { KpiType } from "@/types/kpi-snapshots";

const TREND_KPIS: { label: string; kpiType: KpiType; unit: string }[] = [
  { label: "Umsatz", kpiType: "revenue_won", unit: "EUR" },
  { label: "Deals", kpiType: "deal_count_won", unit: "Deals" },
  { label: "Abschlussquote", kpiType: "win_rate", unit: "%" },
];

function currentAndPreviousMonthStart(): { currentStart: string; previousStart: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const currentStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const prevMonth = m === 0 ? 11 : m - 1;
  const prevYear = m === 0 ? y - 1 : y;
  const previousStart = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
  return { currentStart, previousStart };
}

export async function runReport(args: RunReportArgs): Promise<ReportResult> {
  const [goalsWithProgress, todayActivityKpis, weeklyActivityKpis] = await Promise.all([
    getGoalsWithProgress({ period: "month" }),
    getDailyActivityKpis(),
    getWeeklyActivityKpisPerDay(),
  ]);

  const { currentStart, previousStart } = currentAndPreviousMonthStart();
  const trendComparisons: TrendEntry[] = await Promise.all(
    TREND_KPIS.map(async (t) => ({
      ...t,
      comparison: await getSnapshotComparison(t.kpiType, currentStart, previousStart),
    })),
  );

  const userPrompt = buildWochenPerformancePrompt({
    goalsWithProgress,
    todayActivityKpis,
    weeklyActivityKpis,
    trendComparisons,
  });

  return invokeReport({
    reportId: args.reportId,
    scope: args.scope,
    systemPrompt: WOCHEN_PERFORMANCE_SYSTEM_PROMPT,
    userPrompt,
    llmOptions: { maxTokens: 1536, temperature: 0.3 },
  });
}
