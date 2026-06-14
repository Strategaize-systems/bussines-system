import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// V8.15 SLC-913 MT-7 (ISSUE-116): winloss ownership-gate ueber deal.owner_user_id.

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/export/helpers", async (orig) => {
  const actual = await orig<typeof import("@/lib/export/helpers")>();
  return { ...actual, guardExportTenant: vi.fn() };
});

const { GET } = await import("./route");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { guardExportTenant } = await import("@/lib/export/helpers");

function makeAdmin(dealOwner: string | null, run: unknown) {
  const deals = {
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: dealOwner ? { owner_user_id: dealOwner } : null }) }),
    }),
  };
  const winloss = {
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({ maybeSingle: async () => ({ data: run, error: null }) }),
        }),
      }),
    }),
  };
  return {
    from: vi.fn((t: string) => {
      if (t === "deals") return deals;
      if (t === "auto_winloss_runs") return winloss;
      throw new Error(`unexpected table ${t}`);
    }),
  };
}

function req() {
  return new Request("http://localhost/api/winloss/deal-1");
}
const ctx = { params: Promise.resolve({ deal_id: "deal-1" }) };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/winloss/[deal_id] ownership-gate", () => {
  beforeEach(() => {
    (guardExportTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerUserId: "o1",
      teamMemberIds: ["o1", "m2"],
    });
  });

  it("404 wenn der Deal einem fremden Owner gehoert (keine Enumeration)", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdmin("stranger-9", { deal_id: "deal-1", target_status: "won" }),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
  });

  it("404 wenn der Deal nicht existiert", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdmin(null, null),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(404);
  });

  it("200 + Run wenn der Deal dem Tenant gehoert", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdmin("m2", {
        deal_id: "deal-1",
        target_status: "won",
        triggered_at: "2026-06-13T00:00:00Z",
        bedrock_output: "x",
        bedrock_model: "m",
        bedrock_completed_at: null,
        status: "succeeded",
      }),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deal_id).toBe("deal-1");
    expect(body.target_status).toBe("won");
  });

  it("reicht die Guard-Response (401) durch", async () => {
    (guardExportTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(401);
  });
});
