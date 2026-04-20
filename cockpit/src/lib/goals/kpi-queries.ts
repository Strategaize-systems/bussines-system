import { createAdminClient } from "@/lib/supabase/admin";

// ── Revenue Won ──────────────────────────────────────────────

export async function calculateRevenueWon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);
  const { data } = await admin
    .from("deals")
    .select("value")
    .eq("status", "won")
    .gte("closed_at", `${year}-01-01`)
    .lt("closed_at", `${Number(year) + 1}-01-01`);

  return (data ?? []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
}

// ── Deal Count Won ───────────────────────────────────────────

export async function calculateDealCountWon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", "won")
    .gte("closed_at", `${year}-01-01`)
    .lt("closed_at", `${Number(year) + 1}-01-01`);

  return count ?? 0;
}

// ── Win Rate ─────────────────────────────────────────────────

export async function calculateWinRate(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${Number(year) + 1}-01-01`;

  const [wonResult, lostResult] = await Promise.all([
    admin
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "won")
      .gte("closed_at", yearStart)
      .lt("closed_at", yearEnd),
    admin
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "lost")
      .gte("closed_at", yearStart)
      .lt("closed_at", yearEnd),
  ]);

  const won = wonResult.count ?? 0;
  const lost = lostResult.count ?? 0;
  const total = won + lost;

  return total > 0 ? (won / total) * 100 : 0;
}

// ── Pipeline Value Weighted ──────────────────────────────────

export async function calculatePipelineWeighted(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<number> {
  const { data } = await admin
    .from("deals")
    .select("value, pipeline_stages(probability)")
    .eq("status", "active");

  return (data ?? []).reduce((sum, d: any) => {
    const prob = d.pipeline_stages?.probability ?? 0;
    return sum + (Number(d.value) || 0) * (prob / 100);
  }, 0);
}

// ── Pipeline Value Unweighted ────────────────────────────────

export async function calculatePipelineUnweighted(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<number> {
  const { data } = await admin
    .from("deals")
    .select("value")
    .eq("status", "active");

  return (data ?? []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
}

// ── Avg Deal Value ───────────────────────────────────────────

export async function calculateAvgDealValue(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);
  const { data } = await admin
    .from("deals")
    .select("value")
    .eq("status", "won")
    .gte("closed_at", `${year}-01-01`)
    .lt("closed_at", `${Number(year) + 1}-01-01`);

  const deals = data ?? [];
  if (deals.length === 0) return 0;

  const total = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  return total / deals.length;
}

// ── Activity Count ───────────────────────────────────────────

export async function calculateActivityCount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);
  const { count } = await admin
    .from("activities")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`)
    .lt("created_at", `${Number(year) + 1}-01-01`);

  return count ?? 0;
}

// ── Product Revenue ──────────────────────────────────────────

export async function calculateProductRevenue(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  productId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);

  // Get deal IDs linked to this product
  const { data: links } = await admin
    .from("deal_products")
    .select("deal_id")
    .eq("product_id", productId);

  const dealIds = (links ?? []).map((l) => l.deal_id);
  if (dealIds.length === 0) return 0;

  const { data } = await admin
    .from("deals")
    .select("value")
    .eq("status", "won")
    .in("id", dealIds)
    .gte("closed_at", `${year}-01-01`)
    .lt("closed_at", `${Number(year) + 1}-01-01`);

  return (data ?? []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
}

// ── Product Deal Count ───────────────────────────────────────

export async function calculateProductDealCount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  productId: string,
  snapshotDate: string,
): Promise<number> {
  const year = snapshotDate.slice(0, 4);

  const { data: links } = await admin
    .from("deal_products")
    .select("deal_id")
    .eq("product_id", productId);

  const dealIds = (links ?? []).map((l) => l.deal_id);
  if (dealIds.length === 0) return 0;

  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("status", "won")
    .in("id", dealIds)
    .gte("closed_at", `${year}-01-01`)
    .lt("closed_at", `${Number(year) + 1}-01-01`);

  return count ?? 0;
}
