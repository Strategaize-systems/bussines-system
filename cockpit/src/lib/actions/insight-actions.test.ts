import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/ai/signals/applier", () => ({
  applyProposedChange: vi.fn(),
}));

const {
  getPendingInsights,
  approveInsightAction,
  rejectInsightAction,
} = await import("./insight-actions");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");
const { applyProposedChange } = await import("@/lib/ai/signals/applier");

const USER_ID = "55555555-5555-5555-5555-555555555555";
const QUEUE_ID = "queue-1";
const DEAL_ID = "deal-1";

type Op =
  | { kind: "select"; table: string }
  | { kind: "insert"; table: string; payload: unknown }
  | { kind: "update"; table: string; payload: unknown; id?: unknown };

function makeUserClientMock(opts: {
  unauthenticated?: boolean;
  loadItem?: Record<string, unknown> | null;
  loadError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const ops: Op[] = [];

  const fromMock = vi.fn((table: string) => ({
    select: (_cols?: string) => {
      ops.push({ kind: "select", table });
      return {
        in: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: opts.loadItem ?? null,
                error: opts.loadError ?? null,
              }),
          }),
        }),
      };
    },
    insert: (payload: unknown) => {
      ops.push({ kind: "insert", table, payload });
      return Promise.resolve({ error: null });
    },
    update: (payload: unknown) => ({
      eq: (_col: string, val: unknown) => {
        ops.push({ kind: "update", table, payload, id: val });
        return {
          eq: (_col2: string, _val2: unknown) => ({
            select: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: opts.updateError ? null : opts.loadItem ?? {
                    id: val,
                    status: "rejected",
                  },
                  error: opts.updateError ?? null,
                }),
            }),
          }),
          then: (cb: (v: { error: unknown }) => unknown) =>
            Promise.resolve({ error: null }).then(cb),
        };
      },
    }),
  }));

  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.unauthenticated ? null : { id: USER_ID } },
  });

  return {
    client: { from: fromMock, auth: { getUser } },
    ops,
    fromMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPendingInsights (read via User-Client)", () => {
  it("returns [] when no auth user", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await getPendingInsights()).toEqual([]);
  });

  it("queries User-Client only (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getPendingInsights();
    expect(mock.fromMock).toHaveBeenCalledWith("ai_action_queue");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("approveInsightAction (User-Client, RLS Klasse-C)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await approveInsightAction(QUEUE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Nicht authentifiziert/);
  });

  it("returns error when queue item not found", async () => {
    const mock = makeUserClientMock({ loadItem: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await approveInsightAction(QUEUE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/nicht gefunden/);
  });

  it("happy path: applies change, updates queue, inserts activity (no admin)", async () => {
    const queueItem = {
      id: QUEUE_ID,
      status: "pending",
      target_entity_type: "deal",
      target_entity_id: DEAL_ID,
      reasoning: "test reason",
    };
    const mock = makeUserClientMock({ loadItem: queueItem });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    vi.mocked(applyProposedChange).mockResolvedValue({
      success: true,
      applied: "deal.next_step",
    } as never);

    const result = await approveInsightAction(QUEUE_ID);
    expect(result.success).toBe(true);
    expect(result.applied).toBe("deal.next_step");

    // 1 SELECT + 1 UPDATE (queue) + 1 INSERT (activities)
    const queueUpdate = mock.ops.find(
      (o) => o.kind === "update" && o.table === "ai_action_queue",
    );
    expect(queueUpdate).toBeDefined();
    const activityInsert = mock.ops.find(
      (o) => o.kind === "insert" && o.table === "activities",
    );
    expect(activityInsert).toBeDefined();

    // ISSUE-093 Defense-in-Depth: admin client must NOT be used
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("rejectInsightAction (User-Client, RLS Klasse-C)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await rejectInsightAction(QUEUE_ID, "no good");
    expect(result.success).toBe(false);
  });

  it("inserts ai_feedback row via User-Client (no admin)", async () => {
    const updatedItem = {
      id: QUEUE_ID,
      status: "rejected",
    };
    const mock = makeUserClientMock({ loadItem: updatedItem });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await rejectInsightAction(QUEUE_ID, "wrong target");
    expect(result.success).toBe(true);

    const feedbackInsert = mock.ops.find(
      (o) => o.kind === "insert" && o.table === "ai_feedback",
    );
    expect(feedbackInsert).toBeDefined();
    expect(
      (feedbackInsert as { payload: { feedback_type: string } }).payload
        .feedback_type,
    ).toBe("rejected");

    // ISSUE-093 Defense-in-Depth: admin client must NOT be used
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
