import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { inviteUserAndCreateProfile } = await import("./invite");
const { createAdminClient } = await import("@/lib/supabase/admin");
const nodemailer = (await import("nodemailer")).default;

const TEAM_ID = "00000000-0000-0000-0000-000000000077";
const USER_ID = "00000000-0000-0000-0000-000000000091";
const HASHED_TOKEN = "abcdef0123456789";

function makeAdminMock(opts: {
  generateLinkError?: { message: string };
  generateLinkData?: {
    user?: { id: string };
    properties?: { hashed_token?: string };
  };
  profileInsertError?: { message: string };
}) {
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const profileDelete = vi.fn().mockResolvedValue({ error: null });
  const profileInsert = vi
    .fn()
    .mockResolvedValue({ error: opts.profileInsertError ?? null });
  const generateLink = vi.fn().mockResolvedValue({
    data:
      opts.generateLinkData ??
      ({
        user: { id: USER_ID },
        properties: { hashed_token: HASHED_TOKEN },
      } as const),
    error: opts.generateLinkError ?? null,
  });

  const mock = {
    auth: {
      admin: { generateLink, deleteUser },
    },
    from: vi.fn(() => ({
      insert: profileInsert,
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  };

  // delete-path muss `.eq().then(...)` koennen — wir reichen profileDelete als
  // optionalen Watchpoint durch, falls Test darauf zugreifen will.
  return { mock, generateLink, profileInsert, deleteUser, profileDelete };
}

describe("inviteUserAndCreateProfile", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    sendMailMock.mockResolvedValue(undefined);
    vi.mocked(createAdminClient).mockReset();
    process.env.NEXT_PUBLIC_APP_URL = "https://business.strategaizetransition.com";
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "noreply@test.local";
    process.env.SMTP_PASSWORD = "test-pass";
    process.env.SMTP_FROM_EMAIL = "noreply@test.local";
  });

  it("ruft generateLink, INSERTet Profile, schickt Mail mit korrektem Public-Host", async () => {
    const { mock, generateLink, profileInsert } = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    const result = await inviteUserAndCreateProfile({
      email: "new@strategaize.dev",
      role: "member",
      team_id: TEAM_ID,
      display_name: "Neue Mitarbeiterin",
    });

    expect(result).toEqual({ user_id: USER_ID, email: "new@strategaize.dev" });
    expect(generateLink).toHaveBeenCalledWith({
      type: "invite",
      email: "new@strategaize.dev",
      options: {
        redirectTo: "https://business.strategaizetransition.com/auth/set-password",
      },
    });
    expect(profileInsert).toHaveBeenCalledWith({
      id: USER_ID,
      role: "member",
      team_id: TEAM_ID,
      display_name: "Neue Mitarbeiterin",
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const sentArg = sendMailMock.mock.calls[0][0];
    // Confirm-Link MUSS auf Public-Domain zeigen, NICHT auf supabase-kong.
    // HTML enthaelt das (HTML-escapte) Confirm-URL.
    expect(sentArg.html).toContain(
      "https://business.strategaizetransition.com/auth/callback?token_hash=" +
        HASHED_TOKEN +
        "&amp;type=invite",
    );
    expect(sentArg.html).not.toContain("supabase-kong");
    // Text-Variante ist unescaped.
    expect(sentArg.text).toContain(
      "https://business.strategaizetransition.com/auth/callback?token_hash=" +
        HASHED_TOKEN +
        "&type=invite",
    );
    expect(sentArg.text).not.toContain("supabase-kong");
    expect(sentArg.subject).toBe("Einladung zum Business Cockpit");
    expect(sentArg.to).toBe("new@strategaize.dev");
  });

  it("escapes display_name in HTML (XSS-Defense)", async () => {
    const { mock } = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    await inviteUserAndCreateProfile({
      email: "xss@test.local",
      role: "member",
      team_id: TEAM_ID,
      display_name: "<script>alert(1)</script>",
    });

    const sentArg = sendMailMock.mock.calls[0][0];
    expect(sentArg.html).not.toContain("<script>alert(1)</script>");
    expect(sentArg.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("wirft Fehler wenn generateLink fehlschlaegt", async () => {
    const { mock } = makeAdminMock({
      generateLinkError: { message: "User already registered" },
      generateLinkData: { user: undefined, properties: undefined },
    });
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    await expect(
      inviteUserAndCreateProfile({
        email: "dup@test.local",
        role: "member",
        team_id: TEAM_ID,
      }),
    ).rejects.toThrow(/User already registered/);

    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rollback: deleteUser wenn Profile-Insert fehlschlaegt", async () => {
    const { mock, deleteUser } = makeAdminMock({
      profileInsertError: { message: "duplicate key value" },
    });
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    await expect(
      inviteUserAndCreateProfile({
        email: "fail-profile@test.local",
        role: "member",
        team_id: TEAM_ID,
      }),
    ).rejects.toThrow(/Profile-Insert fehlgeschlagen/);

    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("rollback: deleteUser wenn Mail-Send fehlschlaegt", async () => {
    const { mock, deleteUser } = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );
    sendMailMock.mockRejectedValueOnce(new Error("SMTP-Connection-Timeout"));

    await expect(
      inviteUserAndCreateProfile({
        email: "fail-mail@test.local",
        role: "member",
        team_id: TEAM_ID,
      }),
    ).rejects.toThrow(/Invite-Mail-Versand fehlgeschlagen/);

    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it("wirft Fehler wenn NEXT_PUBLIC_APP_URL fehlt", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const { mock } = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    await expect(
      inviteUserAndCreateProfile({
        email: "no-env@test.local",
        role: "member",
        team_id: TEAM_ID,
      }),
    ).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("wirft Fehler wenn SMTP-Config unvollstaendig", async () => {
    delete process.env.SMTP_HOST;
    const { mock } = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(
      mock as unknown as ReturnType<typeof createAdminClient>,
    );

    await expect(
      inviteUserAndCreateProfile({
        email: "no-smtp@test.local",
        role: "member",
        team_id: TEAM_ID,
      }),
    ).rejects.toThrow(/SMTP-Konfiguration unvollstaendig/);
  });
});

describe("nodemailer.createTransport import", () => {
  it("ist als mock erkannt", () => {
    expect(vi.isMockFunction(nodemailer.createTransport)).toBe(true);
  });
});
