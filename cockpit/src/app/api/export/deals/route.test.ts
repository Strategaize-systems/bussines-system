import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// V8.15 SLC-913 MT-7 (ISSUE-116): Export-Deals scopt auf identity.teamMemberIds.

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/export/helpers", async (orig) => {
  const actual = await orig<typeof import("@/lib/export/helpers")>();
  return { ...actual, guardExportTenant: vi.fn() };
});

const { GET } = await import("./route");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { guardExportTenant } = await import("@/lib/export/helpers");

function makeBuilder(result: { data: unknown[]; count: number; error: unknown }) {
  const calls: { in: Array<[string, string[]]> } = { in: [] };
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  Object.assign(builder, {
    select: self,
    eq: self,
    gte: self,
    lte: self,
    order: self,
    range: self,
    in: (col: string, vals: string[]) => {
      calls.in.push([col, vals]);
      return builder;
    },
    then: (res: (r: unknown) => unknown) => res(result),
  });
  return { builder, calls };
}

function req(): NextRequest {
  return new NextRequest("http://localhost/api/export/deals");
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/export/deals tenant-scope", () => {
  it("gibt die Guard-Response zurueck wenn Auth/Rate-Limit blockt", async () => {
    (guardExportTenant as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    );
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("filtert count + data auf owner_user_id IN teamMemberIds", async () => {
    (guardExportTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerUserId: "o1",
      teamMemberIds: ["o1", "m2"],
    });
    const { builder, calls } = makeBuilder({ data: [], count: 0, error: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => builder),
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    // Beide Queries (count + data) scopen auf owner_user_id.
    expect(calls.in.length).toBeGreaterThanOrEqual(2);
    for (const [col, vals] of calls.in) {
      expect(col).toBe("owner_user_id");
      expect(vals).toEqual(["o1", "m2"]);
    }
  });
});
