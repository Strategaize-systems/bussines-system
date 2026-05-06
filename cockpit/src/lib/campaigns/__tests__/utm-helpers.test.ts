// V6.2 SLC-625 — UTM-Helpers Tests

import { describe, it, expect } from "vitest";
import { appendUtmIfMissing } from "../utm-helpers";

const link = {
  utm_source: "linkedin",
  utm_medium: "social",
  utm_campaign: "Q2-Outbound",
  utm_content: "post-1",
  utm_term: null,
};

describe("appendUtmIfMissing", () => {
  it("appends all UTMs to a clean URL", () => {
    const out = appendUtmIfMissing("https://example.com/landing", link);
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("linkedin");
    expect(u.searchParams.get("utm_medium")).toBe("social");
    expect(u.searchParams.get("utm_campaign")).toBe("Q2-Outbound");
    expect(u.searchParams.get("utm_content")).toBe("post-1");
    expect(u.searchParams.get("utm_term")).toBeNull(); // null skipped
  });

  it("does not overwrite existing URL params", () => {
    const out = appendUtmIfMissing(
      "https://example.com/landing?utm_source=existing",
      link
    );
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("existing");
    expect(u.searchParams.get("utm_medium")).toBe("social");
  });

  it("preserves non-utm path + params", () => {
    const out = appendUtmIfMissing(
      "https://example.com/landing/page?ref=abc#section",
      link
    );
    expect(out).toContain("/landing/page");
    expect(out).toContain("ref=abc");
    expect(out).toContain("#section");
    expect(out).toContain("utm_source=linkedin");
  });

  it("skips empty-string utm values", () => {
    const out = appendUtmIfMissing("https://example.com/landing", {
      ...link,
      utm_content: "",
    });
    const u = new URL(out);
    expect(u.searchParams.has("utm_content")).toBe(false);
  });
});
