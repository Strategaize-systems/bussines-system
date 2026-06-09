"use server";

import { createClient } from "@/lib/supabase/server";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { revalidatePath } from "next/cache";
import type { ActivityKpiKey, ActivityKpiTarget, ActivityKpiStatus, WeekDayKpiStatus } from "@/types/activity-kpis";
import { ACTIVITY_KPI_LABELS } from "@/types/activity-kpis";
import { getActivityKpiActual, getActivityKpiActualForRange, dayRangesForWeek } from "@/lib/goals/activity-kpi-queries";

// V8.12 SLC-906 MT-6 (SLC-901 M-1): User-Client-Switch fuer alle
// activity_kpi_targets-Operations + helpers. RLS Klasse-A
// activity_kpi_targets_{select,insert,update,delete} (user_id=auth.uid() OR
// is_admin()) greift fuer eigene Targets. Helper-Counts auf activities/
// meetings/deals laufen ueber Klasse-C-RLS — Member-scoped.
// Defense-in-Depth: kein createAdminClient mehr in diesem File.

// ── List targets ─────────────────────────────────────────────

export async function listActivityKpiTargets(): Promise<ActivityKpiTarget[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("activity_kpi_targets")
    .select("*")
    .eq("user_id", user.id)
    .order("kpi_key");

  return (data ?? []) as ActivityKpiTarget[];
}

// ── Upsert target ────────────────────────────────────────────

export async function upsertActivityKpiTarget(
  kpiKey: ActivityKpiKey,
  dailyTarget: number,
): Promise<{ error?: string }> {
  await assertNotReadOnlyContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  if (dailyTarget < 0) return { error: "Sollwert darf nicht negativ sein" };

  // Check if exists
  const { data: existing } = await supabase
    .from("activity_kpi_targets")
    .select("id")
    .eq("user_id", user.id)
    .eq("kpi_key", kpiKey)
    .single();

  if (existing) {
    await supabase
      .from("activity_kpi_targets")
      .update({ daily_target: dailyTarget, active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("activity_kpi_targets").insert({
      user_id: user.id,
      kpi_key: kpiKey,
      daily_target: dailyTarget,
      active: true,
    });
  }

  revalidatePath("/settings/goals");
  return {};
}

// ── Toggle active ────────────────────────────────────────────

export async function toggleActivityKpiTarget(
  kpiKey: ActivityKpiKey,
  active: boolean,
): Promise<{ error?: string }> {
  await assertNotReadOnlyContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  await supabase
    .from("activity_kpi_targets")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("kpi_key", kpiKey);

  revalidatePath("/settings/goals");
  return {};
}

// ── Get daily activity KPIs with actuals ─────────────────────

export async function getDailyActivityKpis(): Promise<ActivityKpiStatus[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: targets } = await supabase
    .from("activity_kpi_targets")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("kpi_key");

  if (!targets || targets.length === 0) return [];

  const results: ActivityKpiStatus[] = [];
  for (const t of targets) {
    const kpiKey = t.kpi_key as ActivityKpiKey;
    const [todayActual, weekActual] = await Promise.all([
      getActivityKpiActual(supabase, kpiKey, "today"),
      getActivityKpiActual(supabase, kpiKey, "week"),
    ]);

    // Week target = daily * 5 (workdays)
    const weekTarget = kpiKey === "deals_stagnant" ? t.daily_target : t.daily_target * 5;

    results.push({
      kpiKey,
      label: ACTIVITY_KPI_LABELS[kpiKey] ?? kpiKey,
      dailyTarget: t.daily_target,
      todayActual,
      weekTarget,
      weekActual,
      active: t.active,
    });
  }

  return results;
}

// ── Get weekly activity KPIs per day (Mo-Fr) ────────────────

export async function getWeeklyActivityKpisPerDay(): Promise<WeekDayKpiStatus[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: targets } = await supabase
    .from("activity_kpi_targets")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("kpi_key");

  if (!targets || targets.length === 0) return [];

  const days = dayRangesForWeek();
  const results: WeekDayKpiStatus[] = [];

  for (const t of targets) {
    const kpiKey = t.kpi_key as ActivityKpiKey;

    const dayActuals = await Promise.all(
      days.map(async (day) => ({
        date: day.date,
        dayLabel: day.dayLabel,
        actual: await getActivityKpiActualForRange(supabase, kpiKey, day.start, day.end),
        isToday: day.isToday,
      }))
    );

    results.push({
      kpiKey,
      label: ACTIVITY_KPI_LABELS[kpiKey] ?? kpiKey,
      dailyTarget: t.daily_target,
      days: dayActuals,
    });
  }

  return results;
}

// ── Get weekly comparison (this week vs last week) ───────────

export async function getWeeklyComparison(): Promise<{
  thisWeek: number;
  lastWeek: number;
  changePercent: number | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { thisWeek: 0, lastWeek: 0, changePercent: null };

  // Count all activities this week vs last week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  const [thisWeekResult, lastWeekResult] = await Promise.all([
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thisMonday.toISOString())
      .lt("created_at", nextMonday.toISOString()),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastMonday.toISOString())
      .lt("created_at", thisMonday.toISOString()),
  ]);

  const thisWeek = thisWeekResult.count ?? 0;
  const lastWeek = lastWeekResult.count ?? 0;
  const changePercent = lastWeek > 0
    ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    : null;

  return { thisWeek, lastWeek, changePercent };
}
