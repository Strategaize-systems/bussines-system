// SLC-665 MT-7 (DEC-171) — Win/Loss Read-API fuer Intelligence Studio.
//
// GET /api/winloss/[deal_id] mit Bearer-Auth EXPORT_API_KEY (FEAT-622-Pattern).
// Liefert den juengsten auto_winloss_runs-Eintrag pro Deal.

import { NextResponse } from "next/server";
import { verifyExportApiKey } from "@/lib/export/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deal_id: string }> }
) {
  const authResp = verifyExportApiKey(request);
  if (authResp) return authResp;

  const { deal_id } = await params;
  if (!deal_id || typeof deal_id !== "string") {
    return NextResponse.json({ error: "Invalid deal_id" }, { status: 400 });
  }

  const supabase = createAdminClient();
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
