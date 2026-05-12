import { describe, it, expect } from "vitest";
import {
  runWithReadOnlyContext,
  getReadOnlyContext,
  assertNotReadOnlyContext,
} from "./read-only-context";

describe("read-only-context", () => {
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

  it("assertNotReadOnlyContext is a no-op when no context active", () => {
    expect(() => assertNotReadOnlyContext()).not.toThrow();
  });

  it("assertNotReadOnlyContext throws inside an active context", () => {
    runWithReadOnlyContext({ viewerUserId: "v", targetUserId: "t" }, () => {
      expect(() => assertNotReadOnlyContext()).toThrow(/Mutation blocked/);
    });
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
