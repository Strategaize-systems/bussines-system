import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCronSecret } from "../verify-cron-secret";
import { syncEmails } from "@/lib/imap/sync-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await syncEmails();

    // Revalidate email-related routes after sync
    revalidatePath("/emails");
    revalidatePath("/mein-tag");

    return NextResponse.json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
      lastUid: result.lastUid,
    });
  } catch (err) {
    console.error("[Cron/IMAP-Sync] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
