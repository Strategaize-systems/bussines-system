// V8 SLC-812 MT-3 — Tests fuer formatModelDisplayName.

import { describe, it, expect } from "vitest";
import { formatModelDisplayName } from "@/lib/llm-display";

describe("formatModelDisplayName", () => {
  it("returns 'KI' for short-form sonnet alias (default)", () => {
    expect(formatModelDisplayName("eu.anthropic.claude-sonnet-4-6")).toBe("KI");
  });

  it("returns 'KI' for full inference-profile id (default)", () => {
    expect(
      formatModelDisplayName("eu.anthropic.claude-sonnet-4-6-20250514-v1:0"),
    ).toBe("KI");
  });

  it("returns 'KI' for unknown model id (fallback)", () => {
    expect(formatModelDisplayName("future-unknown-model")).toBe("KI");
  });

  it("returns 'KI' for null/undefined/empty input", () => {
    expect(formatModelDisplayName(null)).toBe("KI");
    expect(formatModelDisplayName(undefined)).toBe("KI");
    expect(formatModelDisplayName("")).toBe("KI");
  });

  it("returns 'KI Sonnet' for sonnet model when detail=true", () => {
    expect(
      formatModelDisplayName("eu.anthropic.claude-sonnet-4-6", { detail: true }),
    ).toBe("KI Sonnet");
  });

  it("returns 'KI Haiku' for haiku model when detail=true", () => {
    expect(
      formatModelDisplayName("anthropic.claude-haiku-4-5-20251001-v1:0", {
        detail: true,
      }),
    ).toBe("KI Haiku");
  });

  it("returns 'KI' when detail=true but unknown family", () => {
    expect(
      formatModelDisplayName("future-unknown-model", { detail: true }),
    ).toBe("KI");
  });
});
