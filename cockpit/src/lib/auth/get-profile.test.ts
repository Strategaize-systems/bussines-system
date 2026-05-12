import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRole } from "./types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { getProfile } = await import("./get-profile");
const { createClient } = await import("@/lib/supabase/server");
const { redirect } = await import("next/navigation");

type SupabaseQuery = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function mockSupabase(opts: {
  user: { id: string } | null;
  profileRow: { role: string; team_id: string | null; display_name: string | null } | null;
  profileError?: { message: string };
}) {
  const single = vi.fn().mockResolvedValue({
    data: opts.profileRow,
    error: opts.profileError ?? null,
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select } as SupabaseQuery);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }),
    },
    from,
  };
}

describe("isRole", () => {
  it("accepts admin/teamlead/member", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("teamlead")).toBe(true);
    expect(isRole("member")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isRole("superadmin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(42)).toBe(false);
  });
});

describe("getProfile", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("returns profile for admin user", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: { id: "user-admin" },
        profileRow: { role: "admin", team_id: "team-1", display_name: "Admin User" },
      }) as never,
    );

    const result = await getProfile();
    expect(result).toEqual({
      user_id: "user-admin",
      role: "admin",
      team_id: "team-1",
      display_name: "Admin User",
    });
  });

  it("returns profile for teamlead user", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: { id: "user-tl" },
        profileRow: { role: "teamlead", team_id: "team-2", display_name: "TL" },
      }) as never,
    );

    const result = await getProfile();
    expect(result.role).toBe("teamlead");
    expect(result.team_id).toBe("team-2");
  });

  it("returns profile for member user with null team", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: { id: "user-m" },
        profileRow: { role: "member", team_id: null, display_name: null },
      }) as never,
    );

    const result = await getProfile();
    expect(result.role).toBe("member");
    expect(result.team_id).toBeNull();
    expect(result.display_name).toBeNull();
  });

  it("redirects to /login when no user session", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: null,
        profileRow: null,
      }) as never,
    );

    await expect(getProfile()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("throws when profile row missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: { id: "ghost-user" },
        profileRow: null,
        profileError: { message: "no row" },
      }) as never,
    );

    await expect(getProfile()).rejects.toThrow(/profile row missing/);
  });

  it("throws when role is invalid", async () => {
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase({
        user: { id: "weird-user" },
        profileRow: { role: "superadmin", team_id: null, display_name: null },
      }) as never,
    );

    await expect(getProfile()).rejects.toThrow(/invalid role/);
  });
});
