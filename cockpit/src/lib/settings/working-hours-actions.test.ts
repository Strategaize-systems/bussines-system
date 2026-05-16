// SLC-713 MT-2 — Defense-in-Depth-Guard fuer `updateWorkingHoursSettings`.
//
// Verifiziert dass die Server-Action im aktiven Read-Only-Context throwed
// bevor Supabase-Client oder Validation-Helper aufgerufen werden.
// Pattern: DEC-189 / DEC-201, analog zu SLC-706 MT-6 Mutate-Lockdown-Tests.

import { describe, it, expect, vi } from "vitest";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

const createClientMock = vi.fn();
const validateWorkingHoursMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("./working-hours-validation", () => ({
  validateWorkingHours: validateWorkingHoursMock,
}));

describe("SLC-713 MT-2 — updateWorkingHoursSettings Read-Only-Context Guard", () => {
  it("throws when read-only context is active", async () => {
    const { updateWorkingHoursSettings } = await import("./working-hours-actions");

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "teamlead-uuid", targetUserId: "member-uuid" },
        async () =>
          updateWorkingHoursSettings({
            start: "09:00",
            end: "17:00",
          }),
      ),
    ).rejects.toThrow(/Mutation blocked: read-only context active/);

    // AC3 — keine echte DB-Mutation und keine Validation-Auswertung.
    expect(createClientMock).not.toHaveBeenCalled();
    expect(validateWorkingHoursMock).not.toHaveBeenCalled();
  });
});
