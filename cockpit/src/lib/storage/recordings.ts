import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET =
  process.env.SUPABASE_STORAGE_RECORDINGS_BUCKET || "meeting-recordings";

/**
 * Upload a recording buffer to Supabase Storage.
 * Path: {meetingId}/{filename}
 * Uses service-role client — server-side only.
 */
export async function uploadRecording(
  meetingId: string,
  filename: string,
  buffer: Buffer,
): Promise<{ path: string } | { error: string }> {
  const admin = createAdminClient();
  const storagePath = `${meetingId}/${filename}`;

  const { error } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: "video/mp4",
    upsert: false,
  });

  if (error) {
    return { error: `Upload failed: ${error.message}` };
  }

  return { path: storagePath };
}

/**
 * Remove a recording from Supabase Storage.
 * Used by retention cron to delete expired recordings.
 */
export async function removeRecording(
  storagePath: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
