import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.14 SLC-912 MT-2 (ISSUE-099) — Login-Rate-Limit + generische Error-Message.

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { login } = await import("../actions");
const { createClient } = await import("@/lib/supabase/server");
const { headers } = await import("next/headers");
const { redirect } = await import("next/navigation");
const { _resetRateLimitsForTests } = await import("@/lib/security/rate-limit");

const GENERIC = "E-Mail oder Passwort ungültig.";

function makeFormData(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

function setIp(ip: string) {
  (headers as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Headers({ "x-forwarded-for": ip }),
  );
}

/** signInWithPassword always fails (wrong credentials). */
function mockAuthFailure() {
  const signInWithPassword = vi
    .fn()
    .mockResolvedValue({
      error: { message: "Invalid login credentials" },
      data: { user: null },
    });
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { signInWithPassword },
  });
  return signInWithPassword;
}

/** signInWithPassword succeeds; profile role = admin. */
function mockAuthSuccess() {
  const signInWithPassword = vi.fn().mockResolvedValue({
    error: null,
    data: { user: { id: "u-1" } },
  });
  const single = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ single }) }),
  }));
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { signInWithPassword },
    from,
  });
  return signInWithPassword;
}

describe("login rate-limit + generic error (V8.14 SLC-912 MT-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimitsForTests();
    setIp("1.2.3.4");
  });

  it("returns a generic message on auth failure (no verbatim error.message leak)", async () => {
    const signIn = mockAuthFailure();
    const result = await login(makeFormData("a@b.de", "wrong"));
    expect(result).toEqual({ error: GENERIC });
    // Must NOT leak the underlying GoTrue error text (User-Enumeration).
    expect(JSON.stringify(result)).not.toMatch(/Invalid login credentials/);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("locks out the 6th attempt WITHOUT touching Supabase", async () => {
    const signIn = mockAuthFailure();
    // 5 failed attempts — each reaches signInWithPassword.
    for (let i = 0; i < 5; i++) {
      const r = await login(makeFormData("a@b.de", "wrong"));
      expect(r).toEqual({ error: GENERIC });
    }
    expect(signIn).toHaveBeenCalledTimes(5);

    // 6th attempt — blocked before signInWithPassword (no GoTrue touch).
    const sixth = await login(makeFormData("a@b.de", "wrong"));
    expect(sixth).toEqual({ error: GENERIC });
    expect(signIn).toHaveBeenCalledTimes(5); // unchanged
  });

  it("keys lockout per email+ip — a different IP is not locked out", async () => {
    const signIn = mockAuthFailure();
    setIp("1.2.3.4");
    for (let i = 0; i < 5; i++) await login(makeFormData("a@b.de", "wrong"));
    expect(signIn).toHaveBeenCalledTimes(5);

    // Same email, different IP -> fresh bucket, reaches signInWithPassword again.
    setIp("9.9.9.9");
    await login(makeFormData("a@b.de", "wrong"));
    expect(signIn).toHaveBeenCalledTimes(6);
  });

  it("account-scoped lockout greift trotz IP-Rotation (ISSUE-120 MT-6)", async () => {
    const signIn = mockAuthFailure();
    // 20 Fehlversuche, jeder von einer ANDEREN IP -> per-IP-Bucket immer frisch,
    // aber der account-scoped Bucket (login-acct:<email>) akkumuliert.
    for (let i = 0; i < 20; i++) {
      setIp(`10.0.0.${i}`);
      const r = await login(makeFormData("victim@b.de", "wrong"));
      expect(r).toEqual({ error: GENERIC });
    }
    expect(signIn).toHaveBeenCalledTimes(20);

    // 21. Versuch von einer weiteren frischen IP -> account-Lockout blockt VOR GoTrue.
    setIp("10.0.0.99");
    const blocked = await login(makeFormData("victim@b.de", "wrong"));
    expect(blocked).toEqual({ error: GENERIC });
    expect(signIn).toHaveBeenCalledTimes(20); // unveraendert — kein GoTrue-Touch
  });

  it("account-scoped Lockout trifft NUR den betroffenen Account (kein Kollateral)", async () => {
    const signIn = mockAuthFailure();
    for (let i = 0; i < 20; i++) {
      setIp(`10.0.1.${i}`);
      await login(makeFormData("victim@b.de", "wrong"));
    }
    expect(signIn).toHaveBeenCalledTimes(20);
    // Anderer Account, frische IP -> nicht gesperrt.
    setIp("10.0.1.99");
    await login(makeFormData("other@b.de", "wrong"));
    expect(signIn).toHaveBeenCalledTimes(21);
  });

  it("erfolgreicher Login leert auch den account-scoped Counter", async () => {
    const failSignIn = mockAuthFailure();
    for (let i = 0; i < 19; i++) {
      setIp(`10.0.2.${i}`);
      await login(makeFormData("victim@b.de", "wrong"));
    }
    expect(failSignIn).toHaveBeenCalledTimes(19);

    const okSignIn = mockAuthSuccess();
    setIp("10.0.2.50");
    await expect(login(makeFormData("victim@b.de", "right"))).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(okSignIn).toHaveBeenCalledTimes(1);

    // account-Counter geleert -> 20 weitere Fehlversuche erreichen wieder GoTrue.
    const failAgain = mockAuthFailure();
    for (let i = 0; i < 20; i++) {
      setIp(`10.0.3.${i}`);
      await login(makeFormData("victim@b.de", "wrong"));
    }
    expect(failAgain).toHaveBeenCalledTimes(20);
  });

  it("a successful login clears the failure counter", async () => {
    // 4 failures, then a success, then failures should start fresh.
    const failSignIn = mockAuthFailure();
    for (let i = 0; i < 4; i++) await login(makeFormData("a@b.de", "wrong"));
    expect(failSignIn).toHaveBeenCalledTimes(4);

    const okSignIn = mockAuthSuccess();
    await expect(login(makeFormData("a@b.de", "right"))).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(okSignIn).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith("/dashboard");

    // Counter cleared -> 5 more failures are allowed to reach signInWithPassword.
    const failAgain = mockAuthFailure();
    for (let i = 0; i < 5; i++) await login(makeFormData("a@b.de", "wrong"));
    expect(failAgain).toHaveBeenCalledTimes(5);
  });
});
