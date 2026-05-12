import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile, Role } from "@/lib/auth/types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/assert-role", () => ({
  assertRole: vi.fn(),
}));

vi.mock("@/lib/auth/invite", () => ({
  inviteUserAndCreateProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { inviteMember, changeRole, deleteProfile } = await import("./actions");
const { assertRole } = await import("@/lib/auth/assert-role");
const { inviteUserAndCreateProfile } = await import("@/lib/auth/invite");
const { createAdminClient } = await import("@/lib/supabase/admin");

// UUID-Shape-Strings; Zod-Schema validiert lax-Format (8-4-4-4-12 hex)
// inkl. Real-DB-Seed-Pattern '00000000-0000-0000-0000-000000000xxx'.
const TEAM_A_UUID = "11111111-1111-1111-1111-111111111111";
const TEAM_B_UUID = "22222222-2222-2222-2222-222222222222";
const VALID_UUID_A = "00000000-0000-0000-0000-000000000081";  // Seed-Pattern, regression-test fuer lax UUID
const VALID_UUID_B = "44444444-4444-4444-4444-444444444444";

const ADMIN_PROFILE: Profile = {
  user_id: "55555555-5555-5555-5555-555555555555",
  role: "admin",
  team_id: TEAM_A_UUID,
  display_name: "Admin",
};

const TEAMLEAD_PROFILE: Profile = {
  user_id: "66666666-6666-6666-6666-666666666666",
  role: "teamlead",
  team_id: TEAM_A_UUID,
  display_name: "Teamlead A",
};

function makeAdminMock(opts: {
  countsByTable?: Partial<Record<string, number>>;
  profileRow?: { role: Role; display_name?: string | null; team_id?: string | null } | null;
  updateError?: string;
  deleteAuthError?: string;
}) {
  const insertCalls: Array<{ table: string; payload: unknown }> = [];
  const updateCalls: Array<{ table: string; payload: unknown; eqVal: unknown }> = [];

  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const profileInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const fromMock = vi.fn((table: string) => {
    if (table === "audit_log") {
      return {
        insert: (payload: unknown) => {
          insertCalls.push({ table, payload });
          return auditInsert(payload);
        },
      };
    }
    if (table === "profiles") {
      return {
        select: (cols: string) => {
          if (cols === "role") {
            return {
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: opts.profileRow ? { role: opts.profileRow.role } : null,
                    error: null,
                  }),
              }),
            };
          }
          if (cols.includes("display_name")) {
            return {
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: opts.profileRow ?? null,
                    error: null,
                  }),
              }),
            };
          }
          throw new Error(`unexpected select cols=${cols}`);
        },
        insert: (payload: unknown) => {
          insertCalls.push({ table, payload });
          return profileInsert(payload);
        },
        update: (payload: unknown) => ({
          eq: (_col: string, val: unknown) => {
            updateCalls.push({ table, payload, eqVal: val });
            return Promise.resolve({
              data: null,
              error: opts.updateError ? { message: opts.updateError } : null,
            });
          },
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    }
    // owner-table count path
    return {
      select: () => ({
        eq: () =>
          Promise.resolve({
            count: opts.countsByTable?.[table] ?? 0,
            error: null,
          }),
      }),
    };
  });

  const adminAuth = {
    admin: {
      deleteUser: vi.fn().mockResolvedValue({
        error: opts.deleteAuthError ? { message: opts.deleteAuthError } : null,
      }),
    },
  };

  return {
    client: {
      from: fromMock,
      auth: adminAuth,
    },
    insertCalls,
    updateCalls,
    fromMock,
    adminAuth,
  };
}

describe("inviteMember", () => {
  beforeEach(() => {
    vi.mocked(assertRole).mockReset();
    vi.mocked(inviteUserAndCreateProfile).mockReset();
    vi.mocked(createAdminClient).mockReset();
  });

  it("redirects when member tries to invite (assertRole throws)", async () => {
    vi.mocked(assertRole).mockRejectedValue(new Error("NEXT_REDIRECT:/mein-tag"));
    await expect(
      inviteMember({ email: "x@y.de", role: "member", team_id: TEAM_A_UUID }),
    ).rejects.toThrow("NEXT_REDIRECT:/mein-tag");
  });

  it("rejects invalid email", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await inviteMember({
      email: "not-an-email",
      role: "member",
      team_id: TEAM_A_UUID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/E-Mail/);
    }
  });

  it("rejects teamlead inviting into other team", async () => {
    vi.mocked(assertRole).mockResolvedValue({
      ...TEAMLEAD_PROFILE,
      team_id: TEAM_A_UUID,
    });
    const mock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await inviteMember({
      email: "new@strategaize.dev",
      role: "member",
      team_id: TEAM_B_UUID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/eigene Team/);
    }
  });

  it("happy path: admin invites + audit_log gets invite_sent", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    vi.mocked(inviteUserAndCreateProfile).mockResolvedValue({
      user_id: VALID_UUID_A,
      email: "new@strategaize.dev",
    });
    const mock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await inviteMember({
      email: "new@strategaize.dev",
      role: "member",
      team_id: TEAM_A_UUID,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user_id).toBe(VALID_UUID_A);
    }

    const auditCall = mock.insertCalls.find((c) => c.table === "audit_log");
    expect(auditCall).toBeDefined();
    expect(auditCall?.payload).toMatchObject({
      action: "invite_sent",
      entity_type: "profile",
      entity_id: VALID_UUID_A,
      actor_id: ADMIN_PROFILE.user_id,
    });
  });

  it("maps invite-wrapper error to ActionResult", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    vi.mocked(inviteUserAndCreateProfile).mockRejectedValue(
      new Error("User already registered"),
    );
    const mock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await inviteMember({
      email: "dup@strategaize.dev",
      role: "member",
      team_id: TEAM_A_UUID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already registered/);
    }
  });
});

describe("changeRole", () => {
  beforeEach(() => {
    vi.mocked(assertRole).mockReset();
    vi.mocked(createAdminClient).mockReset();
  });

  it("redirects teamlead trying to change role (admin-only)", async () => {
    vi.mocked(assertRole).mockRejectedValue(new Error("NEXT_REDIRECT:/mein-tag"));
    await expect(
      changeRole({ user_id: VALID_UUID_A, new_role: "teamlead" }),
    ).rejects.toThrow("NEXT_REDIRECT:/mein-tag");
  });

  it("rejects when target profile not found", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({ profileRow: null });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await changeRole({
      user_id: VALID_UUID_A,
      new_role: "teamlead",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/nicht gefunden/);
    }
  });

  it("no-op when role is already the same", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({ profileRow: { role: "teamlead" } });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await changeRole({
      user_id: VALID_UUID_A,
      new_role: "teamlead",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCalls.length).toBe(0);
    expect(
      mock.insertCalls.find((c) => c.table === "audit_log"),
    ).toBeUndefined();
  });

  it("happy path: admin changes member to teamlead + audit_log role_changed", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({ profileRow: { role: "member" } });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await changeRole({
      user_id: VALID_UUID_A,
      new_role: "teamlead",
    });
    expect(result.ok).toBe(true);
    expect(mock.updateCalls.length).toBe(1);
    expect(mock.updateCalls[0]?.payload).toMatchObject({ role: "teamlead" });

    const auditCall = mock.insertCalls.find((c) => c.table === "audit_log");
    expect(auditCall?.payload).toMatchObject({
      action: "role_changed",
      entity_type: "profile",
      entity_id: VALID_UUID_A,
      actor_id: ADMIN_PROFILE.user_id,
      changes: { old_role: "member", new_role: "teamlead" },
    });
  });

  it("propagates UPDATE error", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({
      profileRow: { role: "member" },
      updateError: "PostgREST blew up",
    });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await changeRole({
      user_id: VALID_UUID_A,
      new_role: "teamlead",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/PostgREST/);
    }
  });
});

describe("deleteProfile", () => {
  beforeEach(() => {
    vi.mocked(assertRole).mockReset();
    vi.mocked(createAdminClient).mockReset();
  });

  it("redirects teamlead trying to delete (admin-only)", async () => {
    vi.mocked(assertRole).mockRejectedValue(new Error("NEXT_REDIRECT:/mein-tag"));
    await expect(deleteProfile({ user_id: VALID_UUID_A })).rejects.toThrow(
      "NEXT_REDIRECT:/mein-tag",
    );
  });

  it("blocks self-delete", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await deleteProfile({ user_id: ADMIN_PROFILE.user_id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Eigenes Profil/);
    }
  });

  it("hard-lock: rejects when owner records exist", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({
      countsByTable: { deals: 12, activities: 47 },
      profileRow: { role: "member", display_name: "Test Member", team_id: TEAM_A_UUID },
    });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await deleteProfile({ user_id: VALID_UUID_B });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/aktive Records/);
      expect(result.error).toMatch(/deals: 12/);
      expect(result.error).toMatch(/activities: 47/);
      expect(result.error).toMatch(/Bulk-Reassign/);
    }
    expect(mock.adminAuth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("happy path: deletes when no owner records + display_name backup in audit", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({
      countsByTable: {},
      profileRow: {
        role: "member",
        display_name: "Gefeuerter Mitarbeiter",
        team_id: TEAM_A_UUID,
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await deleteProfile({ user_id: VALID_UUID_B });
    expect(result.ok).toBe(true);
    expect(mock.adminAuth.admin.deleteUser).toHaveBeenCalledWith(VALID_UUID_B);

    const auditCall = mock.insertCalls.find((c) => c.table === "audit_log");
    expect(auditCall?.payload).toMatchObject({
      action: "profile_deleted",
      entity_type: "profile",
      entity_id: VALID_UUID_B,
      actor_id: ADMIN_PROFILE.user_id,
      changes: {
        display_name_backup: "Gefeuerter Mitarbeiter",
        role_backup: "member",
        team_id_backup: TEAM_A_UUID,
      },
    });
  });

  it("propagates GoTrue delete error", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const mock = makeAdminMock({
      countsByTable: {},
      profileRow: { role: "member", display_name: null, team_id: null },
      deleteAuthError: "GoTrue 500",
    });
    vi.mocked(createAdminClient).mockReturnValue(mock.client as never);

    const result = await deleteProfile({ user_id: VALID_UUID_B });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/GoTrue/);
    }
  });
});
