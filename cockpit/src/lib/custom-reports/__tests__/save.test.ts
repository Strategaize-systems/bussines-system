// V7.6 SLC-762 MT-2 — saveCustomReport Server-Action Unit-Tests.
//
// Mock-Pattern aus apply-nl-rule.test.ts (V7.5 SLC-754).
//
// Verifiziert:
//   1. Validation-Fail (name zu kurz) -> { ok:false, code:"validation" }, kein DB-Touch.
//   2. Validation-Fail (context_type unbekannt) -> { ok:false, code:"validation" }.
//   3. Duplicate-Name (Postgres-Error 23505) -> { ok:false, code:"duplicate_name" }.
//   4. Other Insert-Error -> { ok:false, code:"infra" }.
//   5. Success-Path: INSERT custom_reports + INSERT audit_log mit korrektem Shape.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth/read-only-context", () => ({
  assertNotReadOnlyContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { saveCustomReport } = await import("../actions/save");
const { getProfile } = await import("@/lib/auth/get-profile");
const { createClient } = await import("@/lib/supabase/server");

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
    name: "Mein Custom Report",
    prompt_template: "Wie laeuft mein Tag insgesamt? Bitte fasse zusammen.",
    context_type: "mein-tag" as const,
  };
}

interface SupabaseMockOpts {
  insertReport?: {
    data?: { id: string } | null;
    error?: { code?: string; message: string } | null;
  };
  auditInsert?: ReturnType<typeof vi.fn>;
}

function makeSupabaseMock(opts: SupabaseMockOpts = {}) {
  const insertResult = {
    data: opts.insertReport?.data ?? { id: "report-aaa" },
    error: opts.insertReport?.error ?? null,
  };
  const auditInsert = opts.auditInsert ?? vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "custom_reports") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(insertResult),
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
});

describe("saveCustomReport", () => {
  it("rejects with validation when name is too short", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await saveCustomReport({ ...validInput(), name: "a" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("validation");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects with validation when context_type is not allowed", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const res = await saveCustomReport({
      ...validInput(),
      context_type: "deal-detail" as never,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("validation");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("maps Postgres 23505 to duplicate_name", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      insertReport: {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await saveCustomReport(validInput());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("duplicate_name");
  });

  it("maps other Postgres errors to infra", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const mock = makeSupabaseMock({
      insertReport: {
        data: null,
        error: { code: "42501", message: "permission denied for table custom_reports" },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await saveCustomReport(validInput());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("infra");
  });

  it("returns ok with id and inserts audit_log on success", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = makeSupabaseMock({ auditInsert });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const res = await saveCustomReport(validInput());

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toBe("report-aaa");

    expect(mock.from).toHaveBeenCalledWith("custom_reports");
    expect(mock.from).toHaveBeenCalledWith("audit_log");

    expect(auditInsert).toHaveBeenCalledTimes(1);
    const auditRow = auditInsert.mock.calls[0][0];
    expect(auditRow.action).toBe("custom_report.created");
    expect(auditRow.entity_type).toBe("custom_report");
    expect(auditRow.entity_id).toBe("report-aaa");
    expect(auditRow.actor_id).toBe("user-1");
    const context = JSON.parse(auditRow.context);
    expect(context.name).toBe("Mein Custom Report");
    expect(context.context_type).toBe("mein-tag");
  });
});
