import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-6 Klasse-A Regression-Tests fuer goals.ts.
// Stellt sicher dass alle Operations User-Client benutzen (kein createAdminClient
// mehr) — RLS Klasse-A `goals_*` (user_id=auth.uid() OR is_admin()) greift.

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

vi.mock("@/lib/goals/calculator", () => ({
  calculateGoalProgress: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/ai/bedrock-client", () => ({
  queryLLM: vi.fn().mockResolvedValue({ success: true, data: "Empfehlung" }),
}));

vi.mock("@/lib/ai/prompts/performance-recommendation", () => ({
  PERFORMANCE_SYSTEM_PROMPT: "system",
  buildPerformancePrompt: vi.fn().mockReturnValue("prompt"),
}));

const {
  listGoals,
  createGoal,
  updateGoal,
  cancelGoal,
  importGoalsFromCSV,
} = await import("./goals");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";

function makeUserClientMock(opts: {
  unauthenticated?: boolean;
  insertError?: { code?: string; message: string } | null;
  updateError?: { message: string } | null;
  listData?: unknown[];
}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown }> = [];

  const fromMock = vi.fn((table: string) => ({
    select: (_cols?: string) => {
      const orderResult = Promise.resolve({
        data: opts.listData ?? [],
        error: null,
      });
      return {
        eq: () => ({
          order: () => ({
            then: (cb: (v: { data: unknown; error: unknown }) => unknown) =>
              orderResult.then(cb),
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          eq: () => ({
            single: () =>
              Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
    insert: (payload: unknown) => {
      inserts.push({ table, payload });
      return {
        select: () => ({
          single: () =>
            Promise.resolve({
              data: { id: "new-goal", ...((payload as object) ?? {}) },
              error: opts.insertError ?? null,
            }),
        }),
        then: (cb: (v: { error: unknown }) => unknown) =>
          Promise.resolve({ error: opts.insertError ?? null }).then(cb),
      };
    },
    update: (payload: unknown) => ({
      eq: (_col: string, _val: unknown) => {
        updates.push({ table, payload });
        return {
          eq: (_col2: string, _val2: unknown) => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "updated", ...((payload as object) ?? {}) },
                  error: opts.updateError ?? null,
                }),
            }),
            then: (cb: (v: { error: unknown }) => unknown) =>
              Promise.resolve({ error: opts.updateError ?? null }).then(cb),
          }),
        };
      },
    }),
  }));

  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.unauthenticated ? null : { id: USER_ID } },
  });

  return {
    client: { from: fromMock, auth: { getUser } },
    inserts,
    updates,
    fromMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("goals.ts — User-Client Defense-in-Depth (SLC-901 M-1)", () => {
  it("listGoals uses User-Client only", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await listGoals();
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("listGoals returns [] when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await listGoals()).toEqual([]);
  });

  it("createGoal uses User-Client + writes user_id=auth.uid()", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await createGoal({
      type: "revenue",
      period: "year",
      period_start: "2026-01-01",
      target_value: 100000,
    });

    expect(result.goal).toBeDefined();
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0].payload).toMatchObject({
      user_id: USER_ID,
      target_value: 100000,
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("createGoal rejects target_value <= 0", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await createGoal({
      type: "revenue",
      period: "year",
      period_start: "2026-01-01",
      target_value: 0,
    });
    expect(result.error).toMatch(/Sollwert/);
  });

  it("updateGoal uses User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await updateGoal({
      id: "goal-1",
      target_value: 200000,
    });
    expect(result.goal).toBeDefined();
    expect(mock.updates).toHaveLength(1);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("cancelGoal uses User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await cancelGoal("goal-1");
    expect(result.error).toBeUndefined();
    expect(mock.updates).toHaveLength(1);
    expect(mock.updates[0].payload).toMatchObject({ status: "cancelled" });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("importGoalsFromCSV uses User-Client for each row", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await importGoalsFromCSV([
      {
        type: "revenue",
        period: "year",
        period_start: "2026-01-01",
        target_value: 100000,
        product_id: null,
      },
      {
        type: "deal_count",
        period: "year",
        period_start: "2026-01-01",
        target_value: 50,
        product_id: null,
      },
    ]);

    expect(result.imported).toBe(2);
    expect(mock.inserts).toHaveLength(2);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
