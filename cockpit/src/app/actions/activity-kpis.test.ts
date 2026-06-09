import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-6 Klasse-A Regression-Tests fuer activity-kpis.ts.
// Stellt sicher dass User-Client benutzt wird (kein createAdminClient mehr).

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

vi.mock("@/lib/goals/activity-kpi-queries", () => ({
  getActivityKpiActual: vi.fn().mockResolvedValue(0),
  getActivityKpiActualForRange: vi.fn().mockResolvedValue(0),
  dayRangesForWeek: vi.fn().mockReturnValue([]),
}));

const {
  listActivityKpiTargets,
  upsertActivityKpiTarget,
  toggleActivityKpiTarget,
  getWeeklyComparison,
} = await import("./activity-kpis");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";

function makeUserClientMock(opts: {
  unauthenticated?: boolean;
  existingTarget?: { id: string } | null;
  targets?: unknown[];
}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown }> = [];

  const fromMock = vi.fn((table: string) => ({
    select: () => {
      const chain = {
        eq: () => chain,
        order: () => Promise.resolve({ data: opts.targets ?? [], error: null }),
        single: () =>
          Promise.resolve({
            data: opts.existingTarget ?? null,
            error: null,
          }),
        gte: () => chain,
        lt: () => chain,
        then: (cb: (v: { count: number; error: unknown }) => unknown) =>
          Promise.resolve({ count: 0, error: null }).then(cb),
      };
      return chain;
    },
    insert: (payload: unknown) => {
      inserts.push({ table, payload });
      return Promise.resolve({ error: null });
    },
    update: (payload: unknown) => ({
      eq: () => ({
        eq: () => {
          updates.push({ table, payload });
          return Promise.resolve({ error: null });
        },
        then: (cb: (v: { error: unknown }) => unknown) => {
          updates.push({ table, payload });
          return Promise.resolve({ error: null }).then(cb);
        },
      }),
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

describe("activity-kpis.ts — User-Client Defense-in-Depth (SLC-901 M-1)", () => {
  it("listActivityKpiTargets returns [] when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await listActivityKpiTargets()).toEqual([]);
  });

  it("listActivityKpiTargets uses User-Client only", async () => {
    const mock = makeUserClientMock({ targets: [] });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await listActivityKpiTargets();
    expect(mock.fromMock).toHaveBeenCalledWith("activity_kpi_targets");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("upsertActivityKpiTarget rejects negative dailyTarget", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await upsertActivityKpiTarget("calls", -1);
    expect(result.error).toMatch(/negativ/);
  });

  it("upsertActivityKpiTarget inserts new row via User-Client (no admin)", async () => {
    const mock = makeUserClientMock({ existingTarget: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await upsertActivityKpiTarget("calls", 10);
    expect(result.error).toBeUndefined();
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0].payload).toMatchObject({
      user_id: USER_ID,
      kpi_key: "calls",
      daily_target: 10,
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("toggleActivityKpiTarget uses User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await toggleActivityKpiTarget("calls", false);
    expect(result.error).toBeUndefined();
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("getWeeklyComparison uses User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await getWeeklyComparison();
    expect(result.thisWeek).toBe(0);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
