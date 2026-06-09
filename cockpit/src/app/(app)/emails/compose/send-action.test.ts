import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-3 — Smoke-Test: verifiziert User-Client-Switch fuer
// email_attachments-Bulk-INSERT (ISSUE-092 Closure). Volle Happy-Path-Coverage
// existiert nicht (send-action.ts haengt an ~10 Service-Layer-Modulen) — der
// Test prueft surgical, dass createAdminClient nicht mehr aufgerufen wird wenn
// Attachments vorhanden sind.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn().mockResolvedValue({
    user_id: "55555555-5555-5555-5555-555555555555",
    role: "member",
    team_id: "11111111-1111-1111-1111-111111111111",
    display_name: "Member",
  }),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/app/(app)/settings/branding/actions", () => ({
  getBrandingForSend: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/email/render", () => ({
  renderBrandedHtml: vi.fn().mockReturnValue("<html></html>"),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmailWithTracking: vi.fn().mockResolvedValue({
    success: true,
    emailId: "email-1",
    trackingId: "tr-1",
  }),
}));

vi.mock("@/lib/team/lookup-slug", () => ({
  getTenantSlugByOwnerUserId: vi.fn().mockResolvedValue("tenant"),
}));

vi.mock("@/lib/email/variables", () => ({
  resolveVarsFromDeal: vi.fn().mockReturnValue({}),
}));

vi.mock("@/app/(app)/aufgaben/actions", () => ({
  createFollowUpTask: vi.fn(),
}));

vi.mock("@/lib/email/attachments-whitelist", () => ({
  validateAttachment: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/app/(app)/proposals/actions", () => ({
  transitionProposalStatus: vi.fn().mockResolvedValue({ ok: true }),
}));

const { sendComposedEmail } = await import("./send-action");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

function makeUserClientMock() {
  const insertCalls: Array<{ table: string; payload: unknown }> = [];
  const fromMock = vi.fn((table: string) => ({
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: null });
    },
  }));
  return { client: { from: fromMock }, insertCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendComposedEmail — email_attachments Junction-Insert", () => {
  it("uses User-Client (not admin) for email_attachments INSERT", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await sendComposedEmail({
      to: "x@y.de",
      subject: "Test",
      body: "Hello",
      attachments: [
        {
          storagePath: "u/1.pdf",
          filename: "1.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          source_type: "upload",
        },
      ],
    });

    expect(result.success).toBe(true);
    // The User-Client must have been used for email_attachments INSERT
    const emailAttInserts = mock.insertCalls.filter(
      (c) => c.table === "email_attachments",
    );
    expect(emailAttInserts).toHaveLength(1);
    expect(
      (emailAttInserts[0].payload as Array<{ email_id: string }>)[0]
        .email_id,
    ).toBe("email-1");

    // ISSUE-092 Defense-in-Depth: createAdminClient must NOT be called
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("no Junction-Insert when no attachments", async () => {
    const mock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await sendComposedEmail({
      to: "x@y.de",
      subject: "Test",
      body: "Hello",
    });

    const emailAttInserts = mock.insertCalls.filter(
      (c) => c.table === "email_attachments",
    );
    expect(emailAttInserts).toHaveLength(0);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
