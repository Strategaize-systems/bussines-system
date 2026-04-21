import { Suspense } from "react";
import { getGoalsWithProgress } from "@/app/actions/goals";
import { getSnapshotComparison } from "@/app/actions/kpi-snapshots";
import { PeriodToggle, type PeriodValue } from "@/components/performance/period-toggle";
import { GoalCard } from "@/components/performance/goal-card";
import { ForecastBlock } from "@/components/performance/forecast-block";
import { ProductBreakdown } from "@/components/performance/product-breakdown";
import { TrendComparison } from "@/components/performance/trend-comparison";
import { PerformanceEmptyState } from "@/components/performance/empty-state";
import { AiRecommendation } from "@/components/performance/ai-recommendation";
import { DailyActivityCheck } from "@/components/performance/daily-activity-check";
import { getDailyActivityKpis, getWeeklyActivityKpisPerDay } from "@/app/actions/activity-kpis";
import { BarChart3, Settings } from "lucide-react";
import Link from "next/link";
import type { KpiType } from "@/types/kpi-snapshots";

function getPeriodDates(period: PeriodValue): {
  currentStart: string;
  previousStart: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "month") {
    const currentStart = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const prevMonth = m === 0 ? 11 : m - 1;
    const prevYear = m === 0 ? y - 1 : y;
    const previousStart = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    return { currentStart, previousStart };
  }

  if (period === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    const currentStart = `${y}-${String(qStart + 1).padStart(2, "0")}-01`;
    const prevQStart = qStart - 3;
    const prevYear = prevQStart < 0 ? y - 1 : y;
    const prevMonth = prevQStart < 0 ? prevQStart + 12 : prevQStart;
    const previousStart = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    return { currentStart, previousStart };
  }

  // year
  return {
    currentStart: `${y}-01-01`,
    previousStart: `${y - 1}-01-01`,
  };
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: PeriodValue =
    params.period === "month" || params.period === "quarter" || params.period === "year"
      ? params.period
      : "year";

  const [goals, activityKpis, weeklyPerDay] = await Promise.all([
    getGoalsWithProgress({ period }),
    getDailyActivityKpis(),
    getWeeklyActivityKpisPerDay(),
  ]);

  if (goals.length === 0) {
    return (
      <main className="px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Meine Performance</h1>
              <p className="text-sm text-muted-foreground">
                Ziele, Prognosen und Trends
              </p>
            </div>
          </div>
          <Suspense>
            <PeriodToggle current={period} />
          </Suspense>
        </div>
        <PerformanceEmptyState />
      </main>
    );
  }

  // Trend comparison data
  const { currentStart, previousStart } = getPeriodDates(period);
  const trendKpis: { label: string; kpiType: KpiType; unit: string }[] = [
    { label: "Umsatz", kpiType: "revenue_won", unit: "EUR" },
    { label: "Deals", kpiType: "deal_count_won", unit: "Deals" },
    { label: "Abschlussquote", kpiType: "win_rate", unit: "%" },
  ];

  const trendComparisons = await Promise.all(
    trendKpis.map(async (t) => ({
      ...t,
      comparison: await getSnapshotComparison(t.kpiType, currentStart, previousStart),
    }))
  );

  // Split goals: overall goals vs. product goals
  const overallGoals = goals.filter((g) => !g.product_id);

  return (
    <main className="px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Meine Performance</h1>
            <p className="text-sm text-muted-foreground">
              Ziele, Prognosen und Trends
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <PeriodToggle current={period} />
          </Suspense>
          <Link
            href="/performance/goals"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Ziele verwalten
          </Link>
        </div>
      </div>

      {/* KPI Goal Cards + Forecast */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overallGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        <ForecastBlock goals={overallGoals} />
      </div>

      {/* AI Recommendation */}
      <AiRecommendation progressData={overallGoals.map((g) => g.progress)} />

      {/* Daily Activity Check */}
      <DailyActivityCheck kpis={activityKpis} weeklyPerDay={weeklyPerDay} />

      {/* Product Breakdown */}
      <ProductBreakdown goals={goals} />

      {/* Trend Comparison */}
      <TrendComparison rows={trendComparisons} />
    </main>
  );
}
