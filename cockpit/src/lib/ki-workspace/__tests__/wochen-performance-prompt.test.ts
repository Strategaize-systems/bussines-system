import { describe, it, expect } from "vitest";
import {
  WOCHEN_PERFORMANCE_SYSTEM_PROMPT,
  buildWochenPerformancePrompt,
  type WochenPerformanceInput,
} from "../prompts/wochen-performance-prompt";
import type { GoalWithProgress } from "@/app/actions/goals";

const REVENUE_GOAL: GoalWithProgress = {
  id: "g1",
  user_id: "u1",
  type: "revenue",
  period: "month",
  period_start: "2026-05-01",
  target_value: 100000,
  product_id: null,
  status: "active",
  source: "manual",
  notes: null,
  created_at: "",
  updated_at: "",
  product_name: null,
  progress: {
    goalId: "g1",
    goalType: "revenue",
    productId: null,
    targetValue: 100000,
    currentValue: 60000,
    progressPercent: 60,
    pipelineForecast: 90000,
    historicForecast: 85000,
    combinedForecast: 87500,
    delta: -10000,
    dealsNeeded: 4,
    hasEnoughData: true,
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    daysElapsed: 10,
    daysTotal: 31,
  },
};

const PRODUCT_GOAL: GoalWithProgress = {
  ...REVENUE_GOAL,
  id: "g2",
  type: "deal_count",
  product_id: "p1",
  product_name: "Workshop",
  target_value: 5,
  progress: { ...REVENUE_GOAL.progress, goalId: "g2", goalType: "deal_count", productId: "p1", targetValue: 5, currentValue: 3, progressPercent: 60, pipelineForecast: 5, historicForecast: 4, combinedForecast: 4, delta: -2, dealsNeeded: 2 },
};

const EMPTY_INPUT: WochenPerformanceInput = {
  goalsWithProgress: [],
  todayActivityKpis: [],
  weeklyActivityKpis: [],
  trendComparisons: [],
};

describe("wochen-performance system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = WOCHEN_PERFORMANCE_SYSTEM_PROMPT.indexOf("## Goal-Progress");
    const b = WOCHEN_PERFORMANCE_SYSTEM_PROMPT.indexOf("## Aktivitaeten-Soll-Ist pro Tag");
    const c = WOCHEN_PERFORMANCE_SYSTEM_PROMPT.indexOf("## KI-Empfehlung");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("buildWochenPerformancePrompt", () => {
  it("falls back to a single Hinweis section when no goals are configured", () => {
    const out = buildWochenPerformancePrompt(EMPTY_INPUT);
    expect(out).toContain("KEINE GOALS KONFIGURIERT");
    expect(out).toContain("Hinweis");
    expect(out).not.toContain("=== GOAL-PROGRESS — GESAMT ===");
  });

  it("renders gesamt + product goals separately", () => {
    const out = buildWochenPerformancePrompt({
      ...EMPTY_INPUT,
      goalsWithProgress: [REVENUE_GOAL, PRODUCT_GOAL],
    });
    expect(out).toContain("=== GOAL-PROGRESS — GESAMT ===");
    expect(out).toContain("=== GOAL-PROGRESS — PRO PRODUKT ===");
    expect(out).toContain("Umsatz (Gesamt)");
    expect(out).toContain("Abschluesse (Workshop)");
    expect(out).toContain("Ist 60000 EUR / Soll 100000 EUR (60%)");
    expect(out).toContain("Pipeline-Forecast 90000 EUR");
    expect(out).toContain("Noch 2 Deals noetig");
    expect(out).toContain("Datenbasis ausreichend");
  });

  it("renders trend comparisons with EUR / pp formatting", () => {
    const out = buildWochenPerformancePrompt({
      ...EMPTY_INPUT,
      goalsWithProgress: [REVENUE_GOAL],
      trendComparisons: [
        {
          label: "Umsatz",
          kpiType: "revenue_won",
          unit: "EUR",
          comparison: { current: 60000, previous: 50000, changePercent: 20 },
        },
        {
          label: "Abschlussquote",
          kpiType: "win_rate",
          unit: "%",
          comparison: { current: 35, previous: 30, changePercent: 17 },
        },
      ],
    });
    expect(out).toContain("Umsatz: 60000 EUR (Vorperiode 50000 EUR, +20%)");
    expect(out).toContain("Abschlussquote: 35 % (Vorperiode 30 %, +5pp)");
  });

  it("renders weekly activity per-day with isToday marker", () => {
    const out = buildWochenPerformancePrompt({
      ...EMPTY_INPUT,
      goalsWithProgress: [REVENUE_GOAL],
      weeklyActivityKpis: [
        {
          kpiKey: "calls",
          label: "Telefonate",
          dailyTarget: 10,
          days: [
            { date: "2026-05-04", dayLabel: "Mo", actual: 8, isToday: false },
            { date: "2026-05-05", dayLabel: "Di", actual: 12, isToday: false },
            { date: "2026-05-06", dayLabel: "Mi", actual: 9, isToday: false },
            { date: "2026-05-07", dayLabel: "Do", actual: 4, isToday: true },
            { date: "2026-05-08", dayLabel: "Fr", actual: 0, isToday: false },
          ],
        },
      ],
    });
    expect(out).toContain("Telefonate: Mo 8/10 | Di 12/10 | Mi 9/10 | Do 4/10* | Fr 0/10");
  });
});
