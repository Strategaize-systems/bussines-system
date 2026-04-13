/**
 * Cal.com Sync Cron Endpoint
 * POST /api/cron/calcom-sync
 * Runs initial/full sync from Cal.com → calendar_events.
 * SLC-407 / FEAT-406
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { initialSync, cleanupOrphaned } from "@/lib/calcom/sync";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const syncResult = await initialSync();
    const cleanupResult = await cleanupOrphaned();

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
