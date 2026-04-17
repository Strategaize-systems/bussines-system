import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeRecording } from "@/lib/storage/recordings";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const retentionDays = parseInt(
    process.env.RECORDING_RETENTION_DAYS || "30",
    10,
  );
  const admin = createAdminClient();

  try {
    // Cutoff: recordings older than RECORDING_RETENTION_DAYS
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const { data: expired, error: queryError } = await admin
      .from("meetings")
      .select("id, recording_url, recording_status, recording_started_at, title")
      .in("recording_status", ["completed", "failed"])
      .not("recording_started_at", "is", null)
      .lt("recording_started_at", cutoff.toISOString());

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    let deleted = 0;
    let errorCount = 0;
    const details: string[] = [];

    for (const meeting of expired ?? []) {
      try {
        // Remove from Supabase Storage
        if (meeting.recording_url) {
          const result = await removeRecording(meeting.recording_url);
          if (!result.success) {
            console.warn(
              `[Cron/RecordingRetention] Storage removal warning for ${meeting.id}: ${result.error}`,
            );
            // Continue — file might already be gone
          }
        }

        // Update meeting: clear recording_url, set status to deleted
        // Transcript + ai_summary remain permanently (DEC-043)
        await admin
          .from("meetings")
          .update({
            recording_url: null,
            recording_status: "deleted",
          })
          .eq("id", meeting.id);

        // Audit log (actor_id null = system/cron)
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "update",
          entity_type: "meeting",
          entity_id: meeting.id,
          changes: {
            before: {
              recording_status: meeting.recording_status,
              recording_url: meeting.recording_url,
            },
            after: {
              recording_status: "deleted",
              recording_url: null,
              event: "recording_retention_deleted",
            },
          },
          context: `Recording retention: deleted after ${retentionDays} days`,
        });

        deleted++;
        details.push(`${meeting.id}: deleted (${meeting.title || "untitled"})`);
      } catch (err) {
        errorCount++;
        details.push(
          `${meeting.id}: error — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    console.log(
      `[Cron/RecordingRetention] Retention complete: ${deleted} deleted, ${errorCount} errors (cutoff: ${cutoff.toISOString()})`,
    );

    return NextResponse.json({
      success: true,
      retention_days: retentionDays,
      cutoff_date: cutoff.toISOString(),
      candidates: expired?.length ?? 0,
      deleted,
      errors: errorCount,
      details,
    });
  } catch (err) {
    console.error("[Cron/RecordingRetention] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
