import { describe, it, expect } from "vitest";
import {
  sanitizeTypeaheadQuery,
  mergeTypeaheadResults,
  type TypeaheadDealResult,
} from "./typeahead";

describe("sanitizeTypeaheadQuery", () => {
  it("returns null for empty string", () => {
    expect(sanitizeTypeaheadQuery("")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(sanitizeTypeaheadQuery("   ")).toBeNull();
  });

  it("returns null for length < 2 after trim", () => {
    expect(sanitizeTypeaheadQuery("a")).toBeNull();
    expect(sanitizeTypeaheadQuery(" a ")).toBeNull();
  });

  it("accepts normal text of length >= 2", () => {
    expect(sanitizeTypeaheadQuery("Acme")).toBe("Acme");
    expect(sanitizeTypeaheadQuery("  Acme  ")).toBe("Acme");
  });

  it("escapes SQL ILIKE wildcards % and _", () => {
    expect(sanitizeTypeaheadQuery("50% off")).toBe("50\\% off");
    expect(sanitizeTypeaheadQuery("foo_bar")).toBe("foo\\_bar");
    expect(sanitizeTypeaheadQuery("a%b_c")).toBe("a\\%b\\_c");
  });

  it("escapes backslashes", () => {
    expect(sanitizeTypeaheadQuery("a\\b")).toBe("a\\\\b");
  });

  it("caps query at 200 characters", () => {
    const long = "a".repeat(500);
    const result = sanitizeTypeaheadQuery(long);
    expect(result).toHaveLength(200);
  });
});

function makeResult(id: string, overrides: Partial<TypeaheadDealResult> = {}): TypeaheadDealResult {
  return {
    id,
    title: `Deal ${id}`,
    company_name: null,
    contact_name: null,
    ...overrides,
  };
}

describe("mergeTypeaheadResults", () => {
  it("returns empty for all-empty inputs", () => {
    expect(mergeTypeaheadResults([], [], [], 10)).toEqual([]);
  });

  it("preserves title-first order", () => {
    const result = mergeTypeaheadResults(
      [makeResult("t1"), makeResult("t2")],
      [makeResult("c1")],
      [makeResult("p1")],
      10,
    );
    expect(result.map((r) => r.id)).toEqual(["t1", "t2", "c1", "p1"]);
  });

  it("dedupes by id across all 3 sources", () => {
    const result = mergeTypeaheadResults(
      [makeResult("shared", { title: "From title" })],
      [makeResult("shared", { title: "From company" })],
      [makeResult("shared", { title: "From contact" })],
      10,
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("From title");
  });

  it("limits total results", () => {
    const result = mergeTypeaheadResults(
      [makeResult("t1"), makeResult("t2"), makeResult("t3")],
      [makeResult("c1"), makeResult("c2")],
      [makeResult("p1")],
      4,
    );
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.id)).toEqual(["t1", "t2", "t3", "c1"]);
  });

  it("dedupes company match against title match", () => {
    const result = mergeTypeaheadResults(
      [makeResult("d1")],
      [makeResult("d1"), makeResult("d2")],
      [],
      10,
    );
    expect(result.map((r) => r.id)).toEqual(["d1", "d2"]);
  });
});
