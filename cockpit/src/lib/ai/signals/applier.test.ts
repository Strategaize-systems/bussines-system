import { describe, it, expect, vi } from "vitest";
import { applyProposedChange } from "./applier";
import type { AIActionQueueItem } from "@/types/ai-queue";

// V8.15 SLC-913 MT-2 (ISSUE-117): Applier nutzt den durchgereichten
// (User-)Client statt intern createAdminClient() — deal-UPDATEs laufen
// RLS-scoped. Kein @/lib/supabase/admin-Import mehr in applier.ts.

type Op = { kind: "select" | "update"; table: string; payload?: unknown };

function makeClientMock(opts: {
  stage?: { id: string; name: string } | null;
  updateError?: { message: string } | null;
}) {
  const ops: Op[] = [];

  const fromMock = vi.fn((table: string) => ({
    select: () => {
      ops.push({ kind: "select", table });
      return {
        ilike: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: opts.stage ?? null, error: null }),
        }),
      };
    },
    update: (payload: unknown) => {
      ops.push({ kind: "update", table, payload });
      return {
        eq: () => Promise.resolve({ error: opts.updateError ?? null }),
      };
    },
  }));

  return { client: { from: fromMock } as never, ops, fromMock };
}

function makeItem(overrides: Partial<AIActionQueueItem>): AIActionQueueItem {
  return {
    id: "q-1",
    type: "value_change",
    proposed_changes: { field: "value", old: "1000", new: "2000" },
    target_entity_type: "deal",
    target_entity_id: "deal-1",
    ...overrides,
  } as AIActionQueueItem;
}

describe("applyProposedChange (ISSUE-117: Client wird durchgereicht)", () => {
  it("value_change: updates deals via the GIVEN client", async () => {
    const mock = makeClientMock({});
    const result = await applyProposedChange(makeItem({}), mock.client);

    expect(result.success).toBe(true);
    expect(mock.fromMock).toHaveBeenCalledWith("deals");
    const update = mock.ops.find((o) => o.kind === "update" && o.table === "deals");
    expect(update).toBeDefined();
    expect((update as { payload: { value: number } }).payload.value).toBe(2000);
  });

  it("status_change: looks up pipeline_stages via the GIVEN client", async () => {
    const mock = makeClientMock({ stage: { id: "stage-2", name: "Angebot" } });
    const result = await applyProposedChange(
      makeItem({
        type: "status_change",
        proposed_changes: { field: "stage", old: "Lead", new: "Angebot" },
      }),
      mock.client,
    );

    expect(result.success).toBe(true);
    expect(mock.fromMock).toHaveBeenCalledWith("pipeline_stages");
    expect(mock.fromMock).toHaveBeenCalledWith("deals");
  });

  it("RLS-blocked update (wrong owner) -> update_failed, kein Erfolg", async () => {
    const mock = makeClientMock({
      updateError: { message: "no rows / RLS" },
    });
    const result = await applyProposedChange(makeItem({}), mock.client);

    expect(result.success).toBe(false);
    expect(result.applied).toBe("update_failed");
  });

  it("missing target -> no_change ohne Client-Zugriff", async () => {
    const mock = makeClientMock({});
    const result = await applyProposedChange(
      makeItem({ proposed_changes: null as never }),
      mock.client,
    );

    expect(result.success).toBe(false);
    expect(result.applied).toBe("no_change");
    expect(mock.fromMock).not.toHaveBeenCalled();
  });

  it("applier.ts importiert kein @/lib/supabase/admin mehr (statisch)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/ai/signals/applier.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/from\s+"@\/lib\/supabase\/admin"/);
  });
});
