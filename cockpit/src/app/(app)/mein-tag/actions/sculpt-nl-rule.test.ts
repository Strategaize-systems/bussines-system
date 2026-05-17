// V7.5 SLC-753 MT-1 — sculptNlRule Server-Action Tests.
//
// Verifiziert:
//   1. Member-Profile → ok:false, error:"forbidden" (kein sculptRule-Call).
//   2. Admin-Profile + valider Input → sculptRule(nlInput, user_id) wird gerufen.
//   3. Teamlead-Profile + valider Input → sculptRule wird gerufen.
//   4. Input < 5 Zeichen → ok:false, error:"input_too_short".
//   5. Input > 2000 Zeichen → ok:false, error:"input_too_long".
//   6. sculptRule throws → ok:false, error:"infra".

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/automation/sculptor", () => ({
  sculptRule: vi.fn(),
}));

const { sculptNlRule } = await import("./sculpt-nl-rule");
const { getProfile } = await import("@/lib/auth/get-profile");
const { sculptRule } = await import("@/lib/automation/sculptor");

function formData(nlInput: string): FormData {
  const fd = new FormData();
  fd.set("nlInput", nlInput);
  return fd;
}

function profile(role: "admin" | "teamlead" | "member") {
  return {
    user_id: "user-1",
    role,
    team_id: null,
    display_name: "Test User",
  };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(sculptRule).mockReset();
});

describe("sculptNlRule", () => {
  it("rejects member with forbidden error and does not call sculptRule", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("member"));
    const res = await sculptNlRule(formData("Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task an"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("forbidden");
    expect(sculptRule).not.toHaveBeenCalled();
  });

  it("calls sculptRule for admin with correct userId + trimmed nlInput", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    vi.mocked(sculptRule).mockResolvedValue({
      status: "success",
      payload: {
        name: "Test",
        trigger_event: "deal.stage_changed",
        trigger_config: {},
        conditions: [],
        actions: [{ type: "create_task", params: { title: "Follow up" } }],
      },
      totalCostUsd: 0.003,
      attemptCount: 1,
      sessionId: "s1",
    });
    const res = await sculptNlRule(formData("  Wenn Deal nach Angebot, dann Task  "));
    expect(res.ok).toBe(true);
    expect(sculptRule).toHaveBeenCalledWith("Wenn Deal nach Angebot, dann Task", "user-1");
  });

  it("calls sculptRule for teamlead", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("teamlead"));
    vi.mocked(sculptRule).mockResolvedValue({
      status: "reject",
      reason: { reject_reason: "out_of_domain", explanation: "outside workflow domain" },
      totalCostUsd: 0.003,
      attemptCount: 1,
      sessionId: "s2",
    });
    const res = await sculptNlRule(formData("Erstelle mir einen neuen Mandanten"));
    expect(res.ok).toBe(true);
    expect(sculptRule).toHaveBeenCalledTimes(1);
  });

  it("returns input_too_short when nlInput < 5 chars", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const res = await sculptNlRule(formData("abc"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("input_too_short");
    expect(sculptRule).not.toHaveBeenCalled();
  });

  it("returns input_too_long when nlInput > 2000 chars", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const longInput = "a".repeat(2001);
    const res = await sculptNlRule(formData(longInput));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("input_too_long");
    expect(sculptRule).not.toHaveBeenCalled();
  });

  it("returns infra error when sculptRule throws", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    vi.mocked(sculptRule).mockRejectedValue(new Error("bedrock unreachable"));
    const res = await sculptNlRule(formData("Wenn Deal nach Angebot, dann Task"));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("infra");
      expect(res.message).toContain("bedrock unreachable");
    }
  });
});
