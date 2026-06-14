// SLC-665 MT-7 (DEC-171) — Win/Loss Read-API fuer Intelligence Studio.
//
// GET /api/winloss/[deal_id]. V8.15 SLC-913 MT-7 (ISSUE-116): per-Tenant-Key
// + Ownership-Check — auto_winloss_runs hat kein owner_user_id, der Deal aber
// schon (deal_id -> deals.owner_user_id). Gehoert der Deal nicht zum Tenant,
// antwortet die Route 404 (keine Enumeration fremder deal_ids).

import { NextResponse } from "next/server";
import { guardExportTenant } from "@/lib/export/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deal_id: string }> }
) {
  const identity = await guardExportTenant(request);
  if (identity instanceof NextResponse) return identity;

  const { deal_id } = await params;
  if (!deal_id || typeof deal_id !== "string") {
    return NextResponse.json({ error: "Invalid deal_id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Ownership-Gate: der Deal muss dem Tenant gehoeren (abgeleitete Ownership).
  const { data: deal } = await supabase
    .from("deals")
    .select("owner_user_id")
    .eq("id", deal_id)
    .maybeSingle();
  const dealOwner = (deal as { owner_user_id: string | null } | null)?.owner_user_id ?? null;
  if (!dealOwner || !identity.teamMemberIds.includes(dealOwner)) {
    return NextResponse.json(
      { error: "No win/loss run found for this deal" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("auto_winloss_runs")
    .select(
      "deal_id, target_status, triggered_at, bedrock_output, bedrock_model, bedrock_completed_at, status"
    )
    .eq("deal_id", deal_id)
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "No win/loss run found for this deal" },
      { status: 404 }
    );
  }

  const row = data as {
    deal_id: string;
    target_status: "won" | "lost";
    triggered_at: string;
    bedrock_output: string | null;
    bedrock_model: string | null;
    bedrock_completed_at: string | null;
    status: "pending" | "succeeded" | "failed";
  };

  return NextResponse.json({
    deal_id: row.deal_id,
    target_status: row.target_status,
    triggered_at: row.triggered_at,
    bedrock_output: row.bedrock_output,
    model: row.bedrock_model,
    completed_at: row.bedrock_completed_at,
    status: row.status,
  });
}
