import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCached,
  setCached,
  invalidate,
  makeCacheKey,
  __resetCacheForTests,
} from "../cache";
import type { ReportResult } from "@/components/ki-workspace/types";

const RESULT: ReportResult = {
  markdown: "# Test\n\nBody.",
  completedAt: "2026-05-10T08:00:00Z",
  model: "test-model",
  refreshable: true,
};

describe("ki-workspace cache", () => {
  beforeEach(() => {
    __resetCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null on miss", () => {
    expect(getCached("missing-key")).toBeNull();
  });

  it("hits within TTL window", () => {
    const key = makeCacheKey("tagesanalyse", { userId: "u1" });
    setCached(key, RESULT);
    expect(getCached(key)).toEqual(RESULT);
  });

  it("expires after 5-minute TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T08:00:00Z"));

    const key = makeCacheKey("tagesanalyse", { userId: "u1" });
    setCached(key, RESULT);
    expect(getCached(key)).toEqual(RESULT);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(getCached(key)).toBeNull();
  });

  it("invalidates explicitly", () => {
    const key = makeCacheKey("briefing", { userId: "u1", dealId: "d1" });
    setCached(key, RESULT);
    expect(getCached(key)).toEqual(RESULT);

    invalidate(key);
    expect(getCached(key)).toBeNull();
  });

  it("disambiguates by scope (dealId)", () => {
    const k1 = makeCacheKey("briefing", { userId: "u1", dealId: "d1" });
    const k2 = makeCacheKey("briefing", { userId: "u1", dealId: "d2" });
    setCached(k1, RESULT);
    expect(getCached(k1)).toEqual(RESULT);
    expect(getCached(k2)).toBeNull();
  });
});
