// =============================================================
// E-Mail-Anhang Whitelist + Validierung (DEC-099)
// =============================================================
// Single-Source-of-Truth fuer Browser-side Validation (AttachmentsSection)
// und Server-side Re-Validation (uploadEmailAttachment, sendComposedEmail).
//
// KEIN "use server" Marker, KEIN Node-only-Import — laeuft in beiden Pfaden.
// DEC-100: ZIP rein ohne Inhalt-Inspection.
// DEC-103: 10 MB pro File, 25 MB Total.

export const MIME_WHITELIST: readonly string[] = [
  // PDF
  "application/pdf",
  // Microsoft Office
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  // Bilder
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  // Text
  "text/plain", // .txt
  "text/csv", // .csv
  "application/csv", // einige Browser melden text/csv als application/csv
  // Archiv (DEC-100: ohne Inhalt-Inspection)
  "application/zip",
  "application/x-zip-compressed",
];

export const EXTENSION_WHITELIST: readonly string[] = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".txt",
  ".csv",
  ".zip",
];

// 10 MB pro File
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// 25 MB Total ueber alle Anhaenge einer Mail
export const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;

export type AttachmentSourceType = "upload" | "proposal";

export type AttachmentMeta = {
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  // SLC-555 DEC-108: 'upload' = PC-Direkt-Upload (V5.4-Default,
  // Bucket "email-attachments"), 'proposal' = Angebot-PDF-Anhang
  // (Bucket "proposal-pdfs"). Optional + Default 'upload' fuer V5.4-
  // Backwards-Compat — bestehende Konsumenten muessen nicht angepasst werden.
  source_type?: AttachmentSourceType;
  // SLC-555 DEC-108 CHECK-Constraint: Pflicht wenn source_type='proposal',
  // sonst nicht gesetzt.
  proposalId?: string;
};

type FileLike = {
  type: string;
  size: number;
  name: string;
};

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validiert eine Datei gegen MIME-Whitelist, Extension-Whitelist (Defense-in-Depth)
 * und Size-Limits (Pro-File + Total).
 *
 * @param file - File-Object oder kompatibles { type, size, name }
 * @param totalSizeSoFar - Summe der bisherigen Anhang-Sizes (in Bytes)
 */
export function validateAttachment(
  file: FileLike,
  totalSizeSoFar: number,
): ValidateResult {
  // 1. MIME-Whitelist
  const mime = (file.type || "").toLowerCase();
  if (!MIME_WHITELIST.includes(mime)) {
    return {
      ok: false,
      error: `MIME-Typ "${file.type || "unbekannt"}" nicht erlaubt. Erlaubt: PDF, Office, Bilder, TXT, CSV, ZIP.`,
    };
  }

  // 2. Extension-Whitelist (Defense-in-Depth — manche Browser senden falsche MIME-Types)
  const lowerName = (file.name || "").toLowerCase();
  const dotIdx = lowerName.lastIndexOf(".");
  const ext = dotIdx >= 0 ? lowerName.substring(dotIdx) : "";
  if (!EXTENSION_WHITELIST.includes(ext)) {
    return {
      ok: false,
      error: `Datei-Endung "${ext || "fehlt"}" nicht erlaubt.`,
    };
  }

  // 3. Pro-File-Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `Datei "${file.name}" ist zu gross (${formatSize(file.size)}). Max ${formatSize(MAX_FILE_SIZE_BYTES)} pro Datei.`,
    };
  }

  // 4. Total-Size (kumulativ)
  if (totalSizeSoFar + file.size > MAX_TOTAL_SIZE_BYTES) {
    return {
      ok: false,
      error: `Anhaenge insgesamt zu gross (${formatSize(totalSizeSoFar + file.size)}). Max ${formatSize(MAX_TOTAL_SIZE_BYTES)} total.`,
    };
  }

  return { ok: true };
}

/**
 * Hilfsfunktion fuer Fehlermeldungen + UI-Anzeige.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
