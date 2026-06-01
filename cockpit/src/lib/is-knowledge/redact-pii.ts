// V8.7-A SLC-871 MT-2 — PII-Redact Pure-Function (DEC-250).
//
// Wird Adapter-intern in searchKnowledge() VOR dem fetch-Call aufgerufen.
// Caller in BS uebergeben q unredacted, Adapter macht den Redact transparent.
// Defense-in-Depth: jeder neuer Caller ist automatisch DSGVO-konform, keine
// Vergesslich-Falle.

const EMAIL_PATTERN = /\S+@\S+\.\S+/g;
// 6+ digits total, optional leading + and whitespace/dash separators between
// digits. Matches "+49 30 12345" (per AC-871-4) and "+491234567" alike.
// Spec MT-2 listed `/\+?\d{6,}/g` but the AC-example contains separators —
// the broader pattern matches both forms.
const PHONE_PATTERN = /\+?\d(?:[\s\-]*\d){5,}/g;

const IS_MAX_QUERY_LENGTH = 1000;

/**
 * Replaces email + phone patterns transparently.
 *
 * Order matters: email first so phone-regex does not match the numeric
 * portion of an email-local (e.g. `user1234@example.com`).
 *
 * Output is truncated to IS_MAX_QUERY_LENGTH after redact (the IS endpoint
 * accepts max 1000 chars).
 */
export function redactPiiFromQ(q: string): string {
  const redacted = q.replace(EMAIL_PATTERN, "[email]").replace(PHONE_PATTERN, "[phone]");
  if (redacted.length <= IS_MAX_QUERY_LENGTH) {
    return redacted;
  }
  return redacted.slice(0, IS_MAX_QUERY_LENGTH);
}
