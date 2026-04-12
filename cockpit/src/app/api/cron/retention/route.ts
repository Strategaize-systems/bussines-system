import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { runRetention } from "@/lib/imap/retention";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await runRetention();

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[Cron/Retention] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
