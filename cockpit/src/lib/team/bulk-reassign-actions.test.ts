// SLC-713 MT-2 — Defense-in-Depth-Guard fuer `bulkReassignApply`.
//
// Verifiziert dass die Server-Action im aktiven Read-Only-Context throwed
// bevor irgendwelche DB-Connections oder Audit-Helpers aufgerufen werden.
// Pattern: DEC-189 / DEC-201, analog zu SLC-706 MT-6 Mutate-Lockdown-Tests.

import { describe, it, expect, vi } from "vitest";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

const getPgClientMock = vi.fn();
const getProfileMock = vi.fn();

vi.mock("@/lib/db/pg", () => ({
  getPgClient: getPgClientMock,
}));

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: getProfileMock,
}));

describe("SLC-713 MT-2 — bulkReassignApply Read-Only-Context Guard", () => {
  it("throws when read-only context is active", async () => {
    const { bulkReassignApply } = await import("./bulk-reassign-actions");

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "teamlead-uuid", targetUserId: "member-uuid" },
        async () =>
          bulkReassignApply({
            from: "00000000-0000-0000-0000-000000000001",
            to: "00000000-0000-0000-0000-000000000002",
          }),
      ),
    ).rejects.toThrow(/Mutation blocked: read-only context active/);

    // AC3 — keine echte DB-Mutation: weder pg-Client noch getProfile darf
    // im Read-Only-Pfad jemals aufgerufen werden (Guard ist first line).
    expect(getPgClientMock).not.toHaveBeenCalled();
    expect(getProfileMock).not.toHaveBeenCalled();
  });
});
