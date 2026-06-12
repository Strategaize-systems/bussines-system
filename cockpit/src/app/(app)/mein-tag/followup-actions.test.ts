import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.15 SLC-913 MT-2 (ISSUE-111 + ISSUE-112): User-Client-Switch-Verifikation.
// Pattern aus src/lib/actions/insight-actions.test.ts (V8.12 SLC-906 MT-4).

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

const {
  getPendingFollowups,
  approveFollowup,
  postponeFollowup,
  rejectFollowup,
} = await import("./followup-actions");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";
const ACTION_ID = "action-1";

type Op =
  | { kind: "select"; table: string }
  | { kind: "insert"; table: string; payload: unknown }
  | { kind: "update"; table: string; payload: unknown; id?: unknown };

function makeUserClientMock(opts: {
  unauthenticated?: boolean;
  action?: Record<string, unknown> | null;
}) {
  const ops: Op[] = [];

  const fromMock = vi.fn((table: string) => ({
    select: () => {
      ops.push({ kind: "select", table });
      const single = () =>
        Promise.resolve(
          table === "ai_action_queue"
            ? opts.action
              ? { data: opts.action, error: null }
              : { data: null, error: { message: "0 rows (RLS)" } }
            : { data: null, error: null },
        );
      return {
        eq: () => ({
          single,
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
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
        return Promise.resolve({ error: null });
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

describe("getPendingFollowups (ISSUE-112: User-Client + Auth-Guard)", () => {
  it("returns [] when no auth user", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await getPendingFollowups()).toEqual([]);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("queries ai_action_queue via User-Client only (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getPendingFollowups();
    expect(mock.fromMock).toHaveBeenCalledWith("ai_action_queue");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("approveFollowup (ISSUE-111: User-Client, RLS Klasse-C)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await approveFollowup(ACTION_ID);
    expect(result.error).toMatch(/Nicht angemeldet/);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("returns 'Aktion nicht gefunden' when RLS hides the row (wrong owner)", async () => {
    const mock = makeUserClientMock({ action: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await approveFollowup(ACTION_ID);
    expect(result.error).toMatch(/Aktion nicht gefunden/);
    // Kein Write darf passiert sein:
    expect(mock.ops.filter((o) => o.kind !== "select")).toHaveLength(0);
  });

  it("happy path: queue update + tasks insert via User-Client (no admin)", async () => {
    const mock = makeUserClientMock({
      action: {
        id: ACTION_ID,
        entity_type: "contact",
        entity_id: "contact-1",
        action_description: "Nachfassen",
        reasoning: "Lange kein Kontakt",
        priority: "dringend",
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await approveFollowup(ACTION_ID);
    expect(result.error).toBe("");

    const queueUpdate = mock.ops.find(
      (o) => o.kind === "update" && o.table === "ai_action_queue",
    );
    expect(queueUpdate).toBeDefined();
    expect((queueUpdate as { payload: { decided_by: string } }).payload.decided_by).toBe(
      USER_ID,
    );

    const taskInsert = mock.ops.find(
      (o) => o.kind === "insert" && o.table === "tasks",
    );
    expect(taskInsert).toBeDefined();
    expect(
      (taskInsert as { payload: { created_by: string } }).payload.created_by,
    ).toBe(USER_ID);

    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("postponeFollowup (ISSUE-111: User-Client)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await postponeFollowup(ACTION_ID);
    expect(result.error).toMatch(/Nicht angemeldet/);
  });

  it("updates suggested_at via User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await postponeFollowup(ACTION_ID, 5);
    expect(result.error).toBe("");

    const update = mock.ops.find(
      (o) => o.kind === "update" && o.table === "ai_action_queue",
    );
    expect(update).toBeDefined();
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("rejectFollowup (ISSUE-111: User-Client)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await rejectFollowup(ACTION_ID);
    expect(result.error).toMatch(/Nicht angemeldet/);
  });

  it("rejects + inserts ai_feedback via User-Client (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await rejectFollowup(ACTION_ID, "passt nicht");
    expect(result.error).toBe("");

    const update = mock.ops.find(
      (o) => o.kind === "update" && o.table === "ai_action_queue",
    );
    expect(update).toBeDefined();
    const feedback = mock.ops.find(
      (o) => o.kind === "insert" && o.table === "ai_feedback",
    );
    expect(feedback).toBeDefined();
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
