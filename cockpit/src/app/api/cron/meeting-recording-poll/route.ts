import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, readFile, unlink } from "fs/promises";
import { join } from "path";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadRecording } from "@/lib/storage/recordings";
import { getRecordingDuration } from "@/lib/meetings/ffprobe";

export const maxDuration = 120;

const RECORDINGS_DIR = "/recordings";
// Skip files modified less than 2 minutes ago (might still be recording)
const MIN_AGE_MS = 120_000;
const VOLUME_WARN_GB = 5;

// ── Volume monitoring (MT-7) ────────────────────────────────────

async function getDirectorySize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const s = await stat(entryPath).catch(() => null);
      if (!s) continue;
      if (s.isDirectory()) {
        total += await getDirectorySize(entryPath);
      } else {
        total += s.size;
      }
    }
  } catch {
    /* best-effort */
  }
  return total;
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const uploaded: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  let volumeWarning: string | null = null;

  try {
    // Volume monitoring
    const totalBytes = await getDirectorySize(RECORDINGS_DIR);
    const totalGB = totalBytes / 1024 ** 3;
    console.log(`[Cron/RecordingPoll] Volume size: ${totalGB.toFixed(2)} GB`);
    if (totalGB > VOLUME_WARN_GB) {
      volumeWarning = `/recordings is ${totalGB.toFixed(2)} GB (threshold: ${VOLUME_WARN_GB} GB)`;
      console.warn(`[Cron/RecordingPoll] WARNING: ${volumeWarning}`);
    }

    // Scan recordings directory for subdirectories
    let entries: string[];
    try {
      entries = await readdir(RECORDINGS_DIR);
    } catch {
      return NextResponse.json({
        success: true,
        message: "/recordings not accessible or empty",
        uploaded,
        skipped,
        errors,
      });
    }

    for (const entry of entries) {
      const dirPath = join(RECORDINGS_DIR, entry);
      const dirStat = await stat(dirPath).catch(() => null);
      if (!dirStat?.isDirectory()) continue;

      // Match directory name to meetings.jitsi_room_name
      const { data: meeting } = await admin
        .from("meetings")
        .select("id, jitsi_room_name, recording_status, deal_id")
        .eq("jitsi_room_name", entry)
        .maybeSingle();

      if (!meeting) {
        skipped.push(`${entry} (no matching meeting)`);
        continue;
      }

      if (
        meeting.recording_status === "completed" ||
        meeting.recording_status === "deleted" ||
        meeting.recording_status === "uploading"
      ) {
        skipped.push(`${entry} (status: ${meeting.recording_status})`);
        continue;
      }

      // Find .mp4 files in the subdirectory
      const files = await readdir(dirPath).catch(() => [] as string[]);
      const mp4Files = files.filter((f) => f.toLowerCase().endsWith(".mp4"));

      if (mp4Files.length === 0) {
        skipped.push(`${entry} (no .mp4 files)`);
        continue;
      }

      if (mp4Files.length > 1) {
        console.warn(
          `[Cron/RecordingPoll] Multiple MP4s in ${entry}: ${mp4Files.join(", ")}. Processing first.`,
        );
      }

      const mp4File = mp4Files[0];
      const filePath = join(dirPath, mp4File);
      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat) {
        errors.push(`${entry}/${mp4File}: stat failed`);
        continue;
      }

      // Skip files modified recently (still being recorded)
      const ageMs = Date.now() - fileStat.mtimeMs;
      if (ageMs < MIN_AGE_MS) {
        skipped.push(
          `${entry}/${mp4File} (modified ${Math.round(ageMs / 1000)}s ago — possibly still recording)`,
        );
        continue;
      }

      // ── Upload pipeline ──────────────────────────────────────

      try {
        // Mark as uploading (prevents duplicate processing)
        await admin
          .from("meetings")
          .update({ recording_status: "uploading" })
          .eq("id", meeting.id);

        // Extract duration via ffprobe
        const durationSeconds = await getRecordingDuration(filePath);

        // Read file into memory and upload to Supabase Storage
        const buffer = await readFile(filePath);
        const uploadResult = await uploadRecording(meeting.id, mp4File, buffer);

        if ("error" in uploadResult) {
          throw new Error(uploadResult.error);
        }

        // Derive recording_started_at from file mtime minus duration
        const recordingStartedAt =
          durationSeconds > 0
            ? new Date(fileStat.mtimeMs - durationSeconds * 1000)
            : new Date(fileStat.mtimeMs);

        // Update meeting record
        await admin
          .from("meetings")
          .update({
            recording_url: uploadResult.path,
            recording_status: "completed",
            recording_duration_seconds: durationSeconds || null,
            recording_started_at: recordingStartedAt.toISOString(),
          })
          .eq("id", meeting.id);

        // Audit log (actor_id null = system/cron)
        await admin.from("audit_log").insert({
          actor_id: null,
          action: "update",
          entity_type: "meeting",
          entity_id: meeting.id,
          changes: {
            after: {
              event: "recording_completed",
              storage_path: uploadResult.path,
              duration_seconds: durationSeconds,
              file_size_bytes: fileStat.size,
            },
          },
          context: `Recording uploaded: ${mp4File} (${(fileStat.size / 1024 / 1024).toFixed(1)} MB)`,
        });

        // Best-effort local file cleanup
        try {
          await unlink(filePath);
        } catch {
          console.warn(
            `[Cron/RecordingPoll] Could not delete local file ${filePath}. ` +
              `Host-level cleanup recommended.`,
          );
        }

        uploaded.push(
          `${entry}/${mp4File} → ${uploadResult.path} (${durationSeconds}s, ${(fileStat.size / 1024 / 1024).toFixed(1)} MB)`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${entry}/${mp4File}: ${msg}`);

        // Revert to failed so next cron run can retry
        await admin
          .from("meetings")
          .update({ recording_status: "failed" })
          .eq("id", meeting.id);

        console.error(`[Cron/RecordingPoll] Upload failed for ${entry}/${mp4File}:`, msg);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      skipped,
      errors,
      volumeWarning,
    });
  } catch (err) {
    console.error("[Cron/RecordingPoll] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
