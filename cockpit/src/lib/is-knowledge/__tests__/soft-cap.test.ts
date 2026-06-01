import { describe, expect, it } from "vitest";

import {
  IS_KNOWLEDGE_SOFT_CAP,
  SOFT_CAP_STORAGE_KEY,
  shouldSkipIsCall,
} from "@/lib/is-knowledge/soft-cap";

describe("shouldSkipIsCall — V8.7-A SLC-871 MT-6 (DEC-252)", () => {
  it("returns false below the cap (0, 1, 19 calls)", () => {
    expect(shouldSkipIsCall(0)).toBe(false);
    expect(shouldSkipIsCall(1)).toBe(false);
    expect(shouldSkipIsCall(19)).toBe(false);
  });

  it("returns true at and above the cap (20, 21, 100 calls)", () => {
    expect(shouldSkipIsCall(20)).toBe(true);
    expect(shouldSkipIsCall(21)).toBe(true);
    expect(shouldSkipIsCall(100)).toBe(true);
  });

  it("respects caller-supplied cap override (used in tests / lower-tier projects)", () => {
    expect(shouldSkipIsCall(4, 5)).toBe(false);
    expect(shouldSkipIsCall(5, 5)).toBe(true);
    expect(shouldSkipIsCall(6, 5)).toBe(true);
  });

  it("exports stable Cap and Storage-Key constants for integration callers", () => {
    expect(IS_KNOWLEDGE_SOFT_CAP).toBe(20);
    expect(SOFT_CAP_STORAGE_KEY).toBe("isKnowledgeCallCount");
  });
});
