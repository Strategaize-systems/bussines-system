import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile } from "@/lib/auth/types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { getTeamSize } = await import("./team-size");
const { createClient } = await import("@/lib/supabase/server");

function mockSupabaseCount(opts: {
  count: number | null;
  error?: { message: string };
}) {
  const eq = vi.fn().mockResolvedValue({
    count: opts.count,
    error: opts.error ?? null,
  });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return { from, _spies: { from, select, eq } };
}

function makeProfile(team_id: string | null): Profile {
  return {
    user_id: "user-1",
    role: "admin",
    team_id,
    display_name: "Test User",
  };
}

describe("getTeamSize", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("returns 1 when profile.team_id is null (Solo)", async () => {
    const mock = mockSupabaseCount({ count: 99 });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const size = await getTeamSize(makeProfile(null));

    expect(size).toBe(1);
    expect(mock._spies.from).not.toHaveBeenCalled();
  });

  it("returns 1 when team has exactly one profile", async () => {
    const mock = mockSupabaseCount({ count: 1 });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const size = await getTeamSize(makeProfile("team-a"));

    expect(size).toBe(1);
    expect(mock._spies.from).toHaveBeenCalledWith("profiles");
    expect(mock._spies.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(mock._spies.eq).toHaveBeenCalledWith("team_id", "team-a");
  });

  it("returns 3 when team has three profiles", async () => {
    const mock = mockSupabaseCount({ count: 3 });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const size = await getTeamSize(makeProfile("team-a"));

    expect(size).toBe(3);
  });

  it("returns 0 when supabase returns null count", async () => {
    const mock = mockSupabaseCount({ count: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const size = await getTeamSize(makeProfile("team-empty"));

    expect(size).toBe(0);
  });

  it("throws when supabase count query errors", async () => {
    const mock = mockSupabaseCount({
      count: null,
      error: { message: "permission denied" },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(getTeamSize(makeProfile("team-x"))).rejects.toThrow(
      /count failed for team_id=team-x/,
    );
  });
});
