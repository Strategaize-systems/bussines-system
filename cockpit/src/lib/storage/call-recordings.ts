import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET =
  process.env.SUPABASE_STORAGE_CALLS_BUCKET || "call-recordings";

/**
 * Upload a call recording buffer to Supabase Storage.
 * Path: {callId}/{filename}
 * Uses service-role client — server-side only.
 */
export async function uploadCallRecording(
  callId: string,
  filename: string,
  buffer: Buffer,
): Promise<{ path: string } | { error: string }> {
  const admin = createAdminClient();
  const storagePath = `${callId}/${filename}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "audio/wav",
      upsert: false,
    });

  if (error) {
    return { error: `Upload failed: ${error.message}` };
  }

  return { path: storagePath };
}

/**
 * Remove a call recording from Supabase Storage.
 * Used by retention cron.
 */
export async function removeCallRecording(
  storagePath: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function getCallsBucket(): string {
  return BUCKET;
}

/**
 * Parse WAV header to derive duration in seconds.
 * Standard PCM WAV: 44-byte header.
 * Returns null if header is invalid or file is too small.
 */
export function getWavDurationSeconds(buffer: Buffer): number | null {
  if (buffer.length < 44) return null;
  // "RIFF....WAVE" check
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WAVE") return null;

  const sampleRate = buffer.readUInt32LE(24);
  const numChannels = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);

  if (!sampleRate || !numChannels || !bitsPerSample) return null;

  // "data" subchunk may not be at offset 36 if there are extra chunks —
  // scan for it from offset 12 onward.
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      const bytesPerSec = (sampleRate * numChannels * bitsPerSample) / 8;
      if (!bytesPerSec) return null;
      return Math.round(chunkSize / bytesPerSec);
    }
    offset += 8 + chunkSize;
  }
  return null;
}
