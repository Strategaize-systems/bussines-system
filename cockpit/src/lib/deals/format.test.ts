import { describe, it, expect } from "vitest";
import { formatCurrency, formatDueDate } from "./format";

describe("formatCurrency", () => {
  it("returns em-dash for null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("formats EUR with German thousands separator", () => {
    expect(formatCurrency(1000)).toMatch(/1\.000/);
    expect(formatCurrency(1000)).toMatch(/€/);
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toMatch(/0/);
  });

  it("rounds without fractional digits", () => {
    expect(formatCurrency(1234.99)).toMatch(/1\.235/);
  });
});

describe("formatDueDate", () => {
  const NOW = new Date("2026-05-11T12:00:00Z");

  it("returns null for null/undefined", () => {
    expect(formatDueDate(null, NOW)).toBeNull();
    expect(formatDueDate(undefined, NOW)).toBeNull();
  });

  it("returns null for invalid ISO", () => {
    expect(formatDueDate("not-a-date", NOW)).toBeNull();
  });

  it("returns 'heute' for same day", () => {
    expect(formatDueDate("2026-05-11", NOW)).toBe("heute");
  });

  it("returns 'morgen' for next day", () => {
    expect(formatDueDate("2026-05-12", NOW)).toBe("morgen");
  });

  it("returns 'in N Tagen' for 2-13 days", () => {
    expect(formatDueDate("2026-05-13", NOW)).toBe("in 2 Tagen");
    expect(formatDueDate("2026-05-14", NOW)).toBe("in 3 Tagen");
    expect(formatDueDate("2026-05-23", NOW)).toBe("in 12 Tagen");
  });

  it("returns 'in N Wochen' for >= 14 days", () => {
    expect(formatDueDate("2026-05-25", NOW)).toBe("in 2 Wochen");
    expect(formatDueDate("2026-06-22", NOW)).toBe("in 6 Wochen");
  });

  it("returns 'überfällig' for past date", () => {
    expect(formatDueDate("2026-05-10", NOW)).toBe("überfällig");
    expect(formatDueDate("2026-01-01", NOW)).toBe("überfällig");
  });
});
