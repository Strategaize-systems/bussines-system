import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// V8.15 SLC-913 MT-7 (ISSUE-116, DEC-302): per-Tenant-Key-Aufloesung gegen
// export_api_keys (MIG-053) + Team-Expansion ueber profiles.team_id.

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { resolveExportIdentity, hashExportKey } = await import("./tenant-auth");
const { createAdminClient } = await import("@/lib/supabase/admin");

/**
 * Routed Admin-Mock:
 *  - export_api_keys: .select().eq().is().maybeSingle() -> keyRow
 *  - profiles select team_id: .select().eq("id").maybeSingle() -> { team_id }
 *  - profiles select id: .select().eq("team_id") (awaited) -> { data: members }
 */
function makeAdminMock(opts: {
  keyRow: { owner_user_id: string } | null;
  teamId?: string | null;
  members?: string[];
}) {
  const keyRow = opts.keyRow;
  const teamId = opts.teamId ?? null;
  const members = (opts.members ?? []).map((id) => ({ id }));

  const from = vi.fn((table: string) => {
    if (table === "export_api_keys") {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: async () => ({ data: keyRow, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: () => ({
          eq: (col: string) => {
            if (col === "id") {
              return { maybeSingle: async () => ({ data: { team_id: teamId } }) };
            }
            // col === "team_id": awaited directly
            return Promise.resolve({ data: members });
          },
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  return { from };
}

function reqWith(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request("http://localhost/api/export/deals", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveExportIdentity (ISSUE-116 per-Tenant-Key)", () => {
  it("loest gueltigen Key zu owner + team-expandierter Member-Liste auf", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock({
        keyRow: { owner_user_id: "owner-1" },
        teamId: "team-1",
        members: ["owner-1", "mate-2", "mate-3"],
      }),
    );
    const result = await resolveExportIdentity(reqWith("raw-key-abc"));
    expect(result).not.toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) return;
    expect(result.ownerUserId).toBe("owner-1");
    expect(result.teamMemberIds.sort()).toEqual(["mate-2", "mate-3", "owner-1"]);
  });

  it("Solo-Owner (team_id NULL) -> nur der Owner selbst", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock({ keyRow: { owner_user_id: "solo-9" }, teamId: null }),
    );
    const result = await resolveExportIdentity(reqWith("raw-key-solo"));
    if (result instanceof NextResponse) throw new Error("expected identity");
    expect(result.teamMemberIds).toEqual(["solo-9"]);
  });

  it("unbekannter/revoked Key -> 401", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminMock({ keyRow: null }),
    );
    const result = await resolveExportIdentity(reqWith("bad-key"));
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) expect(result.status).toBe(401);
  });

  it("fehlender Authorization-Header -> 401 (kein DB-Touch)", async () => {
    const admin = makeAdminMock({ keyRow: { owner_user_id: "x" } });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);
    const result = await resolveExportIdentity(reqWith());
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) expect(result.status).toBe(401);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("hashExportKey ist stabil + SHA-256-Laenge (64 hex)", () => {
    const h = hashExportKey("raw-key-abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashExportKey("raw-key-abc")).toBe(h);
    expect(hashExportKey("other")).not.toBe(h);
  });
});
