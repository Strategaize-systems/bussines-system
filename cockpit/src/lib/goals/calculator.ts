import { createAdminClient } from "@/lib/supabase/admin";
import type { Goal, GoalProgress } from "@/types/goals";

// ── Period helpers ────────────────────────────────────────────

function getPeriodEnd(periodStart: string, period: string): Date {
  const start = new Date(periodStart);
  if (period === "month") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }
  if (period === "quarter") {
    return new Date(start.getFullYear(), start.getMonth() + 3, 1);
  }
  // year
  return new Date(start.getFullYear() + 1, 0, 1);
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Minimum thresholds ────────────────────────────────────────

const MIN_WON_DEALS_FOR_REVENUE = 1;
const MIN_CLOSED_DEALS_FOR_COUNT = 1;
const MIN_CLOSED_DEALS_FOR_WINRATE = 5;
const MIN_PIPELINE_DEALS = 3;

// ── Main calculator ───────────────────────────────────────────

export async function calculateGoalProgress(
  goal: Goal,
): Promise<GoalProgress> {
  const admin = createAdminClient();
  const periodStart = new Date(goal.period_start);
  const periodEnd = getPeriodEnd(goal.period_start, goal.period);
  const now = new Date();
  const daysElapsed = daysBetween(periodStart, now > periodEnd ? periodEnd : now);
  const daysTotal = daysBetween(periodStart, periodEnd);

  if (goal.type === "revenue") {
    return calculateRevenue(admin, goal, periodStart, periodEnd, daysElapsed, daysTotal);
  }
  if (goal.type === "deal_count") {
    return calculateDealCount(admin, goal, periodStart, periodEnd, daysElapsed, daysTotal);
  }
  return calculateWinRate(admin, goal, periodStart, periodEnd, daysElapsed, daysTotal);
}

// ── Revenue ───────────────────────────────────────────────────

async function calculateRevenue(
  admin: ReturnType<typeof createAdminClient>,
  goal: Goal,
  periodStart: Date,
  periodEnd: Date,
  daysElapsed: number,
  daysTotal: number,
): Promise<GoalProgress> {
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  // IST: Won deals in period
  let wonQuery = admin
    .from("deals")
    .select("value")
    .eq("status", "won")
    .gte("closed_at", startISO)
    .lt("closed_at", endISO);

  // Pipeline: Active deals
  let pipelineQuery = admin
    .from("deals")
    .select("value, stage_id, pipeline_stages(probability)")
    .eq("status", "active");

  // Product filter
  if (goal.product_id) {
    const dealIds = await getProductDealIds(admin, goal.product_id);
    if (dealIds.length > 0) {
      wonQuery = wonQuery.in("id", dealIds);
      pipelineQuery = pipelineQuery.in("id", dealIds);
    } else {
      return buildProgress(goal, 0, 0, 0, daysElapsed, daysTotal, false);
    }
  }

  const [wonResult, pipelineResult] = await Promise.all([
    wonQuery,
    pipelineQuery,
  ]);

  const wonDeals = wonResult.data ?? [];
  const currentValue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const pipelineDeals = pipelineResult.data ?? [];
  const pipelineForecast = pipelineDeals.reduce((sum, d: any) => {
    const prob = d.pipeline_stages?.probability ?? 0;
    return sum + (Number(d.value) || 0) * (prob / 100);
  }, 0);

  const hasEnoughData = wonDeals.length >= MIN_WON_DEALS_FOR_REVENUE ||
    pipelineDeals.length >= MIN_PIPELINE_DEALS;

  // Historic forecast
  const historicForecast = daysElapsed > 0
    ? (currentValue / daysElapsed) * daysTotal
    : 0;

  // Combined = IST + pipeline weighted
  const combinedForecast = currentValue + pipelineForecast;
  const delta = goal.target_value - combinedForecast;

  // Deals needed
  const avgDealValue = wonDeals.length > 0
    ? currentValue / wonDeals.length
    : (pipelineDeals.length > 0
        ? pipelineDeals.reduce((s, d) => s + (Number(d.value) || 0), 0) / pipelineDeals.length
        : 0);
  const dealsNeeded = avgDealValue > 0 ? Math.ceil(Math.max(0, delta) / avgDealValue) : null;

  return buildProgress(goal, currentValue, pipelineForecast, historicForecast, daysElapsed, daysTotal, hasEnoughData, dealsNeeded);
}

// ── Deal Count ────────────────────────────────────────────────

async function calculateDealCount(
  admin: ReturnType<typeof createAdminClient>,
  goal: Goal,
  periodStart: Date,
  periodEnd: Date,
  daysElapsed: number,
  daysTotal: number,
): Promise<GoalProgress> {
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  let wonQuery = admin
    .from("deals")
    .select("id", { count: "exact" })
    .eq("status", "won")
    .gte("closed_at", startISO)
    .lt("closed_at", endISO);

  let pipelineQuery = admin
    .from("deals")
    .select("id, pipeline_stages(probability)", { count: "exact" })
    .eq("status", "active");

  if (goal.product_id) {
    const dealIds = await getProductDealIds(admin, goal.product_id);
    if (dealIds.length > 0) {
      wonQuery = wonQuery.in("id", dealIds);
      pipelineQuery = pipelineQuery.in("id", dealIds);
    } else {
      return buildProgress(goal, 0, 0, 0, daysElapsed, daysTotal, false);
    }
  }

  const [wonResult, pipelineResult] = await Promise.all([
    wonQuery,
    pipelineQuery,
  ]);

  const currentValue = wonResult.count ?? 0;
  const pipelineDeals = pipelineResult.data ?? [];
  const pipelineForecast = pipelineDeals.reduce((sum, d: any) => {
    const prob = d.pipeline_stages?.probability ?? 0;
    return sum + (prob / 100);
  }, 0);

  const hasEnoughData = currentValue >= MIN_CLOSED_DEALS_FOR_COUNT ||
    pipelineDeals.length >= MIN_PIPELINE_DEALS;

  const historicForecast = daysElapsed > 0
    ? (currentValue / daysElapsed) * daysTotal
    : 0;

  const combinedForecast = currentValue + pipelineForecast;
  const delta = goal.target_value - combinedForecast;
  const dealsNeeded = Math.ceil(Math.max(0, delta));

  return buildProgress(goal, currentValue, pipelineForecast, historicForecast, daysElapsed, daysTotal, hasEnoughData, dealsNeeded);
}

// ── Win Rate ──────────────────────────────────────────────────

async function calculateWinRate(
  admin: ReturnType<typeof createAdminClient>,
  goal: Goal,
  periodStart: Date,
  periodEnd: Date,
  daysElapsed: number,
  daysTotal: number,
): Promise<GoalProgress> {
  const startISO = periodStart.toISOString();
  const endISO = periodEnd.toISOString();

  let wonQuery = admin
    .from("deals")
    .select("id", { count: "exact" })
    .eq("status", "won")
    .gte("closed_at", startISO)
    .lt("closed_at", endISO);

  let lostQuery = admin
    .from("deals")
    .select("id", { count: "exact" })
    .eq("status", "lost")
    .gte("closed_at", startISO)
    .lt("closed_at", endISO);

  if (goal.product_id) {
    const dealIds = await getProductDealIds(admin, goal.product_id);
    if (dealIds.length > 0) {
      wonQuery = wonQuery.in("id", dealIds);
      lostQuery = lostQuery.in("id", dealIds);
    } else {
      return buildProgress(goal, 0, 0, 0, daysElapsed, daysTotal, false);
    }
  }

  const [wonResult, lostResult] = await Promise.all([
    wonQuery,
    lostQuery,
  ]);

  const won = wonResult.count ?? 0;
  const lost = lostResult.count ?? 0;
  const total = won + lost;

  const currentValue = total > 0 ? (won / total) * 100 : 0;
  const hasEnoughData = total >= MIN_CLOSED_DEALS_FOR_WINRATE;

  // No pipeline/historic forecast meaningful for win rate
  const pipelineForecast = currentValue; // Current rate is best estimate
  const historicForecast = currentValue;
  const combinedForecast = currentValue;
  const delta = goal.target_value - currentValue;

  return buildProgress(goal, currentValue, pipelineForecast, historicForecast, daysElapsed, daysTotal, hasEnoughData, null);
}

// ── Helpers ───────────────────────────────────────────────────

async function getProductDealIds(
  admin: ReturnType<typeof createAdminClient>,
  productId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("deal_products")
    .select("deal_id")
    .eq("product_id", productId);
  return (data ?? []).map((r) => r.deal_id);
}

function buildProgress(
  goal: Goal,
  currentValue: number,
  pipelineForecast: number,
  historicForecast: number,
  daysElapsed: number,
  daysTotal: number,
  hasEnoughData: boolean,
  dealsNeeded?: number | null,
): GoalProgress {
  const combinedForecast = goal.type === "win_rate"
    ? currentValue
    : currentValue + pipelineForecast;
  const delta = goal.target_value - combinedForecast;
  const progressPercent = goal.target_value > 0
    ? Math.round((currentValue / goal.target_value) * 100)
    : 0;
  const periodEnd = getPeriodEnd(goal.period_start, goal.period);

  return {
    goalId: goal.id,
    goalType: goal.type,
    targetValue: goal.target_value,
    currentValue: Math.round(currentValue * 100) / 100,
    progressPercent,
    pipelineForecast: Math.round(pipelineForecast * 100) / 100,
    historicForecast: Math.round(historicForecast * 100) / 100,
    combinedForecast: Math.round(combinedForecast * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    dealsNeeded: dealsNeeded ?? null,
    hasEnoughData,
    periodStart: goal.period_start,
    periodEnd: periodEnd.toISOString().split("T")[0],
    daysElapsed,
    daysTotal,
    productId: goal.product_id,
  };
}
