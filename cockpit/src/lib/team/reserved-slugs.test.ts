import { describe, it, expect } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "./reserved-slugs";

describe("RESERVED_SLUGS coverage", () => {
  it("contains all 27 spec AC2 min-set entries", () => {
    const minSet = ["admin", "api", "public", "p", "partner", "strategaize", "auth", "assets", "_next", "favicon.ico", "dashboard", "login", "datenschutz", "impressum", "settings", "help", "consent", "deals", "pipeline", "contacts", "companies", "multiplikatoren", "calendar", "mein-tag", "focus", "audit-log", "handoffs", "referrals"];
    for (const slug of minSet) expect(RESERVED_SLUGS.has(slug)).toBe(true);
  });
  it("isReservedSlug works case-insensitive", () => {
    expect(isReservedSlug("Admin")).toBe(true);
    expect(isReservedSlug("ADMIN")).toBe(true);
    expect(isReservedSlug("dashBoard")).toBe(true);
    expect(isReservedSlug("Strategaize-Transition-BV")).toBe(false);
  });
  it("rejects non-reserved", () => {
    expect(isReservedSlug("mueller-gmbh")).toBe(false);
    expect(isReservedSlug("test-kanzlei")).toBe(false);
  });
});
