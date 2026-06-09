import { describe, it, expect, vi, beforeEach } from "vitest";

// V8.12 SLC-906 MT-6 Klasse-A Regression-Tests fuer kpi-snapshots.ts.
// Stellt sicher dass User-Client benutzt wird (kein createAdminClient mehr).

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const { getSnapshotTrend, getSnapshotComparison } = await import(
  "./kpi-snapshots"
);
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";

function makeUserClientMock(opts: {
  unauthenticated?: boolean;
  rows?: Array<{ snapshot_date: string; kpi_value: number }>;
}) {
  const resolvedValue = {
    data: opts.rows ?? [],
    error: null,
  };
  const fromMock = vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.eq = () => chain;
    chain.gte = () => chain;
    chain.lte = () => chain;
    chain.order = () => chain;
    chain.is = () => chain;
    chain.limit = () => chain;
    chain.then = (cb: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(resolvedValue).then(cb);
    return {
      select: () => chain,
    };
  });

  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.unauthenticated ? null : { id: USER_ID } },
  });

  return { client: { from: fromMock, auth: { getUser } }, fromMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("kpi-snapshots.ts — User-Client Defense-in-Depth", () => {
  it("getSnapshotTrend returns [] when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await getSnapshotTrend("revenue", 7)).toEqual([]);
  });

  it("getSnapshotTrend uses User-Client only", async () => {
    const mock = makeUserClientMock({
      rows: [{ snapshot_date: "2026-06-01", kpi_value: 100 }],
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getSnapshotTrend("revenue", 7);
    expect(mock.fromMock).toHaveBeenCalledWith("kpi_snapshots");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("getSnapshotComparison uses User-Client only", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await getSnapshotComparison("revenue", "2026-06-01", "2026-05-01");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
