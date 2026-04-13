import { simpleParser, ParsedMail } from "mailparser";

export interface ParsedEmail {
  messageId: string;
  inReplyTo: string | null;
  references: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[] | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: string;
  attachments: { filename: string; mime_type: string; size_bytes: number }[];
  headersJson: Record<string, string> | null;
}

export async function parseEmail(source: Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(source);

  const fromAddr = parsed.from?.value?.[0];
  const toValues = parsed.to
    ? Array.isArray(parsed.to)
      ? parsed.to.flatMap((t) => t.value)
      : parsed.to.value
    : [];
  const ccValues = parsed.cc
    ? Array.isArray(parsed.cc)
      ? parsed.cc.flatMap((c) => c.value)
      : parsed.cc.value
    : null;

  return {
    messageId:
      parsed.messageId ||
      `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    inReplyTo: (parsed.inReplyTo as string) || null,
    references: Array.isArray(parsed.references)
      ? parsed.references.join(" ")
      : (parsed.references as string) || null,
    fromAddress: fromAddr?.address || "unknown@unknown",
    fromName: fromAddr?.name || null,
    toAddresses: toValues
      .map((a) => a.address)
      .filter(Boolean) as string[],
    ccAddresses: ccValues
      ? (ccValues
          .map((a) => a.address)
          .filter(Boolean) as string[])
      : null,
    subject: parsed.subject || null,
    bodyText: parsed.text || null,
    bodyHtml: parsed.html ? String(parsed.html) : null,
    receivedAt: parsed.date?.toISOString() || new Date().toISOString(),
    attachments: (parsed.attachments || []).map((a) => ({
      filename: a.filename || "unnamed",
      mime_type: a.contentType || "application/octet-stream",
      size_bytes: a.size || 0,
    })),
    headersJson: extractRelevantHeaders(parsed),
  };
}

/** Normalize subject for thread matching (strip Re:/AW:/Fwd:/WG: prefixes) */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re|AW|Fwd|WG|Wtr)(\[\d+\])?:\s*/gi, "")
    .trim();
}

function extractRelevantHeaders(
  parsed: ParsedMail
): Record<string, string> | null {
  const headers: Record<string, string> = {};
  const keys = [
    "auto-submitted",
    "x-auto-response-suppress",
    "precedence",
    "list-unsubscribe",
    "list-id",
    "x-mailer",
    "return-path",
  ];

  for (const key of keys) {
    const value = parsed.headers?.get(key);
    if (value) {
      headers[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  return Object.keys(headers).length > 0 ? headers : null;
}
