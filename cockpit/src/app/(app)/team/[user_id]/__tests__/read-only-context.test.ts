// SLC-706 MT-6 — Mutate-Lockdown im Drilldown-Kontext
//
// Verifiziert dass real existierende Mutate-Server-Actions, die durch SLC-704
// mit `assertNotReadOnlyContext()` versehen wurden, im Drilldown-Kontext
// blockiert werden. Wir importieren die Server-Action-Module + rufen die
// erste Function unter einem aktiven Read-Only-Context auf.
//
// Hinweis: Die Server-Actions sind als "use server"-Modul markiert. In einer
// Test-Umgebung darf Vitest sie direkt importieren — der "use server"-Marker
// ist runtime-relevant fuer Next.js, nicht fuer Node-Test-Imports.

import { describe, it, expect, vi } from "vitest";
import { runWithReadOnlyContext } from "@/lib/auth/read-only-context";

// Pure-Mock fuer den Supabase-Client und verwandte Module: wir wollen NUR
// pruefen dass assertNotReadOnlyContext() vor irgendwelchen DB-Calls throws.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/get-profile", () => ({
  getProfile: vi.fn().mockResolvedValue({
    user_id: "viewer-uuid",
    role: "teamlead",
    team_id: "team-uuid",
    display_name: "Teamlead",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("SLC-706 MT-6 — Mutate-Lockdown im Drilldown-Kontext", () => {
  it("completeTaskFromMeinTag throws im Read-Only-Context", async () => {
    const { completeTaskFromMeinTag } = await import(
      "@/app/(app)/mein-tag/actions"
    );

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "viewer-uuid", targetUserId: "target-uuid" },
        async () => completeTaskFromMeinTag("task-id-1"),
      ),
    ).rejects.toThrow(/Mutation blocked/);
  });

  it("completeDealActionFromMeinTag throws im Read-Only-Context", async () => {
    const { completeDealActionFromMeinTag } = await import(
      "@/app/(app)/mein-tag/actions"
    );

    await expect(
      runWithReadOnlyContext(
        { viewerUserId: "viewer-uuid", targetUserId: "target-uuid" },
        async () => completeDealActionFromMeinTag("deal-id-1"),
      ),
    ).rejects.toThrow(/Mutation blocked/);
  });

  it("Mutate-Actions laufen NORMAL durch wenn kein Read-Only-Context aktiv", async () => {
    // Sanity-Check: ohne Context wird der Guard nicht greifen — die Function
    // koennte aufgrund der Supabase-Mocks zwar selbst einen anderen Fehler
    // werfen (z.B. weil Mock-from() undefined returnt), aber NICHT
    // `Mutation blocked`. Wir spiegeln das exakt: error-Message darf NICHT
    // dem Read-Only-Pattern entsprechen.
    const { completeTaskFromMeinTag } = await import(
      "@/app/(app)/mein-tag/actions"
    );

    try {
      await completeTaskFromMeinTag("task-id-1");
    } catch (e) {
      // Falls geworfen wird, darf es NICHT der Read-Only-Guard sein.
      expect((e as Error).message).not.toMatch(/Mutation blocked/);
    }
  });
});
