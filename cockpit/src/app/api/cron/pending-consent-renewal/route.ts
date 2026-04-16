import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const admin = createAdminClient();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error, count } = await admin
      .from("contacts")
      .select("id, email, consent_requested_at", { count: "exact" })
      .eq("consent_status", "pending")
      .not("consent_requested_at", "is", null)
      .lt("consent_requested_at", sevenDaysAgo.toISOString());

    if (error) {
      console.error("[Cron/PendingConsentRenewal] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stale = data ?? [];
    console.log(
      `[Cron/PendingConsentRenewal] stale_pending=${stale.length} total=${count ?? "n/a"}`
    );

    return NextResponse.json({
      success: true,
      stale_pending_count: stale.length,
    });
  } catch (err) {
    console.error("[Cron/PendingConsentRenewal] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
