// V7.5 SLC-754 MT-1 — previewNlRule Server-Action Tests.
//
// Verifiziert:
//   1. Member-Profile -> ok:false, error:"forbidden" (kein dryRunRule-Call).
//   2. Admin-Profile + valides Schema -> dryRunRule(synthetic_rule, 7) wird gerufen.
//   3. Teamlead-Profile + 0-Match -> ok:true, total_matched:0.
//   4. dryRunRule throws -> ok:false, error:"infra".

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";
import type { DryRunResult } from "@/lib/automation/dry-run";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/automation/dry-run", () => ({
  dryRunRule: vi.fn(),
}));

const { previewNlRule } = await import("./preview-nl-rule");
const { getProfile } = await import("@/lib/auth/get-profile");
const { dryRunRule } = await import("@/lib/automation/dry-run");

function profile(role: "admin" | "teamlead" | "member") {
  return {
    user_id: "user-1",
    role,
    team_id: null,
    display_name: "Test User",
  };
}

function sampleSchema(): SculptSuccess {
  return {
    name: "Follow-up bei Angebot",
    description: null,
    trigger_event: "deal.stage_changed",
    trigger_config: {},
    conditions: [],
    actions: [
      {
        type: "create_task",
        params: { title: "Follow-up", due_in_days: 2 },
      },
    ],
  };
}

function emptyDryRun(): DryRunResult {
  return { total_matched: 0, hits: [], truncated: false, source_count: 0 };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(dryRunRule).mockReset();
});

describe("previewNlRule", () => {
  it("rejects member with forbidden error and does not call dryRunRule", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("member"));
    const res = await previewNlRule(sampleSchema());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("forbidden");
    expect(dryRunRule).not.toHaveBeenCalled();
  });

  it("calls dryRunRule with daysBack=7 for admin", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    vi.mocked(dryRunRule).mockResolvedValue(emptyDryRun());
    const schema = sampleSchema();
    const res = await previewNlRule(schema);
    expect(res.ok).toBe(true);
    expect(dryRunRule).toHaveBeenCalledTimes(1);
    const [ruleArg, daysBackArg] = vi.mocked(dryRunRule).mock.calls[0];
    expect(daysBackArg).toBe(7);
    expect(ruleArg.trigger_event).toBe(schema.trigger_event);
    expect(ruleArg.conditions).toEqual(schema.conditions);
    expect(ruleArg.actions).toEqual(schema.actions);
  });

  it("returns 0-match result for teamlead with no historical hits", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("teamlead"));
    vi.mocked(dryRunRule).mockResolvedValue(emptyDryRun());
    const res = await previewNlRule(sampleSchema());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.total_matched).toBe(0);
      expect(res.result.hits).toHaveLength(0);
    }
  });

  it("returns infra error when dryRunRule throws", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    vi.mocked(dryRunRule).mockRejectedValue(new Error("supabase admin unreachable"));
    const res = await previewNlRule(sampleSchema());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("infra");
      expect(res.message).toContain("supabase admin unreachable");
    }
  });
});
