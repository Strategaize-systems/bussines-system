// V7.5 SLC-754 MT-2 — applyNlRule Server-Action Tests.
//
// Verifiziert:
//   1. Member-Profile -> ok:false, error:"forbidden" (kein DB-Touch).
//   2. Schema-Validation-Fail (z.B. zu kurzer Name) -> ok:false, error:"validation".
//   3. Dedup throws DuplicateRuleError -> ok:false, error:"duplicate" mit existing_rule_id.
//   4. Success-Path -> ok:true mit rule_id, INSERT automation_rules + INSERT audit_log.
//   5. audit_log-Insert wird mit korrektem Shape (action, entity_type, entity_id, context) aufgerufen.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// IMPORTANT: keep DuplicateRuleError as the real class — we use `instanceof`
// in the action. Only mock assertNotDuplicateRuleDb.
vi.mock("@/lib/automation/sculptor-dedup", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/automation/sculptor-dedup")
  >("@/lib/automation/sculptor-dedup");
  return {
    ...actual,
    assertNotDuplicateRuleDb: vi.fn(),
  };
});

const { applyNlRule } = await import("./apply-nl-rule");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { assertNotDuplicateRuleDb, DuplicateRuleError } = await import(
  "@/lib/automation/sculptor-dedup"
);

function profile(role: "admin" | "teamlead" | "member") {
  return {
    user_id: "user-1",
    role,
    team_id: null,
    display_name: "Test User",
  };
}

function validSchema(): SculptSuccess {
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

function applyInput(schemaOverride?: Partial<SculptSuccess>) {
  return {
    schema: { ...validSchema(), ...(schemaOverride ?? {}) } as SculptSuccess,
    nl_input: "Wenn Deal nach Angebot, dann Task in 2 Tagen",
    sculpt_audit_id: "session-aaa",
    sculptor_cost_usd: 0.012,
    edited_in_form: false,
  };
}

interface SupabaseMockOpts {
  insertRule?: { data?: { id: string } | null; error?: { message: string } | null };
  auditInsert?: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const insertRuleResult = {
    data: opts.insertRule?.data ?? { id: "rule-aaa" },
    error: opts.insertRule?.error ?? null,
  };
  const auditInsert = opts.auditInsert ?? vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "automation_rules") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(insertRuleResult),
          })),
        })),
      };
    }
    if (table === "audit_log") {
      return {
        insert: auditInsert,
      };
    }
    throw new Error(`unexpected table in mock: ${table}`);
  });
  return { from, auditInsert };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(assertNotDuplicateRuleDb).mockReset();
});

describe("applyNlRule", () => {
  it("rejects member with forbidden error and does not touch DB", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("member"));
    const res = await applyNlRule(applyInput());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("forbidden");
    expect(createClient).not.toHaveBeenCalled();
    expect(assertNotDuplicateRuleDb).not.toHaveBeenCalled();
  });

  it("returns validation error when schema is invalid (e.g. name too short)", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const res = await applyNlRule(applyInput({ name: "ab" })); // <3 chars per schema
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
    expect(assertNotDuplicateRuleDb).not.toHaveBeenCalled();
  });

  it("returns duplicate error with existing_rule_id when dedup throws DuplicateRuleError", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const dupMock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(dupMock as never);
    vi.mocked(createAdminClient).mockReturnValue(dupMock as never);
    vi.mocked(assertNotDuplicateRuleDb).mockRejectedValue(
      new DuplicateRuleError("existing-rule-99", "user-1", "Follow-up bei Angebot")
    );
    const res = await applyNlRule(applyInput());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("duplicate");
      expect(res.existing_rule_id).toBe("existing-rule-99");
    }
  });

  it("inserts automation_rules and audit_log on success", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("admin"));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);
    vi.mocked(createAdminClient).mockReturnValue(mock as never);
    vi.mocked(assertNotDuplicateRuleDb).mockResolvedValue(undefined);

    const res = await applyNlRule(applyInput());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rule_id).toBe("rule-aaa");

    expect(mock.from).toHaveBeenCalledWith("automation_rules");
    expect(mock.from).toHaveBeenCalledWith("audit_log");
  });

  it("audit_log INSERT carries action=automation_rule.create_via_nl + sculpt metadata", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile("teamlead"));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);
    vi.mocked(createAdminClient).mockReturnValue(mock as never);
    vi.mocked(assertNotDuplicateRuleDb).mockResolvedValue(undefined);

    await applyNlRule(applyInput());

    expect(auditInsert).toHaveBeenCalledTimes(1);
    const auditRow = auditInsert.mock.calls[0][0];
    expect(auditRow.action).toBe("automation_rule.create_via_nl");
    expect(auditRow.entity_type).toBe("automation_rule");
    expect(auditRow.entity_id).toBe("rule-aaa");
    expect(auditRow.actor_id).toBe("user-1");
    const context = JSON.parse(auditRow.context);
    expect(context.nl_input).toBe("Wenn Deal nach Angebot, dann Task in 2 Tagen");
    expect(context.sculpt_audit_id).toBe("session-aaa");
    expect(context.sculptor_cost_usd).toBe(0.012);
    expect(context.edited_in_form).toBe(false);
  });
});
