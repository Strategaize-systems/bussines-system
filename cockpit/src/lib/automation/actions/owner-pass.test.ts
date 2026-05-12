import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeCreateTask } from "./create_task";
import { executeCreateActivity } from "./create_activity";
import type { ActionExecutionContext } from "./types";

/**
 * V7 SLC-704 MT-6 — Workflow-Engine-Owner-Pass.
 *
 * Verifiziert dass `executeCreateTask` und `executeCreateActivity` den
 * `entity.ownerUserId`-Wert (= triggerSource.owner_user_id, DEC-185) in
 * den activities-INSERT durchreichen. NULL-Fallback fuer System-Records.
 */

interface InsertCapture {
  payload: Record<string, unknown> | null;
}

function makeStubSupabase(capture: InsertCapture): SupabaseClient {
  return {
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        capture.payload = payload;
        return {
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "act-id" }, error: null }),
          }),
        };
      },
    }),
  } as unknown as SupabaseClient;
}

describe("V7 SLC-704 — Workflow-Engine Owner-Pass", () => {
  describe("executeCreateTask", () => {
    it("setzt owner_user_id aus entity.ownerUserId", async () => {
      const capture: InsertCapture = { payload: null };
      const context: ActionExecutionContext = {
        supabase: makeStubSupabase(capture),
        rule: { id: "rule-1", name: "TestRule" },
        entity: {
          type: "deal",
          id: "deal-1",
          data: { owner_id: "u1", created_by: "u2" },
          contactId: "c1",
          companyId: "co1",
          dealId: "deal-1",
          ownerUserId: "owner-abc",
        },
        actionIndex: 0,
        triggerEventAuditId: null,
        triggerUserId: "u1",
      };

      const result = await executeCreateTask(context, {
        title: "Tu was",
        assignee: "trigger_user",
        due_in_days: 3,
      } as never);

      expect(result.outcome).toBe("success");
      expect(capture.payload).not.toBeNull();
      expect(capture.payload?.owner_user_id).toBe("owner-abc");
    });

    it("setzt owner_user_id = null wenn entity.ownerUserId NULL (System-Record)", async () => {
      const capture: InsertCapture = { payload: null };
      const context: ActionExecutionContext = {
        supabase: makeStubSupabase(capture),
        rule: { id: "rule-2", name: "TestRule-System" },
        entity: {
          type: "activity",
          id: "act-source",
          data: { type: "note" },
          contactId: null,
          companyId: null,
          dealId: null,
          ownerUserId: null,
        },
        actionIndex: 1,
        triggerEventAuditId: null,
        triggerUserId: null,
      };

      const result = await executeCreateTask(context, {
        title: "System-Action",
        assignee: { uuid: "00000000-0000-0000-0000-000000000xxx" },
      } as never);

      expect(result.outcome).toBe("success");
      expect(capture.payload?.owner_user_id).toBeNull();
    });
  });

  describe("executeCreateActivity", () => {
    it("setzt owner_user_id aus entity.ownerUserId", async () => {
      const capture: InsertCapture = { payload: null };
      const context: ActionExecutionContext = {
        supabase: makeStubSupabase(capture),
        rule: { id: "rule-3", name: "TestRule-Activity" },
        entity: {
          type: "deal",
          id: "deal-2",
          data: { title: "Deal-Title" },
          contactId: "c2",
          companyId: "co2",
          dealId: "deal-2",
          ownerUserId: "owner-xyz",
        },
        actionIndex: 0,
        triggerEventAuditId: null,
        triggerUserId: "u-trigger",
      };

      const result = await executeCreateActivity(context, {
        type: "note",
        title: "Auto-Notiz",
        description: "Trigger durch Rule",
      } as never);

      expect(result.outcome).toBe("success");
      expect(capture.payload?.owner_user_id).toBe("owner-xyz");
      expect(capture.payload?.deal_id).toBe("deal-2");
    });

    it("setzt owner_user_id = null bei System-Source", async () => {
      const capture: InsertCapture = { payload: null };
      const context: ActionExecutionContext = {
        supabase: makeStubSupabase(capture),
        rule: { id: "rule-4", name: "TestRule-NullOwner" },
        entity: {
          type: "activity",
          id: "act-src",
          data: {},
          contactId: null,
          companyId: null,
          dealId: null,
          ownerUserId: null,
        },
        actionIndex: 0,
        triggerEventAuditId: null,
        triggerUserId: null,
      };

      const result = await executeCreateActivity(context, {
        type: "note",
        title: "System-Activity",
      } as never);

      expect(result.outcome).toBe("success");
      expect(capture.payload?.owner_user_id).toBeNull();
    });
  });
});
