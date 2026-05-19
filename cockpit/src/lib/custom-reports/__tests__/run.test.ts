// V7.6 SLC-762 MT-3 — runCustomReport Server-Action Unit-Tests.
//
// Verifiziert:
//   1. Validation-Fail (id kein uuid) -> { ok:false, code:"infra" }.
//   2. Scope-Mismatch -> { ok:false, code:"unauthenticated" }.
//   3. SELECT-Not-Found -> { ok:false, code:"not_found" }.
//   4. Bedrock-Throw -> { ok:false, code:"bedrock" }.
//   5. Success: SELECT + runCore + UPDATE + audit_log INSERT mit Cost.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/ki-workspace/custom-report-runner", () => ({
  runCustomReportCore: vi.fn(),
}));

const { runCustomReport } = await import("../actions/run");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");
const { runCustomReportCore } = await import(
  "@/lib/ki-workspace/custom-report-runner"
);

const VALID_UUID = "11111111-2222-4333-8444-555555555555";

function profile() {
  return {
    user_id: "user-1",
    role: "member" as const,
    team_id: null,
    display_name: "Test User",
  };
}

function validInput() {
  return {
    id: VALID_UUID,
    scope: { userId: "user-1" as string },
  };
}

interface SupabaseMockOpts {
  selectReport?: {
    data?: {
      id: string;
      name: string;
      prompt_template: string;
      context_type: "mein-tag" | "cockpit";
    } | null;
    error?: { message: string } | null;
  };
  selectUsage?: { data?: { usage_count: number } | null };
  updateError?: { message: string } | null;
  auditInsert?: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const selectReportRes = {
    data:
      opts.selectReport?.data === undefined
        ? {
            id: VALID_UUID,
            name: "Mein Report",
            prompt_template: "Wie laeufts heute?",
            context_type: "mein-tag" as const,
          }
        : opts.selectReport.data,
    error: opts.selectReport?.error ?? null,
  };
  const selectUsageRes = {
    data: opts.selectUsage?.data ?? { usage_count: 4 },
    error: null,
  };
  const updateRes = { error: opts.updateError ?? null };
  const auditInsert =
    opts.auditInsert ?? vi.fn().mockResolvedValue({ error: null });

  let selectCallIdx = 0;

  const from = vi.fn((table: string) => {
    if (table === "custom_reports") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockImplementation(async () => {
              const isFirstCall = selectCallIdx === 0;
              selectCallIdx++;
              return isFirstCall ? selectReportRes : selectUsageRes;
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue(updateRes),
        })),
      };
    }
    if (table === "audit_log") {
      return { insert: auditInsert };
    }
    throw new Error(`unexpected table in mock: ${table}`);
  });

  return { from, auditInsert };
}

beforeEach(() => {
  vi.mocked(getProfile).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(runCustomReportCore).mockReset();
});

describe("runCustomReport", () => {
  it("rejects with infra when id is not a uuid", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await runCustomReport({
      id: "not-a-uuid",
      scope: { userId: "user-1" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects with unauthenticated when scope.userId mismatches session", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await runCustomReport({
      id: VALID_UUID,
      scope: { userId: "other-user" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unauthenticated");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns not_found when SELECT returns no row (RLS filtered)", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({ selectReport: { data: null } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await runCustomReport(validInput());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("not_found");
    expect(runCustomReportCore).not.toHaveBeenCalled();
  });

  it("returns bedrock error when runCustomReportCore throws", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock as never);
    vi.mocked(runCustomReportCore).mockRejectedValue(
      new Error("Bedrock timeout after 60s")
    );

    const res = await runCustomReport(validInput());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("bedrock");
  });

  it("returns ok with ReportResult and inserts audit_log with cost on success", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);
    vi.mocked(runCustomReportCore).mockResolvedValue({
      reportResult: {
        markdown: "## Heutige Bewegung\n- foo",
        completedAt: "2026-05-19T13:00:00Z",
        model: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
        refreshable: true,
      },
      modelId: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      costUsd: 0.0042,
      inputTokens: 800,
      outputTokens: 200,
    });

    const res = await runCustomReport(validInput());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.markdown).toContain("Heutige Bewegung");

    expect(mock.from).toHaveBeenCalledWith("custom_reports");
    expect(mock.from).toHaveBeenCalledWith("audit_log");

    expect(auditInsert).toHaveBeenCalledTimes(1);
    const auditRow = auditInsert.mock.calls[0][0];
    expect(auditRow.action).toBe("custom_report.executed");
    expect(auditRow.entity_type).toBe("custom_report");
    expect(auditRow.entity_id).toBe(VALID_UUID);
    expect(auditRow.actor_id).toBe("user-1");
    const context = JSON.parse(auditRow.context);
    expect(context.name).toBe("Mein Report");
    expect(context.context_type).toBe("mein-tag");
    expect(context.cost_usd).toBe(0.0042);
    expect(context.input_tokens).toBe(800);
    expect(context.output_tokens).toBe(200);
  });
});
