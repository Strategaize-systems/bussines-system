// =============================================================
// Knowledge Chunker — Quelltypspezifisches Text-Chunking
// DEC-048: Sentence-Boundary-Aware Splitting
// =============================================================

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface Chunk {
  text: string;
  index: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  title: string;
  date: string;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  source_url: string;
}

// ---------------------------------------------------------------
// Token Heuristic (DEC-048: tokens ~ text.length / 4)
// ---------------------------------------------------------------

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------
// Sentence-Boundary-Aware Splitter
// ---------------------------------------------------------------

// Sentence boundary: period, exclamation, or question mark followed by whitespace.
// Avoids splitting at common German abbreviations (z.B., d.h., u.a., etc.)
const ABBREVIATIONS = new Set([
  "z.b.", "d.h.", "u.a.", "o.ä.", "s.o.", "s.u.", "v.a.", "i.d.r.",
  "bzgl.", "inkl.", "exkl.", "ggf.", "evtl.", "bzw.", "ca.", "etc.",
  "nr.", "str.", "tel.", "hr.", "fr.", "dr.", "prof.", "dipl.",
]);

function isSentenceBoundary(text: string, dotIndex: number): boolean {
  // Must be followed by whitespace or end of text
  if (dotIndex + 1 < text.length && !/\s/.test(text[dotIndex + 1])) {
    return false;
  }

  // Check for abbreviations: look backwards for the word containing this dot
  const before = text.substring(Math.max(0, dotIndex - 10), dotIndex + 1).toLowerCase();
  for (const abbr of ABBREVIATIONS) {
    if (before.endsWith(abbr)) return false;
  }

  return true;
}

/**
 * Splits text at sentence boundaries into chunks of approximately `targetTokens` size.
 * Optionally adds `overlapTokens` from the end of the previous chunk to the start of the next.
 */
export function splitAtSentenceBoundary(
  text: string,
  targetTokens: number = 700,
  overlapTokens: number = 0,
): string[] {
  const totalTokens = estimateTokens(text);
  if (totalTokens <= targetTokens) {
    return [text.trim()];
  }

  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + targetChars, text.length);

    if (end >= text.length) {
      // Last chunk — take the rest
      const chunk = text.substring(start).trim();
      if (chunk.length > 0) chunks.push(chunk);
      break;
    }

    // Search backwards from target end for a sentence boundary
    let bestCut = -1;
    for (let i = end; i > start + targetChars * 0.5; i--) {
      const ch = text[i - 1]; // character before position i
      if ((ch === "." || ch === "!" || ch === "?") && isSentenceBoundary(text, i - 1)) {
        bestCut = i;
        break;
      }
    }

    // If no sentence boundary found in the upper half, search forward
    if (bestCut === -1) {
      for (let i = end; i < Math.min(end + targetChars * 0.3, text.length); i++) {
        const ch = text[i - 1];
        if ((ch === "." || ch === "!" || ch === "?") && isSentenceBoundary(text, i - 1)) {
          bestCut = i;
          break;
        }
      }
    }

    // If still no boundary found, hard-cut at space
    if (bestCut === -1) {
      for (let i = end; i > start; i--) {
        if (/\s/.test(text[i])) {
          bestCut = i;
          break;
        }
      }
      if (bestCut === -1) bestCut = end; // absolute fallback
    }

    const chunk = text.substring(start, bestCut).trim();
    if (chunk.length > 0) chunks.push(chunk);

    // Next start position: move back by overlap
    start = bestCut - overlapChars;
    if (start <= (bestCut - overlapChars * 2)) start = bestCut; // prevent infinite loop
    // Skip leading whitespace
    while (start < text.length && /\s/.test(text[start])) start++;
  }

  return chunks;
}

// ---------------------------------------------------------------
// chunkMeeting (MT-2)
// ---------------------------------------------------------------

export interface MeetingChunkInput {
  id: string;
  title: string;
  scheduled_at: string;
  transcript: string | null;
  ai_summary?: { outcome?: string } | null;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
}

export function chunkMeeting(meeting: MeetingChunkInput): Chunk[] {
  if (!meeting.transcript || meeting.transcript.trim().length === 0) return [];

  let text = meeting.transcript;

  // Prepend ai_summary outcome as context header if available
  if (meeting.ai_summary?.outcome) {
    text = `Zusammenfassung: ${meeting.ai_summary.outcome}\n\n${text}`;
  }

  const parts = splitAtSentenceBoundary(text, 700, 100);

  return parts.map((part, index) => ({
    text: part,
    index,
    metadata: {
      title: meeting.title,
      date: meeting.scheduled_at,
      deal_id: meeting.deal_id,
      contact_id: meeting.contact_id,
      company_id: meeting.company_id,
      source_url: `/meetings/${meeting.id}`,
    },
  }));
}

// ---------------------------------------------------------------
// chunkEmail (MT-3)
// ---------------------------------------------------------------

export interface EmailChunkInput {
  id: string;
  thread_id: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
}

export function chunkEmail(email: EmailChunkInput): Chunk[] {
  const subject = email.subject || "";
  const body = email.body_text || "";
  if (!subject && !body) return [];

  const combined = subject ? `${subject}\n\n${body}` : body;
  const tokens = estimateTokens(combined);

  if (tokens <= 800) {
    return [{
      text: combined.trim(),
      index: 0,
      metadata: {
        title: subject || "(Kein Betreff)",
        date: email.received_at,
        deal_id: email.deal_id,
        contact_id: email.contact_id,
        company_id: email.company_id,
        source_url: `/emails/${email.thread_id || email.id}`,
      },
    }];
  }

  // Split without overlap for emails
  const parts = splitAtSentenceBoundary(combined, 800, 0);
  return parts.map((part, index) => ({
    text: part,
    index,
    metadata: {
      title: subject || "(Kein Betreff)",
      date: email.received_at,
      deal_id: email.deal_id,
      contact_id: email.contact_id,
      company_id: email.company_id,
      source_url: `/emails/${email.thread_id || email.id}`,
    },
  }));
}

// ---------------------------------------------------------------
// chunkActivity (MT-4)
// ---------------------------------------------------------------

export interface ActivityChunkInput {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  created_at: string;
}

export function chunkActivity(activity: ActivityChunkInput): Chunk[] {
  // Activities use description field (not body) based on actual schema
  const body = activity.description;
  if (!body || body.trim().length === 0) return [];

  const title = activity.title
    ? `${activity.type} - ${activity.title}`
    : activity.type;

  return [{
    text: body.trim(),
    index: 0,
    metadata: {
      title,
      date: activity.created_at,
      deal_id: activity.deal_id,
      contact_id: activity.contact_id,
      company_id: activity.company_id,
      source_url: activity.deal_id ? `/deals/${activity.deal_id}` : `/pipeline`,
    },
  }];
}

// ---------------------------------------------------------------
// chunkDocument (MT-5)
// ---------------------------------------------------------------

export interface DocumentChunkInput {
  id: string;
  name: string;
  deal_id?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  created_at: string;
}

export function chunkDocument(doc: DocumentChunkInput, extractedText: string): Chunk[] {
  if (!extractedText || extractedText.trim().length === 0) return [];

  const parts = splitAtSentenceBoundary(extractedText, 700, 100);

  return parts.map((part, index) => ({
    text: part,
    index,
    metadata: {
      title: doc.name,
      date: doc.created_at,
      deal_id: doc.deal_id,
      contact_id: doc.contact_id,
      company_id: doc.company_id,
      source_url: `/documents/${doc.id}`,
    },
  }));
}

// ---------------------------------------------------------------
// Document Text Extraction (MT-5)
// ---------------------------------------------------------------

const SUPPORTED_TEXT_FORMATS = new Set(["txt", "md", "csv", "json"]);
const SUPPORTED_EXTRACT_FORMATS = new Set(["pdf", "docx"]);

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isExtractableFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return SUPPORTED_TEXT_FORMATS.has(ext) || SUPPORTED_EXTRACT_FORMATS.has(ext);
}

export async function extractText(filename: string, buffer: Buffer): Promise<string | null> {
  const ext = getFileExtension(filename);

  if (SUPPORTED_TEXT_FORMATS.has(ext)) {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  console.warn(`[chunker] Unsupported document format: ${ext} (${filename})`);
  return null;
}
