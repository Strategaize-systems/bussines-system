// SLC-665 MT-8 — Cache-TTL-Logik fuer manuellen Re-Run.

import { describe, it, expect } from "vitest";
import { isAutoRunFresh, WINLOSS_CACHE_TTL_MS } from "./cache-ttl";

describe("isAutoRunFresh", () => {
  it("returns true when triggered within last 24h", () => {
    const now = Date.parse("2026-05-11T12:00:00Z");
    const oneHourAgo = "2026-05-11T11:00:00Z";
    expect(isAutoRunFresh(oneHourAgo, now, WINLOSS_CACHE_TTL_MS)).toBe(true);
  });

  it("returns false when triggered more than 24h ago", () => {
    const now = Date.parse("2026-05-11T12:00:00Z");
    const twoDaysAgo = "2026-05-09T12:00:00Z";
    expect(isAutoRunFresh(twoDaysAgo, now, WINLOSS_CACHE_TTL_MS)).toBe(false);
  });

  it("returns false for invalid date strings", () => {
    expect(isAutoRunFresh("not-a-date", Date.now(), WINLOSS_CACHE_TTL_MS)).toBe(
      false
    );
  });

  it("respects custom TTL", () => {
    const now = Date.parse("2026-05-11T12:00:00Z");
    const tenMinAgo = "2026-05-11T11:50:00Z";
    expect(isAutoRunFresh(tenMinAgo, now, 5 * 60 * 1000)).toBe(false);
    expect(isAutoRunFresh(tenMinAgo, now, 30 * 60 * 1000)).toBe(true);
  });
});
