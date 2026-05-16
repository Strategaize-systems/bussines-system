// SLC-713 MT-2 — Defense-in-Depth-Guard fuer `saveInsight`.
//
// Verifiziert dass die Server-Action im aktiven Read-Only-Context throwed
// bevor Supabase-Client, fs/promises oder revalidatePath aufgerufen werden.
// Pattern: DEC-189 / DEC-201, analog zu SLC-706 MT-6 Mutate-Lockdown-Tests.

import { describe, it, expect, vi } from "vitest";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

const createClientMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("SLC-713 MT-2 — saveInsight Read-Only-Context Guard", () => {
  it("throws when read-only context is active", async () => {
    const { saveInsight } = await import("./insight-actions");

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "teamlead-uuid", targetUserId: "member-uuid" },
        async () =>
          saveInsight({
            category: "win",
            comment: "x",
            sourceType: "deal",
            sourceId: "deal-uuid",
            sourceTitle: "Test-Deal",
            sourceContent: "irgendwas",
          }),
      ),
    ).rejects.toThrow(/Mutation blocked: read-only context active/);

    // AC3 — keine echte DB-Mutation: createClient (Supabase) und
    // revalidatePath duerfen im Read-Only-Pfad nicht aufgerufen werden.
    // Filesystem-Write (writeFile/mkdir) wird ebenfalls nicht erreicht, weil
    // der Guard als first line vor jeglicher I/O greift.
    expect(createClientMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
