import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../../cron/verify-cron-secret";
import { runBackfill } from "@/lib/knowledge/backfill";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Reuse cron-secret auth (admin-only endpoint)
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    console.log(`[Backfill] Starting: limit=${limit}, offset=${offset}`);

    const result = await runBackfill({ limit, offset });

    console.log(
      `[Backfill] Done in ${result.durationMs}ms:`,
      `processed=${result.total.processed},`,
      `skipped=${result.total.skipped},`,
      `failed=${result.total.failed}`
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[Backfill] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
