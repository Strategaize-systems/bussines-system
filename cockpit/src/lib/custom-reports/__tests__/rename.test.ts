// V7.6 SLC-762 MT-4 — renameCustomReport Server-Action Unit-Tests.
//
// Verifiziert:
//   1. Validation-Fail (name zu kurz) -> { ok:false, code:"validation" }.
//   2. Pre-SELECT no-row -> { ok:false, code:"not_found" }.
//   3. UPDATE 23505 -> { ok:false, code:"duplicate_name" }.
//   4. UPDATE other error -> { ok:false, code:"infra" }.
//   5. Success: UPDATE + audit_log mit old_name/new_name.

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

const { renameCustomReport } = await import("../actions/rename");
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
  selectError?: { message: string } | null;
  updateError?: { code?: string; message: string } | null;
  auditInsert?: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const selectRes = {
    data:
      opts.selectRow === undefined ? { id: VALID_UUID, name: "Alt" } : opts.selectRow,
    error: opts.selectError ?? null,
  };
  const updateRes = { error: opts.updateError ?? null };
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
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue(updateRes),
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

describe("renameCustomReport", () => {
  it("rejects with validation when name is too short", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await renameCustomReport({ id: VALID_UUID, name: "a" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("validation");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns not_found when pre-select yields no row", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({ selectRow: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await renameCustomReport({ id: VALID_UUID, name: "Neu" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("not_found");
  });

  it("maps 23505 to duplicate_name", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      updateError: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await renameCustomReport({ id: VALID_UUID, name: "Neu" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("duplicate_name");
  });

  it("returns infra for other update errors", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      updateError: { code: "42501", message: "permission denied" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await renameCustomReport({ id: VALID_UUID, name: "Neu" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
  });

  it("returns ok and inserts audit_log with old_name/new_name on success", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await renameCustomReport({ id: VALID_UUID, name: "Neu" });

    expect(res.ok).toBe(true);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    const row = auditInsert.mock.calls[0][0];
    expect(row.action).toBe("custom_report.renamed");
    expect(row.entity_id).toBe(VALID_UUID);
    expect(row.actor_id).toBe("user-1");
    const ctx = JSON.parse(row.context);
    expect(ctx.old_name).toBe("Alt");
    expect(ctx.new_name).toBe("Neu");
  });
});
