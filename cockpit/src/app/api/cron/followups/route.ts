import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { processFollowupCandidates } from "@/lib/ai/followup-engine";
import { expireOldActions } from "@/lib/ai/action-queue";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    console.log("[Cron/Followups] Starting followup generation");

    const result = await processFollowupCandidates(20);

    // Expire old pending actions
    const expired = await expireOldActions();

    console.log(
      `[Cron/Followups] Done — candidates=${result.candidates}, suggested=${result.suggested}, failed=${result.failed}, skipped=${result.skipped}, expired=${expired}`
    );

    return NextResponse.json({
      success: true,
      ...result,
      expired,
    });
  } catch (err) {
    console.error("[Cron/Followups] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
