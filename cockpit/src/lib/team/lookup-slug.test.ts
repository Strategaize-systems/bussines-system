import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { getTenantSlugByOwnerUserId } = await import("./lookup-slug");
const { createAdminClient } = await import("@/lib/supabase/admin");

function makeAdminMock(opts: {
  profileTeamId?: string | null;
  profileMissing?: boolean;
  teamSlug?: string | null;
  teamMissing?: boolean;
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.profileMissing
      ? null
      : { team_id: opts.profileTeamId ?? null },
    error: null,
  });

  const teamMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.teamMissing ? null : { slug: opts.teamSlug ?? null },
    error: null,
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }),
          }),
        };
      }
      if (table === "teams") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: teamMaybeSingle }),
          }),
        };
      }
      throw new Error(`unexpected from(${table})`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTenantSlugByOwnerUserId", () => {
  it("returns slug on happy path", async () => {
    const admin = makeAdminMock({
      profileTeamId: "team-abc",
      teamSlug: "strategaize-transition-bv",
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const slug = await getTenantSlugByOwnerUserId("owner-user-id");

    expect(slug).toBe("strategaize-transition-bv");
  });

  it("returns null when ownerUserId is empty", async () => {
    const slug = await getTenantSlugByOwnerUserId("");
    expect(slug).toBeNull();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns null when profile row is missing", async () => {
    const admin = makeAdminMock({ profileMissing: true });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const slug = await getTenantSlugByOwnerUserId("orphan-user-id");
    expect(slug).toBeNull();
  });

  it("returns null when profile has no team_id", async () => {
    const admin = makeAdminMock({ profileTeamId: null });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const slug = await getTenantSlugByOwnerUserId("teamless-user-id");
    expect(slug).toBeNull();
  });

  it("returns null when team row is missing", async () => {
    const admin = makeAdminMock({
      profileTeamId: "team-abc",
      teamMissing: true,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const slug = await getTenantSlugByOwnerUserId("user-id");
    expect(slug).toBeNull();
  });

  it("returns null when team has no slug", async () => {
    const admin = makeAdminMock({
      profileTeamId: "team-abc",
      teamSlug: null,
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const slug = await getTenantSlugByOwnerUserId("user-id");
    expect(slug).toBeNull();
  });
});
