// V6.2 SLC-625 — Token-Generator Tests (DEC-137)

import { describe, it, expect } from "vitest";
import { generateCampaignToken, isValidCampaignToken } from "../token";

describe("generateCampaignToken", () => {
  it("returns an 8-char base64url string", () => {
    const t = generateCampaignToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it("produces 1000 unique tokens without collision", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(generateCampaignToken());
    }
    expect(seen.size).toBe(1000);
  });

  it("never contains URL-unsafe chars", () => {
    for (let i = 0; i < 100; i++) {
      const t = generateCampaignToken();
      expect(t).not.toMatch(/[+/=]/);
    }
  });
});

describe("isValidCampaignToken", () => {
  it("accepts a freshly generated token", () => {
    expect(isValidCampaignToken(generateCampaignToken())).toBe(true);
  });

  it("rejects too-short tokens", () => {
    expect(isValidCampaignToken("abc")).toBe(false);
  });

  it("rejects too-long tokens", () => {
    expect(isValidCampaignToken("aaaaaaaaa")).toBe(false);
  });

  it("rejects tokens with URL-unsafe chars", () => {
    expect(isValidCampaignToken("aaaa+aaa")).toBe(false);
    expect(isValidCampaignToken("aaaa/aaa")).toBe(false);
    expect(isValidCampaignToken("aaaa=aaa")).toBe(false);
  });
});
