import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.14 SLC-912 MT-5 (ISSUE-104) — getCurrentUserRole fail-CLOSED.

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { getCurrentUserRole } = await import("@/lib/audit");
const { createClient } = await import("@/lib/supabase/server");

function mockClient(opts: {
  user?: { id: string } | null;
  profile?: { role: string } | null;
  throws?: boolean;
}) {
  if (opts.throws) {
    (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );
    return;
  }
  const single = vi
    .fn()
    .mockResolvedValue({ data: opts.profile ?? null, error: null });
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null } }),
    },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ single }) }) })),
  });
}

describe("getCurrentUserRole (fail-closed)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when there is no authenticated user (NOT 'admin')", async () => {
    mockClient({ user: null });
    expect(await getCurrentUserRole()).toBeNull();
  });

  it("returns null when the profile is missing (NOT 'admin')", async () => {
    mockClient({ user: { id: "u-1" }, profile: null });
    expect(await getCurrentUserRole()).toBeNull();
  });

  it("returns null when any error is thrown (NOT 'admin')", async () => {
    mockClient({ throws: true });
    expect(await getCurrentUserRole()).toBeNull();
  });

  it("returns the real role for a valid profile", async () => {
    mockClient({ user: { id: "u-1" }, profile: { role: "member" } });
    expect(await getCurrentUserRole()).toBe("member");
  });
});
