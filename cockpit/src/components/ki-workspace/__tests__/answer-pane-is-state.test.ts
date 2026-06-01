import { describe, expect, it } from "vitest";

import {
  classifyIsBlockState,
  formatSimilarityPercent,
  pickIsFooterText,
} from "@/components/ki-workspace/answer-pane-is-state";
import {
  IS_FOOTER_TEXT,
  SOFT_CAP_FOOTER_TEXT,
  SOFT_CAP_ERROR_MARKER,
} from "@/lib/is-knowledge/format-hits";
import type { ReportResult } from "@/components/ki-workspace/types";

const base: ReportResult = {
  markdown: "Antwort",
  completedAt: "2026-06-01T00:00:00Z",
  model: "claude-sonnet-4-6",
  refreshable: true,
};

describe("classifyIsBlockState — V8.7-A SLC-871 MT-5 (DEC-255 + DEC-256)", () => {
  it("kind='none' for null/undefined result", () => {
    expect(classifyIsBlockState(null).kind).toBe("none");
    expect(classifyIsBlockState(undefined).kind).toBe("none");
  });

  it("kind='none' when no hits and no error", () => {
    expect(classifyIsBlockState(base).kind).toBe("none");
  });

  it("kind='soft_cap' when isKnowledgeError === SOFT_CAP_ERROR_MARKER", () => {
    expect(
      classifyIsBlockState({
        ...base,
        isKnowledgeError: SOFT_CAP_ERROR_MARKER,
      }).kind
    ).toBe("soft_cap");
  });

  it("kind='error' with userMessage for other errors", () => {
    const state = classifyIsBlockState({
      ...base,
      isKnowledgeError: "Strategaize-Wissens-Basis aktuell nicht erreichbar",
    });
    expect(state.kind).toBe("error");
    if (state.kind === "error") {
      expect(state.message).toContain("aktuell nicht erreichbar");
    }
  });

  it("kind='hits' with sorted-desc array when hits present", () => {
    const state = classifyIsBlockState({
      ...base,
      isKnowledgeHits: [
        { id: "a", title: "A", similarity: 0.5 },
        { id: "b", title: "B", similarity: 0.95 },
        { id: "c", title: "C", similarity: 0.75 },
      ],
    });
    expect(state.kind).toBe("hits");
    if (state.kind === "hits") {
      expect(state.sorted.map((h) => h.id)).toEqual(["b", "c", "a"]);
    }
  });

  it("kind='none' when isKnowledgeHits is empty array AND no error", () => {
    const state = classifyIsBlockState({
      ...base,
      isKnowledgeHits: [],
    });
    expect(state.kind).toBe("none");
  });
});

describe("pickIsFooterText — V8.7-A SLC-871 MT-5", () => {
  it("returns null when showIsFooter is not true", () => {
    expect(
      pickIsFooterText(base, { kind: "none" })
    ).toBeNull();
    expect(
      pickIsFooterText({ ...base, showIsFooter: false }, { kind: "none" })
    ).toBeNull();
  });

  it("returns SOFT_CAP_FOOTER_TEXT when block-state is soft_cap", () => {
    expect(
      pickIsFooterText({ ...base, showIsFooter: true }, { kind: "soft_cap" })
    ).toBe(SOFT_CAP_FOOTER_TEXT);
  });

  it("returns IS_FOOTER_TEXT for hits/none/error when showIsFooter=true", () => {
    expect(
      pickIsFooterText(
        { ...base, showIsFooter: true },
        { kind: "hits", sorted: [] }
      )
    ).toBe(IS_FOOTER_TEXT);
    expect(
      pickIsFooterText({ ...base, showIsFooter: true }, { kind: "none" })
    ).toBe(IS_FOOTER_TEXT);
    expect(
      pickIsFooterText(
        { ...base, showIsFooter: true },
        { kind: "error", message: "x" }
      )
    ).toBe(IS_FOOTER_TEXT);
  });
});

describe("formatSimilarityPercent — V8.7-A SLC-871 MT-5", () => {
  it("rounds 0..1 similarity to nearest percent", () => {
    expect(formatSimilarityPercent(0.95)).toBe("95%");
    expect(formatSimilarityPercent(0.8734)).toBe("87%");
    expect(formatSimilarityPercent(0.5)).toBe("50%");
    expect(formatSimilarityPercent(0)).toBe("0%");
    expect(formatSimilarityPercent(1)).toBe("100%");
  });

  it("clamps out-of-range values defensively", () => {
    expect(formatSimilarityPercent(1.5)).toBe("100%");
    expect(formatSimilarityPercent(-0.2)).toBe("0%");
  });
});
