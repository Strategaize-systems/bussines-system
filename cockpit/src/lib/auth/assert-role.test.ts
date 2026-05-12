import { describe, it, expect, vi, beforeEach } from "vitest";
import { roleAllowed } from "./assert-role";
import type { Profile, Role } from "./types";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("./get-profile", () => ({
  getProfile: vi.fn(),
}));

const { assertRole, requireRole } = await import("./assert-role");
const { getProfile } = await import("./get-profile");
const { redirect, notFound } = await import("next/navigation");

function profile(role: Role): Profile {
  return {
    user_id: "user-1",
    role,
    team_id: null,
    display_name: "Test User",
  };
}

describe("roleAllowed", () => {
  it("returns true when current is in allowed", () => {
    expect(roleAllowed("admin", ["admin", "teamlead"])).toBe(true);
    expect(roleAllowed("member", ["member"])).toBe(true);
  });

  it("returns false when current is not in allowed", () => {
    expect(roleAllowed("member", ["admin", "teamlead"])).toBe(false);
    expect(roleAllowed("teamlead", ["admin"])).toBe(false);
  });

  it("returns false for empty allowed list", () => {
    expect(roleAllowed("admin", [])).toBe(false);
  });
});

describe("assertRole", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(notFound).mockClear();
    vi.mocked(getProfile).mockReset();
  });

  it("returns profile when role matches", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const result = await assertRole(["admin", "teamlead"]);
    expect(result.role).toBe("admin");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /mein-tag on mismatch (member trying admin route)", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("member"));
    await expect(assertRole(["admin", "teamlead"])).rejects.toThrow(
      "NEXT_REDIRECT:/mein-tag",
    );
    expect(redirect).toHaveBeenCalledWith("/mein-tag");
  });

  it("redirects when teamlead tries admin-only route", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("teamlead"));
    await expect(assertRole(["admin"])).rejects.toThrow(
      "NEXT_REDIRECT:/mein-tag",
    );
  });

  it("allows admin on admin-only route", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const result = await assertRole(["admin"]);
    expect(result.role).toBe("admin");
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    vi.mocked(notFound).mockClear();
    vi.mocked(getProfile).mockReset();
  });

  it("returns profile when role matches", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const result = await requireRole(["admin"]);
    expect(result.role).toBe("admin");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("throws notFound on mismatch", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("member"));
    await expect(requireRole(["admin"])).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
