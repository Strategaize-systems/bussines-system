// V8.7-B SLC-355 MT-5 — PII-Redact-before-send (belt-and-suspenders, DEC-290).
//
// Letzter Redact-Pass ueber title + body_markdown jedes Items vor dem Push an
// IS. Defense-in-Depth zusaetzlich zur LLM-Anonymisierung (MT-3): keine rohen
// Emails/Telefonnummern verlassen BS. Pattern-Reuse aus is-knowledge/redact-pii.ts.
//
// `redactPiiString` wird zusaetzlich VOR dem Bedrock-Prompt (MT-3) angewandt,
// damit rohe Kontaktdaten gar nicht erst in den LLM-Input gelangen.

import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";

const EMAIL_PATTERN = /\S+@\S+\.\S+/g;
// 6+ Ziffern, optionales fuehrendes +, Whitespace/Bindestrich als Trenner.
const PHONE_PATTERN = /\+?\d(?:[\s\-]*\d){5,}/g;

/**
 * Strippt Email + Telefon aus einem Freitext-String.
 * Reihenfolge: Email zuerst, damit die Telefon-Regex nicht den numerischen
 * Teil eines Email-Locals matcht (z.B. `user1234@example.com`).
 */
export function redactPiiString(s: string): string {
  return s.replace(EMAIL_PATTERN, "[email]").replace(PHONE_PATTERN, "[phone]");
}

/**
 * Redactet title + body_markdown jedes Items. Non-destruktiv (neue Objekte).
 */
export function redactItemsBeforeSend(
  items: IsKnowledgeIngestItem[]
): IsKnowledgeIngestItem[] {
  return items.map((item) => ({
    ...item,
    title: redactPiiString(item.title),
    body_markdown: redactPiiString(item.body_markdown),
  }));
}
