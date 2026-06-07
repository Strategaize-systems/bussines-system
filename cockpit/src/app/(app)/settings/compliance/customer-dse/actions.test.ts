import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile } from "@/lib/auth/types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/assert-role", () => ({
  assertRole: vi.fn(),
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

// Note: node:fs/promises is intentionally NOT mocked — vi.mock on node-builtin
// is brittle for "use server" modules. The reset-test below reads the real
// customer-dse-default.md from the worktree (which exists per SLC-842).

const { updateCustomerDse, resetCustomerDseToDefault } = await import(
  "./actions"
);
const { assertRole } = await import("@/lib/auth/assert-role");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const ADMIN_PROFILE: Profile = {
  user_id: "55555555-5555-5555-5555-555555555555",
  role: "admin",
  team_id: "11111111-1111-1111-1111-111111111111",
  display_name: "Admin",
};

function makeSupabaseMock(opts: {
  previousContent?: string;
  updateError?: string;
}) {
  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  // Finite-state mock that mirrors supabase-js chaining of .update().eq().eq()
  // and .select().eq().eq().maybeSingle() — resolves at the final method call.
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const fromMock = vi.fn((table: string) => {
    if (table === "audit_log") {
      return {
        insert: (payload: unknown) => {
          calls.push({ table, method: "insert", args: [payload] });
          return auditInsert(payload);
        },
      };
    }
    if (table === "legal_documents") {
      return {
        select: (cols: string) => {
          calls.push({ table, method: "select", args: [cols] });
          return {
            eq: (col: string, val: unknown) => {
              calls.push({ table, method: "select.eq", args: [col, val] });
              return {
                eq: (col2: string, val2: unknown) => {
                  calls.push({
                    table,
                    method: "select.eq.eq",
                    args: [col2, val2],
                  });
                  return {
                    maybeSingle: () =>
                      Promise.resolve({
                        data: opts.previousContent
                          ? { content_md: opts.previousContent }
                          : null,
                        error: null,
                      }),
                  };
                },
              };
            },
          };
        },
        update: (payload: unknown) => {
          calls.push({ table, method: "update", args: [payload] });
          return {
            eq: (col: string, val: unknown) => {
              calls.push({ table, method: "update.eq", args: [col, val] });
              return {
                eq: (col2: string, val2: unknown) => {
                  calls.push({
                    table,
                    method: "update.eq.eq",
                    args: [col2, val2],
                  });
                  return Promise.resolve({
                    error: opts.updateError
                      ? { message: opts.updateError }
                      : null,
                  });
                },
              };
            },
          };
        },
      };
    }
    throw new Error(`unexpected from(${table})`);
  });

  return { from: fromMock, calls, auditInsert };
}

beforeEach(() => {
  vi.clearAllMocks();
  (assertRole as ReturnType<typeof vi.fn>).mockResolvedValue(ADMIN_PROFILE);
});

describe("updateCustomerDse", () => {
  it("rejects content_md shorter than 100 chars", async () => {
    const supabase = makeSupabaseMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const result = await updateCustomerDse("zu kurz");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/zu kurz/i);
    // No DB write should have happened
    expect(
      supabase.calls.some((c) => c.method.startsWith("update")),
    ).toBe(false);
  });

  it("rejects content_md longer than 50000 chars", async () => {
    const supabase = makeSupabaseMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const result = await updateCustomerDse("x".repeat(50001));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/zu lang/i);
  });

  it("updates legal_documents and inserts audit_log on happy path", async () => {
    const supabase = makeSupabaseMock({
      previousContent: "a".repeat(200),
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const newContent = "b".repeat(500);
    const result = await updateCustomerDse(newContent);

    expect(result.ok).toBe(true);

    // UPDATE legal_documents WHERE tenant_team_id=? AND kind='customer-dse'
    const updateCalls = supabase.calls.filter((c) =>
      c.method.startsWith("update"),
    );
    expect(updateCalls).toHaveLength(3); // update() + eq() + eq()
    expect(updateCalls[1].args).toEqual([
      "tenant_team_id",
      ADMIN_PROFILE.team_id,
    ]);
    expect(updateCalls[2].args).toEqual(["kind", "customer-dse"]);

    // audit_log INSERT
    expect(supabase.auditInsert).toHaveBeenCalledTimes(1);
    const auditPayload = supabase.auditInsert.mock.calls[0][0] as {
      action: string;
      actor_id: string;
      entity_type: string;
      entity_id: string | null;
      changes: { old_length: number; new_length: number };
    };
    expect(auditPayload.action).toBe("customer_dse.updated");
    expect(auditPayload.actor_id).toBe(ADMIN_PROFILE.user_id);
    expect(auditPayload.entity_type).toBe("legal_document");
    expect(auditPayload.entity_id).toBe(ADMIN_PROFILE.team_id);
    expect(auditPayload.changes.old_length).toBe(200);
    expect(auditPayload.changes.new_length).toBe(500);
  });
});

describe("resetCustomerDseToDefault", () => {
  it("reads default markdown from disk and updates legal_documents with audit", async () => {
    const supabase = makeSupabaseMock({
      previousContent: "edited content",
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(supabase);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const result = await resetCustomerDseToDefault();

    expect(result.ok).toBe(true);

    // UPDATE happened against legal_documents with both eq() filters
    const updateChain = supabase.calls.filter((c) =>
      c.method.startsWith("update"),
    );
    expect(updateChain).toHaveLength(3); // update() + eq() + eq()
    expect(updateChain[1].args).toEqual([
      "tenant_team_id",
      ADMIN_PROFILE.team_id,
    ]);
    expect(updateChain[2].args).toEqual(["kind", "customer-dse"]);

    // audit_log INSERT with reset action
    expect(supabase.auditInsert).toHaveBeenCalledTimes(1);
    const auditPayload = supabase.auditInsert.mock.calls[0][0] as {
      action: string;
      actor_id: string;
      entity_type: string;
      changes: { new_length: number };
    };
    expect(auditPayload.action).toBe("customer_dse.reset");
    expect(auditPayload.actor_id).toBe(ADMIN_PROFILE.user_id);
    expect(auditPayload.entity_type).toBe("legal_document");
    // The real customer-dse-default.md is > 1000 chars per SLC-842 AC6
    expect(auditPayload.changes.new_length).toBeGreaterThan(1000);
  });
});
