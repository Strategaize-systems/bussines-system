// V6.2 SLC-621 MT-4 — App-Level Condition-Engine
//
// Kompakte JS-Engine fuer AND-only Condition-Match auf einer Entity-Row.
// Wird vom Trigger-Dispatcher aufgerufen, bevor automation_runs angelegt
// wird. Pure-Function, keine DB-IO, keine Library.
//
// Operators: eq | neq | gt | lt | gte | lte | in | not_in | contains
// AND-only: alle Conditions muessen erfuellt sein, leeres Array = true.

import type { Condition, ConditionOp } from "@/types/automation";

/**
 * Liest einen Wert aus dem Entity-Scope via Dot-Notation.
 * Beispiel: getValue({deal: {stage_id: "x"}}, "deal.stage_id") = "x"
 */
function getValue(entity: Record<string, unknown>, field: string): unknown {
  const parts = field.split(".");
  let cursor: unknown = entity;
  for (const part of parts) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function compareEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Lockerer Equality fuer Date-vs-string und number-vs-string
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return false;
}

function compareNumeric(a: unknown, b: unknown, op: ConditionOp): boolean {
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  switch (op) {
    case "gt":
      return na > nb;
    case "lt":
      return na < nb;
    case "gte":
      return na >= nb;
    case "lte":
      return na <= nb;
    default:
      return false;
  }
}

function compareIn(value: unknown, candidates: unknown): boolean {
  if (!Array.isArray(candidates)) return false;
  return candidates.some((c) => compareEq(value, c));
}

function compareContains(value: unknown, needle: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((v) => compareEq(v, needle));
  }
  if (typeof value === "string" && typeof needle === "string") {
    return value.toLowerCase().includes(needle.toLowerCase());
  }
  return false;
}

/**
 * Evaluiert ein einzelnes Condition gegen die Entity.
 */
export function evaluateCondition(
  condition: Condition,
  entity: Record<string, unknown>
): boolean {
  const value = getValue(entity, condition.field);
  switch (condition.op) {
    case "eq":
      return compareEq(value, condition.value);
    case "neq":
      return !compareEq(value, condition.value);
    case "gt":
    case "lt":
    case "gte":
    case "lte":
      return compareNumeric(value, condition.value, condition.op);
    case "in":
      return compareIn(value, condition.value);
    case "not_in":
      return !compareIn(value, condition.value);
    case "contains":
      return compareContains(value, condition.value);
    default:
      return false;
  }
}

/**
 * AND-only-Match: alle Conditions muessen true sein.
 * Leeres Conditions-Array = true (keine Filter).
 */
export function evaluateConditions(
  conditions: Condition[],
  entity: Record<string, unknown>
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, entity));
}
