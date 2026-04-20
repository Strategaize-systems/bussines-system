import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateRevenueWon,
  calculateDealCountWon,
  calculateWinRate,
  calculatePipelineWeighted,
  calculatePipelineUnweighted,
  calculateAvgDealValue,
  calculateActivityCount,
  calculateProductRevenue,
  calculateProductDealCount,
} from "@/lib/goals/kpi-queries";

export const maxDuration = 60;

type KpiEntry = {
  snapshot_date: string;
  user_id: string;
  kpi_type: string;
  kpi_value: number;
  product_id: string | null;
  period: string;
  calculation_basis: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    console.log(`[Cron/KPI-Snapshot] Starting for date=${today}`);

    // Single-user: get first active profile
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .limit(1);

    if (!profiles || profiles.length === 0) {
      console.log("[Cron/KPI-Snapshot] No profiles found, skipping");
      return NextResponse.json({ success: true, snapshotsCreated: 0, date: today });
    }

    const userId = profiles[0].id;
    const entries: KpiEntry[] = [];

    // 7 base KPIs
    const [revenueWon, dealCountWon, winRate, pipelineWeighted, pipelineUnweighted, avgDealValue, activityCount] =
      await Promise.all([
        calculateRevenueWon(admin, userId, today),
        calculateDealCountWon(admin, userId, today),
        calculateWinRate(admin, userId, today),
        calculatePipelineWeighted(admin, userId),
        calculatePipelineUnweighted(admin, userId),
        calculateAvgDealValue(admin, userId, today),
        calculateActivityCount(admin, userId, today),
      ]);

    const baseKpis: { type: string; value: number }[] = [
      { type: "revenue_won", value: revenueWon },
      { type: "deal_count_won", value: dealCountWon },
      { type: "win_rate", value: winRate },
      { type: "pipeline_value_weighted", value: pipelineWeighted },
      { type: "pipeline_value_unweighted", value: pipelineUnweighted },
      { type: "avg_deal_value", value: avgDealValue },
      { type: "activity_count", value: activityCount },
    ];

    for (const kpi of baseKpis) {
      entries.push({
        snapshot_date: today,
        user_id: userId,
        kpi_type: kpi.type,
        kpi_value: kpi.value,
        product_id: null,
        period: "day",
        calculation_basis: { source: "cron", calculated_at: new Date().toISOString() },
      });
    }

    // Per-product KPIs
    const { data: activeProducts } = await admin
      .from("products")
      .select("id, name")
      .eq("status", "active");

    if (activeProducts && activeProducts.length > 0) {
      // Check if any deal_products exist at all
      const { count: dpCount } = await admin
        .from("deal_products")
        .select("id", { count: "exact", head: true });

      if (dpCount && dpCount > 0) {
        for (const product of activeProducts) {
          const [prodRevenue, prodDealCount] = await Promise.all([
            calculateProductRevenue(admin, userId, product.id, today),
            calculateProductDealCount(admin, userId, product.id, today),
          ]);

          entries.push({
            snapshot_date: today,
            user_id: userId,
            kpi_type: "product_revenue",
            kpi_value: prodRevenue,
            product_id: product.id,
            period: "day",
            calculation_basis: { source: "cron", product_name: product.name, calculated_at: new Date().toISOString() },
          });

          entries.push({
            snapshot_date: today,
            user_id: userId,
            kpi_type: "product_deal_count",
            kpi_value: prodDealCount,
            product_id: product.id,
            period: "day",
            calculation_basis: { source: "cron", product_name: product.name, calculated_at: new Date().toISOString() },
          });
        }
      }
    }

    // Idempotent: delete existing snapshots for today + this user, then insert fresh
    // (Expression-based unique index with COALESCE prevents Supabase .upsert() from working)
    await admin
      .from("kpi_snapshots")
      .delete()
      .eq("snapshot_date", today)
      .eq("user_id", userId)
      .eq("period", "day");

    let snapshotsCreated = 0;
    for (const entry of entries) {
      const { error } = await admin
        .from("kpi_snapshots")
        .insert(entry);

      if (error) {
        console.error(`[Cron/KPI-Snapshot] INSERT error for ${entry.kpi_type}:`, error.message);
      } else {
        snapshotsCreated++;
      }
    }

    console.log(`[Cron/KPI-Snapshot] Done — ${snapshotsCreated}/${entries.length} snapshots`);

    return NextResponse.json({
      success: true,
      snapshotsCreated,
      date: today,
    });
  } catch (err) {
    console.error("[Cron/KPI-Snapshot] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
