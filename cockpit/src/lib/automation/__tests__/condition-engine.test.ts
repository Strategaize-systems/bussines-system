// V6.2 SLC-621 MT-4 — Condition-Engine Vitest
import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  evaluateConditions,
} from "../condition-engine";
import type { Condition } from "@/types/automation";

describe("evaluateCondition — Operators", () => {
  it("eq matches exact string equality", () => {
    expect(
      evaluateCondition(
        { field: "stage_id", op: "eq", value: "abc" },
        { stage_id: "abc" }
      )
    ).toBe(true);
  });

  it("eq is case-insensitive trimmed for strings", () => {
    expect(
      evaluateCondition(
        { field: "stage_id", op: "eq", value: " ABC " },
        { stage_id: "abc" }
      )
    ).toBe(true);
  });

  it("neq is true when values differ", () => {
    expect(
      evaluateCondition(
        { field: "stage_id", op: "neq", value: "abc" },
        { stage_id: "xyz" }
      )
    ).toBe(true);
  });

  it("gt|lt|gte|lte for numbers", () => {
    expect(
      evaluateCondition({ field: "value", op: "gt", value: 100 }, { value: 200 })
    ).toBe(true);
    expect(
      evaluateCondition({ field: "value", op: "lt", value: 100 }, { value: 50 })
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: "value", op: "gte", value: 100 },
        { value: 100 }
      )
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: "value", op: "lte", value: 100 },
        { value: 100 }
      )
    ).toBe(true);
  });

  it("gt returns false for non-numeric values", () => {
    expect(
      evaluateCondition(
        { field: "value", op: "gt", value: 100 },
        { value: "not-a-number" }
      )
    ).toBe(false);
  });

  it("in matches when value is in array", () => {
    expect(
      evaluateCondition(
        { field: "type", op: "in", value: ["call", "email"] },
        { type: "call" }
      )
    ).toBe(true);
  });

  it("not_in is true when value not in array", () => {
    expect(
      evaluateCondition(
        { field: "type", op: "not_in", value: ["call", "email"] },
        { type: "task" }
      )
    ).toBe(true);
  });

  it("contains works for arrays", () => {
    expect(
      evaluateCondition(
        { field: "tags", op: "contains", value: "vip" },
        { tags: ["vip", "premium"] }
      )
    ).toBe(true);
  });

  it("contains works for strings (case-insensitive)", () => {
    expect(
      evaluateCondition(
        { field: "title", op: "contains", value: "OPP" },
        { title: "Big opportunity" }
      )
    ).toBe(true);
  });

  it("dot-notation for nested fields", () => {
    expect(
      evaluateCondition(
        { field: "deal.stage_id", op: "eq", value: "x" },
        { deal: { stage_id: "x" } }
      )
    ).toBe(true);
  });

  it("missing field returns false for eq", () => {
    expect(
      evaluateCondition(
        { field: "missing.path", op: "eq", value: "x" },
        { other: 1 }
      )
    ).toBe(false);
  });

  it("unknown op returns false", () => {
    expect(
      evaluateCondition(
        { field: "x", op: "weird" as never, value: 1 },
        { x: 1 }
      )
    ).toBe(false);
  });
});

describe("evaluateConditions — AND-only Match", () => {
  it("empty array returns true", () => {
    expect(evaluateConditions([], { x: 1 })).toBe(true);
  });

  it("all conditions match → true", () => {
    const conds: Condition[] = [
      { field: "value", op: "gt", value: 100 },
      { field: "stage_id", op: "eq", value: "abc" },
    ];
    expect(evaluateConditions(conds, { value: 200, stage_id: "abc" })).toBe(
      true
    );
  });

  it("one fails → false", () => {
    const conds: Condition[] = [
      { field: "value", op: "gt", value: 100 },
      { field: "stage_id", op: "eq", value: "abc" },
    ];
    expect(evaluateConditions(conds, { value: 200, stage_id: "xyz" })).toBe(
      false
    );
  });

  it("none match → false", () => {
    const conds: Condition[] = [
      { field: "value", op: "gt", value: 100 },
      { field: "stage_id", op: "eq", value: "abc" },
    ];
    expect(evaluateConditions(conds, { value: 50, stage_id: "xyz" })).toBe(
      false
    );
  });
});
