import { describe, it, expect } from "vitest";
import {
  validateWorkingHours,
  compareTimes,
} from "./working-hours-validation";

describe("compareTimes", () => {
  it("returns negative when a < b", () => {
    expect(compareTimes("08:00", "09:00")).toBeLessThan(0);
  });
  it("returns positive when a > b", () => {
    expect(compareTimes("18:00", "09:00")).toBeGreaterThan(0);
  });
  it("returns zero when equal", () => {
    expect(compareTimes("12:30", "12:30")).toBe(0);
  });
});

describe("validateWorkingHours", () => {
  it("accepts both NULL", () => {
    expect(validateWorkingHours(null, null)).toEqual({ ok: true });
    expect(validateWorkingHours("", "")).toEqual({ ok: true });
  });

  it("accepts valid start < end", () => {
    expect(validateWorkingHours("09:00", "18:00")).toEqual({ ok: true });
    expect(validateWorkingHours("06:30", "21:00")).toEqual({ ok: true });
  });

  it("rejects when only one of start/end is set", () => {
    const r1 = validateWorkingHours("09:00", null);
    expect(r1.ok).toBe(false);
    expect(r1.error).toMatch(/beide gesetzt/);
    const r2 = validateWorkingHours(null, "18:00");
    expect(r2.ok).toBe(false);
  });

  it("rejects start >= end", () => {
    const r1 = validateWorkingHours("18:00", "09:00");
    expect(r1.ok).toBe(false);
    expect(r1.error).toMatch(/vor End-Zeit/);
    const r2 = validateWorkingHours("12:00", "12:00");
    expect(r2.ok).toBe(false);
  });

  it("rejects invalid time format", () => {
    expect(validateWorkingHours("9:00", "18:00").ok).toBe(false);
    expect(validateWorkingHours("09:00", "25:00").ok).toBe(false);
    expect(validateWorkingHours("ab:cd", "18:00").ok).toBe(false);
  });
});
