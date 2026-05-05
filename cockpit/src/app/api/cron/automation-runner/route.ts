// V6.2 SLC-622 MT-6 — Automation-Runner Cron-Endpoint
//
// Defense-in-Depth-Fallback gegen App-Crash zwischen Dispatch und Sync-
// Execution. Coolify-Cron triggert minuetlich (* * * * *). Pickt stuck
// runs (status='pending' oder 'running' AND started_at < now() - 60s),
// fuehrt sie sequentiell aus (max 50 pro Lauf).
//
// Pattern: x-cron-secret-Header-Auth (verifyCronSecret), createAdminClient,
// JSON-Response. Pattern uebernommen von expire-proposals/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import {
  executeAutomationRun,
  pickupStuckRuns,
} from "@/lib/automation/executor";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const runIds = await pickupStuckRuns(50);
    let processed = 0;
    const failures: string[] = [];

    for (const runId of runIds) {
      try {
        await executeAutomationRun(runId);
        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        failures.push(`${runId}: ${msg}`);
        console.error(
          `[Cron/AutomationRunner] run ${runId} threw:`,
          msg
        );
      }
    }

    console.log(
      `[Cron/AutomationRunner] picked=${runIds.length} processed=${processed} failed=${failures.length}`
    );

    return NextResponse.json({
      success: true,
      picked: runIds.length,
      processed,
      failed: failures.length,
    });
  } catch (err) {
    console.error("[Cron/AutomationRunner] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
