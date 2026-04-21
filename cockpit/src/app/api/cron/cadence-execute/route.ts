import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { executeScheduledEnrollments } from "@/lib/cadence/engine";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await executeScheduledEnrollments();

    console.log(
      `[Cron/CadenceExecute] Done — processed=${result.processed}, stopped=${result.stopped}, completed=${result.completed}, errors=${result.errors}`
    );

    if (result.details.length > 0) {
      console.log(`[Cron/CadenceExecute] Details:`, result.details.join("; "));
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[Cron/CadenceExecute] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
