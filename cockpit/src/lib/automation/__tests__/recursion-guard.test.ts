import { describe, it, expect, vi } from "vitest";
import {
  checkRecursionLimit,
  MAX_UPDATE_FIELD_PER_ENTITY_PER_60S,
} from "../recursion-guard";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeSupabaseMock(rows: unknown[]) {
  const eq = vi.fn().mockReturnThis();
  const gte = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn(() => ({ eq, gte }));
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}

function makeErrorMock() {
  const eq = vi.fn().mockReturnThis();
  const gte = vi.fn().mockResolvedValue({
    data: null,
    error: { message: "boom" },
  });
  const select = vi.fn(() => ({ eq, gte }));
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}

const successUpdateRun = {
  action_results: [
    { action_index: 0, type: "update_field", outcome: "success" },
  ],
};
const failedUpdateRun = {
  action_results: [
    { action_index: 0, type: "update_field", outcome: "failed" },
  ],
};
const skippedUpdateRun = {
  action_results: [
    { action_index: 0, type: "update_field", outcome: "skipped" },
  ],
};
const otherActionRun = {
  action_results: [
    { action_index: 0, type: "create_task", outcome: "success" },
  ],
};

describe("recursion-guard", () => {
  it("allowed=true bei 0 vergangenen update_field-Success-Runs", async () => {
    const supabase = makeSupabaseMock([]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
    expect(r.limit).toBe(MAX_UPDATE_FIELD_PER_ENTITY_PER_60S);
  });

  it("allowed=true bei 2 vergangenen Runs", async () => {
    const supabase = makeSupabaseMock([successUpdateRun, successUpdateRun]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(2);
  });

  it("allowed=false bei 3 success-Runs (Limit erreicht)", async () => {
    const supabase = makeSupabaseMock([
      successUpdateRun,
      successUpdateRun,
      successUpdateRun,
    ]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(3);
  });

  it("zaehlt failed/skipped update_field-Runs nicht", async () => {
    const supabase = makeSupabaseMock([
      failedUpdateRun,
      skippedUpdateRun,
      successUpdateRun,
    ]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });

  it("zaehlt non-update_field-Runs nicht", async () => {
    const supabase = makeSupabaseMock([
      otherActionRun,
      otherActionRun,
      otherActionRun,
      otherActionRun,
    ]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
  });

  it("allowed=true (kein Limit) fuer non-update_field-Action-Types", async () => {
    const supabase = makeSupabaseMock([
      successUpdateRun,
      successUpdateRun,
      successUpdateRun,
      successUpdateRun,
    ]);
    const r = await checkRecursionLimit(supabase, "deal-1", "create_task");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
    expect(r.limit).toBe(Number.POSITIVE_INFINITY);
  });

  it("defensiv: bei DB-Fehler wird allowed=true zurueckgegeben", async () => {
    const supabase = makeErrorMock();
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
  });

  it("ignoriert Rows mit fehlerhaftem action_results (kein Array)", async () => {
    const supabase = makeSupabaseMock([
      { action_results: null },
      { action_results: "not-an-array" },
      successUpdateRun,
    ]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
  });
});
