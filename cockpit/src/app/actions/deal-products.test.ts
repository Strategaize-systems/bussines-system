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

const {
  listDealProducts,
  assignProduct,
  updateDealProduct,
  removeProduct,
} = await import("./deal-products");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const USER_ID = "55555555-5555-5555-5555-555555555555";
const DEAL_ID = "deal-1";
const DP_ID = "dp-1";
const PRODUCT_ID = "p-1";

function makeUserClientMock(opts: {
  listResult?: { data: unknown[] | null; error: unknown };
  insertError?: { code?: string; message: string } | null;
  updateError?: { message: string } | null;
  deleteError?: { message: string } | null;
  unauthenticated?: boolean;
}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown; id: unknown }> = [];
  const deletes: Array<{ table: string; id: unknown }> = [];

  const fromMock = vi.fn((table: string) => ({
    select: (_cols: string) => ({
      eq: (_col: string, _val: unknown) => ({
        order: () =>
          Promise.resolve(
            opts.listResult ?? { data: [], error: null },
          ),
      }),
    }),
    insert: (payload: unknown) => {
      inserts.push({ table, payload });
      return Promise.resolve({ error: opts.insertError ?? null });
    },
    update: (payload: unknown) => ({
      eq: (_col: string, val: unknown) => {
        updates.push({ table, payload, id: val });
        return Promise.resolve({ error: opts.updateError ?? null });
      },
    }),
    delete: () => ({
      eq: (_col: string, val: unknown) => {
        deletes.push({ table, id: val });
        return Promise.resolve({ error: opts.deleteError ?? null });
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
    deletes,
    fromMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listDealProducts (read via User-Client)", () => {
  it("returns [] when no auth user", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    expect(await listDealProducts(DEAL_ID)).toEqual([]);
  });

  it("queries User-Client only (no admin)", async () => {
    const mock = makeUserClientMock({ listResult: { data: [], error: null } });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await listDealProducts(DEAL_ID);
    expect(mock.fromMock).toHaveBeenCalledWith("deal_products");
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("maps product join", async () => {
    const mock = makeUserClientMock({
      listResult: {
        data: [
          {
            id: DP_ID,
            deal_id: DEAL_ID,
            product_id: PRODUCT_ID,
            price: 100,
            quantity: 2,
            notes: null,
            created_at: "2026-06-09T00:00:00Z",
            products: { name: "Foo", status: "active", category: "Cat" },
          },
        ],
        error: null,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await listDealProducts(DEAL_ID);
    expect(result).toHaveLength(1);
    expect(result[0].product_name).toBe("Foo");
    expect(result[0].product_status).toBe("active");
    expect(result[0].product_category).toBe("Cat");
  });
});

describe("assignProduct (write via User-Client, RLS Klasse-C)", () => {
  it("returns error when unauthenticated", async () => {
    const mock = makeUserClientMock({ unauthenticated: true });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await assignProduct(DEAL_ID, PRODUCT_ID);
    expect(result.error).toMatch(/Nicht authentifiziert/);
  });

  it("translates 23505 duplicate-key to friendly msg", async () => {
    const mock = makeUserClientMock({
      insertError: { code: "23505", message: "duplicate" },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await assignProduct(DEAL_ID, PRODUCT_ID);
    expect(result.error).toMatch(/bereits zugeordnet/);
  });

  it("happy path: User-Client INSERT (no admin)", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await assignProduct(DEAL_ID, PRODUCT_ID, 99, 3);
    expect(result.error).toBeUndefined();
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0].payload).toMatchObject({
      deal_id: DEAL_ID,
      product_id: PRODUCT_ID,
      price: 99,
      quantity: 3,
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("updateDealProduct (write via User-Client, RLS Klasse-C)", () => {
  it("happy path", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await updateDealProduct(DP_ID, DEAL_ID, { price: 200 });
    expect(result.error).toBeUndefined();
    expect(mock.updates).toHaveLength(1);
    expect(mock.updates[0].id).toBe(DP_ID);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("propagates error", async () => {
    const mock = makeUserClientMock({
      updateError: { message: "rls violation" },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await updateDealProduct(DP_ID, DEAL_ID, { price: 200 });
    expect(result.error).toMatch(/rls violation/);
  });
});

describe("removeProduct (write via User-Client, RLS Klasse-C)", () => {
  it("happy path", async () => {
    const mock = makeUserClientMock({});
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await removeProduct(DP_ID, DEAL_ID);
    expect(result.error).toBeUndefined();
    expect(mock.deletes).toHaveLength(1);
    expect(mock.deletes[0].id).toBe(DP_ID);
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});
