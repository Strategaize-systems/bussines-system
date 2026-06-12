// V8.7-B SLC-355 MT-5 — Redact-before-send. Deckt AC-355-5.

import { describe, expect, it } from "vitest";

import { redactItemsBeforeSend, redactPiiString } from "../redact";
import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";

function item(overrides: Partial<IsKnowledgeIngestItem> = {}): IsKnowledgeIngestItem {
  return {
    title: "T",
    body_markdown: "B",
    domain: "sales",
    source_system: "business_system",
    source_reference: "ref-1",
    tags: [],
    metadata: {},
    ...overrides,
  };
}

describe("redactPiiString", () => {
  it("ersetzt Email durch [email]", () => {
    expect(redactPiiString("Mail an max@acme.com bitte")).toBe(
      "Mail an [email] bitte"
    );
  });
  it("ersetzt Telefon (mit Trennern) durch [phone]", () => {
    expect(redactPiiString("Tel +49 30 1234567")).toBe("Tel [phone]");
  });
  it("laesst sauberen Text unveraendert", () => {
    expect(redactPiiString("Kunde fand Preis zu hoch")).toBe(
      "Kunde fand Preis zu hoch"
    );
  });
});

describe("redactItemsBeforeSend — AC-355-5", () => {
  it("redactet title + body_markdown jedes Items", () => {
    const out = redactItemsBeforeSend([
      item({
        title: "Kontakt max@acme.com",
        body_markdown: "Anruf +49 171 9998887 — gewonnen",
      }),
    ]);
    expect(out[0].title).toBe("Kontakt [email]");
    expect(out[0].body_markdown).toContain("[phone]");
    expect(out[0].body_markdown).not.toContain("9998887");
  });

  it("ist non-destruktiv (Original unveraendert)", () => {
    const original = item({ title: "max@acme.com" });
    const out = redactItemsBeforeSend([original]);
    expect(original.title).toBe("max@acme.com");
    expect(out[0].title).toBe("[email]");
  });

  it("laesst andere Felder (source_reference, tags, metadata) unberuehrt", () => {
    const out = redactItemsBeforeSend([
      item({ source_reference: "bs-winloss-2026-W24-x", tags: ["winloss"], metadata: { deal_count: 3 } }),
    ]);
    expect(out[0].source_reference).toBe("bs-winloss-2026-W24-x");
    expect(out[0].tags).toEqual(["winloss"]);
    expect(out[0].metadata).toEqual({ deal_count: 3 });
  });
});
