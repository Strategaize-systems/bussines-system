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

const {
  listProducts,
  createProduct,
  updateProduct,
  archiveProduct,
} = await import("./products");
const { assertRole } = await import("@/lib/auth/assert-role");
const { createClient } = await import("@/lib/supabase/server");
const { createAdminClient } = await import("@/lib/supabase/admin");

const ADMIN_PROFILE: Profile = {
  user_id: "55555555-5555-5555-5555-555555555555",
  role: "admin",
  team_id: "11111111-1111-1111-1111-111111111111",
  display_name: "Admin",
};

function makeUserClientMock() {
  const orderResult = vi.fn().mockResolvedValue({
    data: [{ id: "p1", name: "Product A" }],
    error: null,
  });
  const finalOrder = {
    then: (cb: (v: { data: unknown; error: unknown }) => unknown) =>
      orderResult().then(cb),
    eq: vi.fn(() => orderResult()),
  };
  const select = vi.fn(() => ({ order: vi.fn(() => finalOrder) }));
  const from = vi.fn(() => ({ select }));
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: ADMIN_PROFILE.user_id } },
  });
  return {
    client: { from, auth: { getUser } },
    from,
    select,
    orderResult,
  };
}

function makeAdminMock(opts: {
  insertError?: string;
  updateError?: string;
  insertedRow?: Record<string, unknown>;
  updatedRow?: Record<string, unknown>;
}) {
  const insertCalls: Array<{ table: string; payload: unknown }> = [];
  const updateCalls: Array<{ table: string; payload: unknown; id?: unknown }> = [];

  const fromMock = vi.fn((table: string) => ({
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return {
        select: () => ({
          single: () =>
            Promise.resolve({
              data: opts.insertedRow ?? { id: "new-id", ...((payload as object) ?? {}) },
              error: opts.insertError ? { message: opts.insertError } : null,
            }),
        }),
      };
    },
    update: (payload: unknown) => ({
      eq: (_col: string, val: unknown) => {
        updateCalls.push({ table, payload, id: val });
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: opts.updatedRow ?? { id: val, ...((payload as object) ?? {}) },
                error: opts.updateError ? { message: opts.updateError } : null,
              }),
          }),
          // archiveProduct does not chain .select().single()
          then: (cb: (v: { error: unknown }) => unknown) =>
            Promise.resolve({
              error: opts.updateError ? { message: opts.updateError } : null,
            }).then(cb),
        };
      },
    }),
  }));

  return { client: { from: fromMock }, insertCalls, updateCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listProducts (read via User-Client)", () => {
  it("returns [] when no auth user", async () => {
    const userMock = makeUserClientMock();
    userMock.client.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null } });
    vi.mocked(createClient).mockResolvedValue(userMock.client as never);

    const result = await listProducts();
    expect(result).toEqual([]);
    // assertRole NOT called for reads (per ISSUE-090 Klasse-B SELECT USING(true))
    expect(vi.mocked(assertRole)).not.toHaveBeenCalled();
  });

  it("queries User-Client (not admin) for read", async () => {
    const userMock = makeUserClientMock();
    vi.mocked(createClient).mockResolvedValue(userMock.client as never);

    await listProducts();
    expect(userMock.from).toHaveBeenCalledWith("products");
    // admin client must NOT be used for reads
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });
});

describe("createProduct (write, assertRole-gated)", () => {
  it("redirects member (assertRole throws)", async () => {
    vi.mocked(assertRole).mockRejectedValue(
      new Error("NEXT_REDIRECT:/mein-tag"),
    );
    await expect(
      createProduct({ name: "Foo" }),
    ).rejects.toThrow("NEXT_REDIRECT:/mein-tag");
  });

  it("rejects empty name (after assertRole admin pass)", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const adminMock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const result = await createProduct({ name: "  " });
    expect(result.error).toMatch(/Name/);
    // No INSERT happened
    expect(adminMock.insertCalls.length).toBe(0);
  });

  it("admin INSERTs product with created_by=profile.user_id", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const adminMock = makeAdminMock({
      insertedRow: {
        id: "new-product",
        name: "Pro",
        created_by: ADMIN_PROFILE.user_id,
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const result = await createProduct({ name: "Pro" });
    expect(result.product).toBeDefined();
    expect(adminMock.insertCalls).toHaveLength(1);
    expect(adminMock.insertCalls[0].table).toBe("products");
    expect(adminMock.insertCalls[0].payload).toMatchObject({
      name: "Pro",
      created_by: ADMIN_PROFILE.user_id,
    });
  });
});

describe("updateProduct (write, assertRole-gated)", () => {
  it("redirects member", async () => {
    vi.mocked(assertRole).mockRejectedValue(
      new Error("NEXT_REDIRECT:/mein-tag"),
    );
    await expect(
      updateProduct({ id: "p1", name: "New" }),
    ).rejects.toThrow("NEXT_REDIRECT:/mein-tag");
  });

  it("admin UPDATEs product", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const adminMock = makeAdminMock({
      updatedRow: { id: "p1", name: "New" },
    });
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const result = await updateProduct({ id: "p1", name: "New" });
    expect(result.product).toBeDefined();
    expect(adminMock.updateCalls).toHaveLength(1);
    expect(adminMock.updateCalls[0].id).toBe("p1");
  });
});

describe("archiveProduct (write, assertRole-gated)", () => {
  it("redirects member", async () => {
    vi.mocked(assertRole).mockRejectedValue(
      new Error("NEXT_REDIRECT:/mein-tag"),
    );
    await expect(archiveProduct("p1")).rejects.toThrow(
      "NEXT_REDIRECT:/mein-tag",
    );
  });

  it("admin archives product", async () => {
    vi.mocked(assertRole).mockResolvedValue(ADMIN_PROFILE);
    const adminMock = makeAdminMock({});
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    const result = await archiveProduct("p1");
    expect(result.error).toBeUndefined();
    expect(adminMock.updateCalls).toHaveLength(1);
    expect(adminMock.updateCalls[0].payload).toMatchObject({
      status: "archived",
    });
  });
});
