import { describe, expect, it } from "vitest";

import {
  formatHitsForBedrockContext,
  IS_FOOTER_TEXT,
  mapIsErrorToUserMessage,
  SOFT_CAP_ERROR_MARKER,
  SOFT_CAP_FOOTER_TEXT,
  toIsKnowledgeHits,
} from "@/lib/is-knowledge/format-hits";
import {
  IsKnowledgeError,
  type KnowledgeSearchHit,
} from "@/lib/is-knowledge/types";

const hit = (
  partial: Partial<KnowledgeSearchHit> & { id: string; similarity: number; title: string }
): KnowledgeSearchHit => ({
  body_markdown: "",
  domain: "sales",
  tags: [],
  source_system: "founder",
  source_reference: null,
  metadata: {},
  ...partial,
});

describe("toIsKnowledgeHits — MT-4 (DEC-255 lean UI shape)", () => {
  it("projects the full hit to {id, title, similarity}", () => {
    const out = toIsKnowledgeHits([
      hit({ id: "a", title: "Pattern A", similarity: 0.93, body_markdown: "lots of detail" }),
      hit({ id: "b", title: "Pattern B", similarity: 0.81 }),
    ]);
    expect(out).toEqual([
      { id: "a", title: "Pattern A", similarity: 0.93 },
      { id: "b", title: "Pattern B", similarity: 0.81 },
    ]);
  });
});

describe("formatHitsForBedrockContext — MT-4 (DEC-255 Bedrock-Context Block)", () => {
  it("returns empty string for empty hits", () => {
    expect(formatHitsForBedrockContext([])).toBe("");
  });

  it("renders header + sorted bullet list with percentages", () => {
    const out = formatHitsForBedrockContext([
      hit({ id: "a", title: "Pattern A", similarity: 0.5 }),
      hit({ id: "b", title: "Pattern B", similarity: 0.95 }),
      hit({ id: "c", title: "Pattern C", similarity: 0.75 }),
    ]);
    expect(out).toContain("**Aus Strategaize-Wissens-Basis:**");
    const lines = out.split("\n");
    const bullets = lines.filter((l) => l.startsWith("- "));
    expect(bullets[0]).toBe("- Pattern B (95%)");
    expect(bullets[1]).toBe("- Pattern C (75%)");
    expect(bullets[2]).toBe("- Pattern A (50%)");
  });

  it("clamps to maxItems (default 5)", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      hit({ id: `id-${i}`, title: `Item ${i}`, similarity: 1 - i * 0.1 })
    );
    const out = formatHitsForBedrockContext(many);
    const bullets = out.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets.length).toBe(5);
  });

  it("includes body_markdown excerpt (truncated to 400 chars) when present", () => {
    const longBody = "ein wichtiger Hinweis: ".repeat(40);
    const out = formatHitsForBedrockContext([
      hit({
        id: "a",
        title: "Pattern A",
        similarity: 0.9,
        body_markdown: longBody,
      }),
    ]);
    const indent = out.split("\n").find((l) => l.startsWith("  "));
    expect(indent).toBeDefined();
    expect(indent!.length).toBeLessThanOrEqual(2 + 400);
  });
});

describe("mapIsErrorToUserMessage — MT-4 (DEC-256 Graceful-Degradation)", () => {
  it("maps auth to admin-info text", () => {
    const msg = mapIsErrorToUserMessage(new IsKnowledgeError("auth", 401));
    expect(msg).toContain("Authentifizierungs-Fehler");
    expect(msg).toContain("System-Admin");
  });

  it("maps rate_limit to overload text", () => {
    const msg = mapIsErrorToUserMessage(
      new IsKnowledgeError("rate_limit", 429, 30)
    );
    expect(msg).toContain("ueberlastet");
  });

  it("maps timeout/network/server to identical 'aktuell nicht erreichbar' text", () => {
    const a = mapIsErrorToUserMessage(new IsKnowledgeError("timeout"));
    const b = mapIsErrorToUserMessage(new IsKnowledgeError("network"));
    const c = mapIsErrorToUserMessage(new IsKnowledgeError("server", 500));
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toContain("aktuell nicht erreichbar");
  });
});

describe("Constants — MT-4", () => {
  it("exports SOFT_CAP_ERROR_MARKER + SOFT_CAP_FOOTER_TEXT + IS_FOOTER_TEXT", () => {
    expect(SOFT_CAP_ERROR_MARKER).toBe("soft_cap_reached");
    expect(SOFT_CAP_FOOTER_TEXT).toContain("20/20");
    expect(IS_FOOTER_TEXT).toContain("Strategaize-Wissen");
  });
});
