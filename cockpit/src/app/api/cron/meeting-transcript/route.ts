import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranscriptionProvider } from "@/lib/ai/transcription";
import { withRetry, isRetryableError } from "@/lib/ai/retry";

export const maxDuration = 300; // 5 min — transcription can take a while

const MAX_CONCURRENT = 1; // process one at a time to avoid API rate limits
const BUCKET =
  process.env.SUPABASE_STORAGE_RECORDINGS_BUCKET || "meeting-recordings";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const processed: string[] = [];
  const errors: string[] = [];

  try {
    // Find meetings ready for transcription
    const { data: meetings, error: queryError } = await admin
      .from("meetings")
      .select("id, title, recording_url, recording_duration_seconds, deal_id")
      .eq("recording_status", "completed")
      .or("transcript_status.is.null,transcript_status.eq.pending")
      .order("created_at", { ascending: true })
      .limit(MAX_CONCURRENT);

    if (queryError) {
      return NextResponse.json(
        { success: false, error: queryError.message },
        { status: 500 },
      );
    }

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No meetings pending transcription",
        processed,
        errors,
      });
    }

    for (const meeting of meetings) {
      try {
        if (!meeting.recording_url) {
          errors.push(`${meeting.id}: no recording_url`);
          continue;
        }

        // Mark as processing
        await admin
          .from("meetings")
          .update({ transcript_status: "processing" })
          .eq("id", meeting.id);

        console.log(
          `[Cron/Transcript] Processing meeting ${meeting.id}: ${meeting.title}`,
        );

        // Download recording from Supabase Storage
        const { data: fileData, error: downloadError } = await admin.storage
          .from(BUCKET)
          .download(meeting.recording_url);

        if (downloadError || !fileData) {
          throw new Error(
            `Storage download failed: ${downloadError?.message ?? "no data"}`,
          );
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename =
          meeting.recording_url.split("/").pop() || "recording.mp4";

        console.log(
          `[Cron/Transcript] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB, starting Whisper...`,
        );

        // Transcribe via Whisper adapter with exponential backoff
        const provider = getTranscriptionProvider();
        const result = await withRetry(
          async () => {
            const r = await provider.transcribe(buffer, filename, {
              language: "de",
              responseFormat: "verbose_json",
            });
            if (!r.success || !r.text) {
              throw new Error(r.error || "Transcription returned no text");
            }
            return r;
          },
          isRetryableError,
        );

        const transcriptText = result.text!; // guaranteed non-null by withRetry check

        // Save transcript to database
        await admin
          .from("meetings")
          .update({
            transcript: transcriptText,
            transcript_status: "completed",
          })
          .eq("id", meeting.id);

        // Audit log
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "transcript_generated",
          entity_type: "meeting",
          entity_id: meeting.id,
          changes: {
            after: {
              event: "transcript_completed",
              provider: result.provider,
              language: result.language,
              transcript_length: transcriptText.length,
              duration_from_whisper: result.duration,
            },
          },
          context: `Transcript generated: ${transcriptText.length} chars, provider=${result.provider}`,
        });

        processed.push(
          `${meeting.id} (${meeting.title}): ${transcriptText.length} chars`,
        );

        console.log(
          `[Cron/Transcript] Meeting ${meeting.id} transcribed: ${transcriptText.length} chars`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${meeting.id}: ${msg}`);

        // Mark as failed
        await admin
          .from("meetings")
          .update({ transcript_status: "failed" })
          .eq("id", meeting.id);

        console.error(
          `[Cron/Transcript] Failed for meeting ${meeting.id}:`,
          msg,
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
    });
  } catch (err) {
    console.error("[Cron/Transcript] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
