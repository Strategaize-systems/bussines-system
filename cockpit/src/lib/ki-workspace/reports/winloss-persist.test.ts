// SLC-713 MT-2 — Defense-in-Depth-Guard fuer `persistManualRun`.
//
// Verifiziert dass die persist-Helper im aktiven Read-Only-Context throwed
// bevor createAdminClient oder DB-INSERT aufgerufen werden.
// Pattern: DEC-189 / DEC-201, analog zu SLC-706 MT-6 Mutate-Lockdown-Tests.

import { describe, it, expect, vi } from "vitest";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

const createAdminClientMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

describe("SLC-713 MT-2 — persistManualRun Read-Only-Context Guard", () => {
  it("throws when read-only context is active", async () => {
    const { persistManualRun } = await import("./winloss-persist");

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "teamlead-uuid", targetUserId: "member-uuid" },
        async () =>
          persistManualRun({
            dealId: "deal-uuid",
            userId: "member-uuid",
            markdown: "x",
            model: "x",
            completedAt: new Date().toISOString(),
          }),
      ),
    ).rejects.toThrow(/Mutation blocked: read-only context active/);

    // AC3 — keine echte DB-Mutation: Admin-Client darf im Read-Only-Pfad
    // nicht aufgerufen werden (Guard ist first line).
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
