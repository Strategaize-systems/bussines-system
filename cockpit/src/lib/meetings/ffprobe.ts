import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Extract duration in whole seconds from an MP4 file using ffprobe.
 * Returns 0 if ffprobe fails or file is still being written.
 *
 * Requires ffprobe binary (installed via `apk add ffmpeg` in Dockerfile).
 */
export async function getRecordingDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { timeout: 15_000 },
    );

    const seconds = Math.floor(parseFloat(stdout.trim()));
    return isNaN(seconds) || seconds < 0 ? 0 : seconds;
  } catch (error) {
    console.warn(
      `[ffprobe] Failed to extract duration from ${filePath}:`,
      error instanceof Error ? error.message : error,
    );
    return 0;
  }
}
