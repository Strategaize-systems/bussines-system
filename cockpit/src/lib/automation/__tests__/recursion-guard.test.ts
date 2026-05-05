import { describe, it, expect, vi } from "vitest";
import {
  checkRecursionLimit,
  MAX_UPDATE_FIELD_PER_ENTITY_PER_60S,
} from "../recursion-guard";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeSupabaseMock(rows: unknown[]) {
  const eq = vi.fn().mockReturnThis();
  const gte = vi.fn().mockReturnThis();
  const contains = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn(() => ({ eq, gte, contains }));
  // eq und gte fluent; eq->{eq,gte,contains}; gte->{contains}
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}

function makeErrorMock() {
  const eq = vi.fn().mockReturnThis();
  const gte = vi.fn().mockReturnThis();
  const contains = vi.fn().mockResolvedValue({
    data: null,
    error: { message: "boom" },
  });
  const select = vi.fn(() => ({ eq, gte, contains }));
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}

describe("recursion-guard", () => {
  it("allowed=true bei 0 vergangenen update_field-Runs", async () => {
    const supabase = makeSupabaseMock([]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(0);
    expect(r.limit).toBe(MAX_UPDATE_FIELD_PER_ENTITY_PER_60S);
  });

  it("allowed=true bei 2 vergangenen Runs", async () => {
    const supabase = makeSupabaseMock([{}, {}]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(2);
  });

  it("allowed=false bei 3 vergangenen Runs (Limit erreicht)", async () => {
    const supabase = makeSupabaseMock([{}, {}, {}]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(3);
  });

  it("allowed=false bei 4 vergangenen Runs (Limit ueberschritten)", async () => {
    const supabase = makeSupabaseMock([{}, {}, {}, {}]);
    const r = await checkRecursionLimit(supabase, "deal-1", "update_field");
    expect(r.allowed).toBe(false);
    expect(r.count).toBe(4);
  });

  it("allowed=true (kein Limit) fuer non-update_field-Action-Types", async () => {
    const supabase = makeSupabaseMock([{}, {}, {}, {}]);
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
});
