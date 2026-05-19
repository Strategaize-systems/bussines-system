// V7.6 SLC-762 MT-4 — deleteCustomReport Server-Action Unit-Tests.
//
// Verifiziert:
//   1. Validation-Fail (id kein uuid) -> { ok:false, code:"infra" }.
//   2. Pre-SELECT no-row -> { ok:false, code:"not_found" }.
//   3. DELETE error -> { ok:false, code:"infra" }.
//   4. Success: DELETE + audit_log mit name.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { deleteCustomReport } = await import("../actions/delete");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");

const VALID_UUID = "11111111-2222-4333-8444-555555555555";

function profile() {
  return {
    user_id: "user-1",
    role: "member" as const,
    team_id: null,
    display_name: "Test User",
  };
}

interface SupabaseMockOpts {
  selectRow?: { id: string; name: string } | null;
  deleteError?: { message: string } | null;
  auditInsert?: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const selectRes = {
    data:
      opts.selectRow === undefined
        ? { id: VALID_UUID, name: "Soll geloescht" }
        : opts.selectRow,
    error: null,
  };
  const deleteRes = { error: opts.deleteError ?? null };
  const auditInsert =
    opts.auditInsert ?? vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "custom_reports") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue(selectRes),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue(deleteRes),
        })),
      };
    }
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table: ${table}`);
  });
  return { from, auditInsert };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(createClient).mockReset();
});

describe("deleteCustomReport", () => {
  it("rejects with infra when id is not a uuid", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await deleteCustomReport({ id: "not-a-uuid" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns not_found when pre-select yields no row", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({ selectRow: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await deleteCustomReport({ id: VALID_UUID });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("not_found");
  });

  it("returns infra on delete error", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      deleteError: { message: "permission denied" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await deleteCustomReport({ id: VALID_UUID });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
  });

  it("returns ok and inserts audit_log with name on success", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await deleteCustomReport({ id: VALID_UUID });

    expect(res.ok).toBe(true);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    const row = auditInsert.mock.calls[0][0];
    expect(row.action).toBe("custom_report.deleted");
    expect(row.entity_id).toBe(VALID_UUID);
    const ctx = JSON.parse(row.context);
    expect(ctx.name).toBe("Soll geloescht");
  });
});
