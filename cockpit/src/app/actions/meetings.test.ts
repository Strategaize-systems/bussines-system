// V8.16 SLC-914 MT-1 (ISSUE-131): startMeeting Ownership-Gate via User-Client.
// Verifiziert, dass ein fremder Deal / fremde Kontakte fail-closed abgewiesen
// werden BEVOR ein Meeting angelegt oder eine Mail verschickt wird, und dass der
// eigene Flow unveraendert durchlaeuft.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

vi.mock("@/lib/meetings/jitsi-jwt", () => ({
  buildModeratorJwt: vi.fn(() => "host-jwt"),
  buildParticipantJwt: vi.fn(() => "participant-jwt"),
  buildMeetingUrl: vi.fn((room: string) => `https://meet.example/${room}`),
  generateRoomName: vi.fn(() => "room-1"),
}));

vi.mock("@/lib/meetings/consent-check", () => ({
  checkConsentStatus: vi.fn().mockResolvedValue({ allGranted: true, missing: [], granted: [] }),
}));

vi.mock("@/lib/meetings/send-invite", () => ({
  sendMeetingInvites: vi.fn().mockResolvedValue({ ok: true, sent: 1 }),
}));

const { startMeeting } = await import("./meetings");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { checkConsentStatus } = await import("@/lib/meetings/consent-check");
const { sendMeetingInvites } = await import("@/lib/meetings/send-invite");

const USER_ID = "55555555-5555-5555-5555-555555555555";
const DEAL_ID = "deal-1";

type Cfg = {
  user?: { id: string; email?: string } | null;
  deal?: { id: string; title: string } | null;
  contacts?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    consent_status: string | null;
    opt_out_communication: boolean | null;
  }>;
  profile?: { display_name: string | null; email: string | null } | null;
};

function makeUserClient(cfg: Cfg) {
  const calls = { meetingInsert: 0, meetingUpdate: 0, activityInsert: 0, contactsSelect: 0 };
  const client = {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: cfg.user === null ? null : cfg.user ?? { id: USER_ID, email: "host@example.de" } },
        }),
    },
    from: (table: string) => {
      switch (table) {
        case "deals":
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: cfg.deal ?? null, error: null }) }) }),
          };
        case "contacts":
          return {
            select: () => ({
              in: () => {
                calls.contactsSelect++;
                return Promise.resolve({ data: cfg.contacts ?? [], error: null });
              },
            }),
          };
        case "profiles":
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: cfg.profile ?? { display_name: "Host", email: "host@example.de" }, error: null }),
              }),
            }),
          };
        case "meetings":
          return {
            insert: () => {
              calls.meetingInsert++;
              return { select: () => ({ single: () => Promise.resolve({ data: { id: "meeting-1" }, error: null }) }) };
            },
            update: () => ({
              eq: () => {
                calls.meetingUpdate++;
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        case "activities":
          return {
            insert: () => {
              calls.activityInsert++;
              return Promise.resolve({ data: null, error: null });
            },
          };
        default:
          throw new Error(`unexpected user-client table: ${table}`);
      }
    },
  };
  return { client, calls };
}

function makeAdminClient() {
  const calls = { auditInsert: 0 };
  const client = {
    from: (table: string) => {
      if (table === "audit_log") {
        return {
          insert: () => {
            calls.auditInsert++;
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      throw new Error(`admin client must only touch audit_log, got: ${table}`);
    },
  };
  return { client, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startMeeting Ownership-Gate (ISSUE-131)", () => {
  it("rejects an unauthenticated caller", async () => {
    const { client } = makeUserClient({ user: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClient().client as never);

    const result = await startMeeting(DEAL_ID, []);
    expect(result.error).toBe("Nicht authentifiziert");
  });

  it("rejects a deal the caller cannot see and does NOT create a meeting", async () => {
    const { client, calls } = makeUserClient({ deal: null }); // RLS => not visible
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClient().client as never);

    const result = await startMeeting(DEAL_ID, ["c1"]);

    expect(result.error).toBe("Deal nicht gefunden");
    expect(calls.meetingInsert).toBe(0);
    expect(sendMeetingInvites).not.toHaveBeenCalled();
  });

  it("rejects when a requested contact is not RLS-visible and does NOT create a meeting or send mail", async () => {
    const { client, calls } = makeUserClient({
      deal: { id: DEAL_ID, title: "Deal" },
      contacts: [{ id: "c1", first_name: "A", last_name: "B", email: "a@x.de", consent_status: "granted", opt_out_communication: false }],
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClient().client as never);

    const result = await startMeeting(DEAL_ID, ["c1", "c2-foreign"]);

    expect(result.error).toMatch(/nicht gefunden oder sind nicht zugreifbar/);
    expect(calls.meetingInsert).toBe(0);
    expect(sendMeetingInvites).not.toHaveBeenCalled();
    expect(checkConsentStatus).not.toHaveBeenCalled();
  });

  it("proceeds for a visible deal + visible contacts and passes the user-client to the consent check", async () => {
    const { client, calls } = makeUserClient({
      deal: { id: DEAL_ID, title: "Deal" },
      contacts: [{ id: "c1", first_name: "A", last_name: "B", email: "a@x.de", consent_status: "granted", opt_out_communication: false }],
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClient().client as never);

    const result = await startMeeting(DEAL_ID, ["c1"], "Kickoff");

    expect(result.error).toBe("");
    expect(result.hostRedirectUrl).toBeDefined();
    expect(calls.meetingInsert).toBe(1);
    expect(calls.activityInsert).toBe(1);
    // checkConsentStatus wird der User-Client (2. Arg) durchgereicht (RLS-scoped).
    expect(checkConsentStatus).toHaveBeenCalledWith(["c1"], client);
    expect(sendMeetingInvites).toHaveBeenCalledTimes(1);
  });
});
