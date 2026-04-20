"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KpiType } from "@/types/kpi-snapshots";

// ── Types ────────────────────────────────────────────────────

export type SnapshotTrendPoint = {
  date: string;
  value: number;
};

export type SnapshotComparison = {
  current: number;
  previous: number;
  changePercent: number | null;
};

// ── Trend ────────────────────────────────────────────────────

export async function getSnapshotTrend(
  kpiType: KpiType,
  days: number,
  productId?: string | null,
): Promise<SnapshotTrendPoint[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().split("T")[0];

  let query = admin
    .from("kpi_snapshots")
    .select("snapshot_date, kpi_value")
    .eq("user_id", user.id)
    .eq("kpi_type", kpiType)
    .eq("period", "day")
    .gte("snapshot_date", cutoffISO)
    .order("snapshot_date", { ascending: true });

  if (productId) {
    query = query.eq("product_id", productId);
  } else {
    query = query.is("product_id", null);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((row) => ({
    date: row.snapshot_date,
    value: Number(row.kpi_value),
  }));
}

// ── Comparison ───────────────────────────────────────────────

export async function getSnapshotComparison(
  kpiType: KpiType,
  currentPeriodStart: string,
  previousPeriodStart: string,
  productId?: string | null,
): Promise<SnapshotComparison> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { current: 0, previous: 0, changePercent: null };

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Get latest snapshot value in each period
  const buildQuery = (startDate: string, endDate: string) => {
    let q = admin
      .from("kpi_snapshots")
      .select("kpi_value")
      .eq("user_id", user.id)
      .eq("kpi_type", kpiType)
      .eq("period", "day")
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (productId) {
      q = q.eq("product_id", productId);
    } else {
      q = q.is("product_id", null);
    }

    return q;
  };

  const [currentResult, previousResult] = await Promise.all([
    buildQuery(currentPeriodStart, today),
    buildQuery(previousPeriodStart, currentPeriodStart),
  ]);

  const current = currentResult.data?.[0]
    ? Number(currentResult.data[0].kpi_value)
    : 0;
  const previous = previousResult.data?.[0]
    ? Number(previousResult.data[0].kpi_value)
    : 0;

  const changePercent =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return { current, previous, changePercent };
}
