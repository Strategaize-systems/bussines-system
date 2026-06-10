import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { setPassword } = await import("../actions");
const { createClient } = await import("@/lib/supabase/server");
const { redirect } = await import("next/navigation");

function makeFormData(password: string, confirmPassword?: string): FormData {
  const fd = new FormData();
  fd.set("password", password);
  fd.set("confirmPassword", confirmPassword ?? password);
  return fd;
}

function makeSupabaseMock(updateError?: string) {
  const updateUser = vi
    .fn()
    .mockResolvedValue({ error: updateError ? { message: updateError } : null });
  return { auth: { updateUser } };
}

describe("setPassword (V8.12 SLC-908 password policy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-908-6: weak passwords are rejected with ok:false -> error message,
  // and updateUser() is never reached.
  it("rejects a too-short password and does not touch Supabase", async () => {
    const result = await setPassword(makeFormData("short"));
    expect(result).toEqual({
      error: "Passwort muss mindestens 12 Zeichen lang sein",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a 12-char but weak password (score < 3)", async () => {
    const result = await setPassword(makeFormData("Password1234")); // len 12, score 1
    expect(result).toEqual({
      error:
        "Passwort ist zu schwach. Bitte waehle ein staerkeres Passwort (z. B. eine laengere Passphrase).",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects when passwords do not match (after policy passes)", async () => {
    const result = await setPassword(
      makeFormData("correcthorsebatterystaple", "different-but-also-long"),
    );
    expect(result).toEqual({ error: "Passwoerter stimmen nicht ueberein" });
    expect(createClient).not.toHaveBeenCalled();
  });

  // AC-908-6: strong passwords are accepted -> updateUser called -> redirect.
  it("accepts a strong password, calls updateUser and redirects", async () => {
    const supabase = makeSupabaseMock();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    await expect(
      setPassword(makeFormData("correcthorsebatterystaple")),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "correcthorsebatterystaple",
    });
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("returns the Supabase error when updateUser fails", async () => {
    const supabase = makeSupabaseMock("token expired");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);

    const result = await setPassword(makeFormData("correcthorsebatterystaple"));
    expect(result).toEqual({ error: "token expired" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
