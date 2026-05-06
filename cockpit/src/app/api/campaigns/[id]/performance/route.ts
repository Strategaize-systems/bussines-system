// V6.2 SLC-625 — Campaign-Performance Read-API (DEC-140)
//
// GET /api/campaigns/[id]/performance mit Bearer-Auth (FEAT-504-Pattern).
// Returnt KPI-JSON fuer System 4 / externe Reporting-Konsumenten.

import { NextResponse } from "next/server";
import { verifyExportApiKey } from "@/lib/export/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignPerformance } from "@/types/campaign";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResp = verifyExportApiKey(request);
  if (authResp) return authResp;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1) Lookup campaign
  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("id, name, external_ref")
    .eq("id", id)
    .maybeSingle();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // 2) Aggregate counts in parallel
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Iso = since30.toISOString();

  const [
    leadsRes,
    dealsRes,
    linksRes,
    firstLeadRes,
    lastActivityRes,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id),
    supabase
      .from("deals")
      .select("status, value")
      .eq("campaign_id", id),
    supabase.from("campaign_links").select("id, click_count").eq("campaign_id", id),
    supabase
      .from("contacts")
      .select("created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("updated_at")
      .eq("campaign_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const leads = leadsRes.count ?? 0;
  const dealsRows = (dealsRes.data ?? []) as Array<{ status: string; value: number | null }>;
  const dealCount = dealsRows.length;
  let won_deals = 0;
  let won_value = 0;
  for (const d of dealsRows) {
    if (d.status === "won") {
      won_deals += 1;
      won_value += Number(d.value ?? 0);
    }
  }
  const conversion_rate =
    leads > 0 ? Math.round((won_deals / leads) * 1000) / 10 : null;

  // 3) Click counts: total via aggregated click_count + last 30d via clicks
  const linkRows = (linksRes.data ?? []) as Array<{ id: string; click_count: number }>;
  const click_count_total = linkRows.reduce(
    (s, l) => s + (l.click_count ?? 0),
    0
  );
  const linkIds = linkRows.map((l) => l.id);

  let click_count_last_30d = 0;
  if (linkIds.length > 0) {
    const { count } = await supabase
      .from("campaign_link_clicks")
      .select("id", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", since30Iso);
    click_count_last_30d = count ?? 0;
  }

  const camp = campaign as { id: string; name: string; external_ref: string | null };
  const response: CampaignPerformance = {
    campaign_id: camp.id,
    name: camp.name,
    external_ref: camp.external_ref,
    leads,
    deals: dealCount,
    won_deals,
    won_value,
    conversion_rate,
    click_count_total,
    click_count_last_30d,
    first_lead_at: (firstLeadRes.data as { created_at: string } | null)?.created_at ?? null,
    last_activity_at: (lastActivityRes.data as { updated_at: string } | null)?.updated_at ?? null,
  };

  return NextResponse.json(response);
}
