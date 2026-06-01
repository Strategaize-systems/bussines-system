import { describe, it, expect } from "vitest";

import { redactPiiFromQ } from "@/lib/is-knowledge/redact-pii";

describe("redactPiiFromQ — V8.7-A SLC-871 MT-2 (DEC-250)", () => {
  it("replaces a single email with [email]", () => {
    const out = redactPiiFromQ("kontakt test@example.com Vollmacht-Klausel");
    expect(out).toBe("kontakt [email] Vollmacht-Klausel");
  });

  it("replaces multiple emails in the same query", () => {
    const out = redactPiiFromQ(
      "vergleiche alice@beispiel.de und bob@partner.co"
    );
    expect(out).toBe("vergleiche [email] und [email]");
  });

  it("replaces phone-numbers including whitespace separators (per AC-871-4)", () => {
    const out = redactPiiFromQ("+49 30 12345 Steuerberater");
    expect(out).toBe("[phone] Steuerberater");
  });

  it("redacts both email and phone in a single mixed query (per MT-2 verification)", () => {
    const out = redactPiiFromQ(
      "wie behandeln wir den Mandanten test@example.com bei +49 30 12345?"
    );
    expect(out).toBe("wie behandeln wir den Mandanten [email] bei [phone]?");
  });

  it("replaces email FIRST so phone-pattern does not eat domain numerals", () => {
    // user1234@example.com enthaelt '1234' — Phone-Regex wuerde greifen,
    // wenn die Reihenfolge falsch waere. Email muss zuerst laufen.
    const out = redactPiiFromQ("frage zu user1234@example.com Vollmacht");
    expect(out).toBe("frage zu [email] Vollmacht");
  });

  it("preserves text without PII unchanged", () => {
    const input = "wie behandeln wir den Einwand 'zu teuer' bei Steuerberatern?";
    expect(redactPiiFromQ(input)).toBe(input);
  });

  it("returns empty string for empty input", () => {
    expect(redactPiiFromQ("")).toBe("");
  });

  it("truncates output to max 1000 chars after redact (IS hard limit)", () => {
    const longTail = "x".repeat(2000);
    const out = redactPiiFromQ(`test@example.com ${longTail}`);
    expect(out.length).toBeLessThanOrEqual(1000);
    expect(out.startsWith("[email] ")).toBe(true);
  });
});
