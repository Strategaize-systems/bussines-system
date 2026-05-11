import { describe, it, expect } from "vitest";
import {
  computeHourRange,
  parseHour,
  buildHours,
  DEFAULT_HOUR_RANGE,
  isWorkingHoursConfigured,
} from "./hour-range";

describe("parseHour", () => {
  it("returns null for null/undefined/empty", () => {
    expect(parseHour(null)).toBeNull();
    expect(parseHour(undefined)).toBeNull();
    expect(parseHour("")).toBeNull();
  });

  it("returns hour number for valid HH:MM", () => {
    expect(parseHour("09:00")).toBe(9);
    expect(parseHour("18:30")).toBe(18);
    expect(parseHour("00:00")).toBe(0);
    expect(parseHour("23:59")).toBe(23);
  });

  it("returns null for invalid format", () => {
    expect(parseHour("9")).toBeNull();
    expect(parseHour("25:00")).toBeNull();
    expect(parseHour("ab:cd")).toBeNull();
  });
});

describe("buildHours", () => {
  it("builds 06-21 default range with 16 entries", () => {
    expect(buildHours(6, 21)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    ]);
  });

  it("returns empty for end <= start", () => {
    expect(buildHours(10, 10)).toEqual([]);
    expect(buildHours(15, 10)).toEqual([]);
  });
});

describe("computeHourRange", () => {
  it("returns DEFAULT range when mode='full'", () => {
    const r = computeHourRange("full", { start: "09:00", end: "18:00" });
    expect(r.start).toBe(DEFAULT_HOUR_RANGE.start);
    expect(r.end).toBe(DEFAULT_HOUR_RANGE.end);
    expect(r.hours).toHaveLength(16);
  });

  it("returns DEFAULT range when mode='work' but no working hours set", () => {
    const r = computeHourRange("work", null);
    expect(r.start).toBe(DEFAULT_HOUR_RANGE.start);
    expect(r.end).toBe(DEFAULT_HOUR_RANGE.end);
  });

  it("returns DEFAULT range when only one of start/end is set", () => {
    const r = computeHourRange("work", { start: "09:00", end: null });
    expect(r.start).toBe(DEFAULT_HOUR_RANGE.start);
  });

  it("returns Working-Hours range when mode='work' and both set", () => {
    const r = computeHourRange("work", { start: "09:00", end: "18:00" });
    expect(r.start).toBe(9);
    expect(r.end).toBe(18);
    expect(r.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it("returns DEFAULT range when working hours have start >= end", () => {
    const r = computeHourRange("work", { start: "18:00", end: "09:00" });
    expect(r.start).toBe(DEFAULT_HOUR_RANGE.start);
  });
});

describe("isWorkingHoursConfigured", () => {
  it("returns false for null/undefined/empty", () => {
    expect(isWorkingHoursConfigured(null)).toBe(false);
    expect(isWorkingHoursConfigured(undefined)).toBe(false);
    expect(isWorkingHoursConfigured({ start: null, end: null })).toBe(false);
  });

  it("returns false when only one is set", () => {
    expect(isWorkingHoursConfigured({ start: "09:00", end: null })).toBe(false);
  });

  it("returns true when both set", () => {
    expect(isWorkingHoursConfigured({ start: "09:00", end: "18:00" })).toBe(true);
  });
});
