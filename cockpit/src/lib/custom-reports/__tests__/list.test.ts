// V7.6 SLC-762 MT-2 — listCustomReports Server-Action Unit-Tests.
//
// Verifiziert:
//   1. Validation-Fail (context_type unbekannt) -> { ok:false, code:"infra" }.
//   2. Supabase-Fehler -> { ok:false, code:"infra" }.
//   3. Success-Path: SELECT mit Order-Chain, returns items[].

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { listCustomReports } = await import("../actions/list");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");

function profile() {
  return {
    user_id: "user-1",
    role: "member" as const,
    team_id: null,
    display_name: "Test User",
  };
}

interface SelectResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

function makeSupabaseMock(selectResult: SelectResult) {
  // The action builds: from("custom_reports").select(...).eq(...).order(...).order(...)
  // We make every chain step return the next; the second order() resolves the promise.
  const secondOrder = vi.fn().mockResolvedValue(selectResult);
  const firstOrder = vi.fn(() => ({ order: secondOrder }));
  const eq = vi.fn(() => ({ order: firstOrder }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, secondOrder, firstOrder, eq, select };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(createClient).mockReset();
});

describe("listCustomReports", () => {
  it("rejects with infra when context_type is unknown", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await listCustomReports({ context_type: "deal-detail" as never });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns infra when supabase select errors", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      data: null,
      error: { message: "internal_error" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await listCustomReports({ context_type: "mein-tag" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
  });

  it("returns items on success in correct order chain", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const rows = [
      {
        id: "r-1",
        owner_user_id: "user-1",
        context_type: "mein-tag",
        name: "Report A",
        prompt_template: "...",
        description: null,
        last_used_at: "2026-05-19T10:00:00Z",
        usage_count: 3,
        created_at: "2026-05-18T10:00:00Z",
        updated_at: "2026-05-19T10:00:00Z",
      },
      {
        id: "r-2",
        owner_user_id: "user-1",
        context_type: "mein-tag",
        name: "Report B",
        prompt_template: "...",
        description: "kurz",
        last_used_at: null,
        usage_count: 0,
        created_at: "2026-05-17T10:00:00Z",
        updated_at: "2026-05-17T10:00:00Z",
      },
    ];
    const mock = makeSupabaseMock({ data: rows, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await listCustomReports({ context_type: "mein-tag" });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.items).toHaveLength(2);
      expect(res.items[0].id).toBe("r-1");
      expect(res.items[1].id).toBe("r-2");
    }

    expect(mock.from).toHaveBeenCalledWith("custom_reports");
    expect(mock.eq).toHaveBeenCalledWith("context_type", "mein-tag");
    // last_used_at DESC NULLS LAST
    expect(mock.firstOrder).toHaveBeenCalledWith("last_used_at", {
      ascending: false,
      nullsFirst: false,
    });
    // created_at DESC
    expect(mock.secondOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
