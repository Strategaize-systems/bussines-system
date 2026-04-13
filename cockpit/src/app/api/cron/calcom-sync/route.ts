/**
 * Cal.com Sync Cron Endpoint
 * POST /api/cron/calcom-sync
 * Runs initial/full sync from Cal.com → calendar_events.
 * SLC-407 / FEAT-406
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCronSecret } from "../verify-cron-secret";
import { initialSync, cleanupOrphaned } from "@/lib/calcom/sync";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // Cron sync requires CALCOM_API_KEY (enterprise feature in Cal.com AGPLv3).
  // Without it, only webhook-based sync is available.
  if (!process.env.CALCOM_API_KEY) {
    return NextResponse.json({
      ok: false,
      error: "CALCOM_API_KEY not configured. Cron sync requires Cal.com API key (enterprise feature). Use webhook-based sync instead.",
    }, { status: 501 });
  }

  try {
    const syncResult = await initialSync();
    const cleanupResult = await cleanupOrphaned();

    // Revalidate all calendar-related routes after sync
    revalidatePath("/kalender");
    revalidatePath("/termine");
    revalidatePath("/mein-tag");

    return NextResponse.json({
      ok: true,
      sync: syncResult,
      cleanup: cleanupResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[calcom-sync] Error:", error);
    return NextResponse.json(
      { error: "Cal.com sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
