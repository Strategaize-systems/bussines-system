import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";
import {
  runWithReadOnlyContext,
  getReadOnlyContext,
  assertNotReadOnlyContext,
} from "./read-only-context";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

const mockHeaders = (record: Record<string, string>) => {
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => record[name] ?? record[name.toLowerCase()] ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe("read-only-context", () => {
  beforeEach(() => {
    vi.mocked(headers).mockReset();
    // Default: keine Headers gesetzt — Layer 2 ist NoOp.
    mockHeaders({});
  });

  it("returns null when no context is active", () => {
    expect(getReadOnlyContext()).toBeNull();
  });

  it("propagates value through sync callback", () => {
    const captured = runWithReadOnlyContext(
      { viewerUserId: "viewer-1", targetUserId: "target-1" },
      () => getReadOnlyContext(),
    );
    expect(captured).toEqual({ viewerUserId: "viewer-1", targetUserId: "target-1" });
  });

  it("propagates value through async callback with awaits", async () => {
    const captured = await runWithReadOnlyContext(
      { viewerUserId: "viewer-2", targetUserId: "target-2" },
      async () => {
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 1));
        return getReadOnlyContext();
      },
    );
    expect(captured).toEqual({ viewerUserId: "viewer-2", targetUserId: "target-2" });
  });

  it("returns null again after the callback completes", () => {
    runWithReadOnlyContext({ viewerUserId: "v", targetUserId: "t" }, () => undefined);
    expect(getReadOnlyContext()).toBeNull();
  });

  it("assertNotReadOnlyContext is a no-op when no context active", async () => {
    await expect(assertNotReadOnlyContext()).resolves.toBeUndefined();
  });

  it("assertNotReadOnlyContext throws inside an active context", async () => {
    await runWithReadOnlyContext(
      { viewerUserId: "v", targetUserId: "t" },
      async () => {
        await expect(assertNotReadOnlyContext()).rejects.toThrow(/Mutation blocked/);
      },
    );
  });

  it("does not leak context across parallel invocations", async () => {
    const a = runWithReadOnlyContext({ viewerUserId: "a-v", targetUserId: "a-t" }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return getReadOnlyContext();
    });
    const b = runWithReadOnlyContext({ viewerUserId: "b-v", targetUserId: "b-t" }, async () => {
      await new Promise((r) => setTimeout(r, 2));
      return getReadOnlyContext();
    });
    const [aCtx, bCtx] = await Promise.all([a, b]);
    expect(aCtx?.viewerUserId).toBe("a-v");
    expect(bCtx?.viewerUserId).toBe("b-v");
  });
});

/**
 * SLC-751 MT-4 — 4 Permutations fuer Defense-in-Depth (DEC-210).
 *
 * | Case | ALS  | Header | Expected            |
 * |------|------|--------|---------------------|
 * |  1   | off  | "1"    | throws (Layer 2)    |
 * |  2   | off  | none   | passes              |
 * |  3   | on   | none   | throws (Layer 1)    |
 * |  4   | on   | "1"    | throws (Layer 1)    |
 */
describe("assertNotReadOnlyContext — Defense-in-Depth (SLC-751)", () => {
  beforeEach(() => {
    vi.mocked(headers).mockReset();
  });

  it("Case 1: header=1, no ALS → throws via Layer 2", async () => {
    mockHeaders({ "X-Read-Only-Mode": "1" });
    await expect(assertNotReadOnlyContext()).rejects.toThrow(
      /X-Read-Only-Mode header set by middleware/,
    );
  });

  it("Case 2: no header, no ALS → passes", async () => {
    mockHeaders({});
    await expect(assertNotReadOnlyContext()).resolves.toBeUndefined();
  });

  it("Case 3: ALS active, no header → throws via Layer 1", async () => {
    mockHeaders({});
    await runWithReadOnlyContext(
      { viewerUserId: "v3", targetUserId: "t3" },
      async () => {
        await expect(assertNotReadOnlyContext()).rejects.toThrow(
          /viewer=v3, target=t3/,
        );
      },
    );
  });

  it("Case 4: ALS active + header=1 → throws via Layer 1 first (short-circuit)", async () => {
    mockHeaders({ "X-Read-Only-Mode": "1" });
    await runWithReadOnlyContext(
      { viewerUserId: "v4", targetUserId: "t4" },
      async () => {
        // Layer 1 short-circuits — error message comes from Layer 1, not Layer 2.
        await expect(assertNotReadOnlyContext()).rejects.toThrow(
          /viewer=v4, target=t4/,
        );
      },
    );
  });
});
