// V7.5 SLC-752 MT-3 — Sculptor-Schema Tests.
//
// 20 LLM-Output-Variationen: 10 valide, 5 drifted (Extra-Keys), 5 malformed
// (Wrong-Types/Missing-Keys). Validiert SculptSuccessSchema, SculptRejectSchema
// und den parseSculptOutput-Convenience-Helper.

import { describe, it, expect } from "vitest";
import {
  ActionSchema,
  ConditionSchema,
  SculptRejectSchema,
  SculptSuccessSchema,
  parseSculptOutput,
} from "../sculptor-schema";

// RFC 4122 v4-compliant test UUIDs (zod .uuid() prueft Version+Variant-Bits).
const UUID = "11111111-2222-4333-8444-555555555555";
const TEMPLATE_UUID = "aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee";

// ============================================================================
// 10 valide Sculpt-Success-Outputs
// ============================================================================

describe("SculptSuccessSchema — 10 valide LLM-Outputs", () => {
  it("V1: stage_changed -> create_task (Standard Follow-up)", () => {
    const out = {
      name: "Angebot-Follow-up in 2 Tagen",
      description: "Erinnerung Standard-Sales-Prozess",
      trigger_event: "deal.stage_changed",
      trigger_config: { stage_id: UUID },
      conditions: [],
      actions: [
        {
          type: "create_task",
          params: { title: "Follow-up Angebot", due_in_days: 2, assignee: "deal_owner" },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V2: deal.created -> send_email_template (Welcome-Mail)", () => {
    const out = {
      name: "Welcome-Mail neuer Deal",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "send_email_template",
          params: { template_id: TEMPLATE_UUID, mode: "draft" },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V3: activity.created -> update_field (Tags-Anreicherung)", () => {
    const out = {
      name: "Anreicherung Lead-Tags",
      trigger_event: "activity.created",
      trigger_config: { activity_types: ["call"] },
      conditions: [{ field: "type", op: "eq", value: "call" }],
      actions: [
        {
          type: "update_field",
          params: { entity: "contact", field: "tags", value: ["aktiver-lead"] },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V4: stage_changed -> create_activity (Note)", () => {
    const out = {
      name: "Auto-Note bei Stage-Wechsel",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "create_activity",
          params: { type: "note", title: "Deal in neuer Stage", description: "Auto-generiert." },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V5: Multi-Action (create_task + send_email_template)", () => {
    const out = {
      name: "Doppel-Aktion Pre-Sale",
      trigger_event: "deal.stage_changed",
      trigger_config: { stage_id: UUID },
      conditions: [],
      actions: [
        { type: "create_task", params: { title: "Vorbereitung", due_in_days: 1 } },
        { type: "send_email_template", params: { template_id: TEMPLATE_UUID, mode: "direct" } },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V6: Mit Bedingung (deal value > 10000)", () => {
    const out = {
      name: "VIP-Deal Eskalation",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [{ field: "value", op: "gt", value: 10000 }],
      actions: [
        { type: "create_task", params: { title: "VIP-Pruefung", due_in_days: 0 } },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V7: update_field auf deal.value (Whitelisted)", () => {
    const out = {
      name: "Value-Reset bei Lost",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [{ field: "status", op: "eq", value: "lost" }],
      actions: [
        {
          type: "update_field",
          params: { entity: "deal", field: "value", value: 0 },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V8: update_field auf deal.expected_close_date (Whitelisted)", () => {
    const out = {
      name: "Auto-Close-Date Verlaengerung",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "update_field",
          params: {
            entity: "deal",
            field: "expected_close_date",
            value: "2026-12-31",
          },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V9: Assignee als UUID (Spezifischer User)", () => {
    const out = {
      name: "Aufgabe an Sales-Lead",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "create_task",
          params: {
            title: "Erst-Sichtung",
            due_in_days: 1,
            assignee: { uuid: UUID },
          },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });

  it("V10: Beschreibung als null statt undefined", () => {
    const out = {
      name: "Null-Description",
      description: null,
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(true);
  });
});

// ============================================================================
// 5 drifted Outputs (zod-strict rejects Extra-Keys)
// ============================================================================

describe("SculptSuccessSchema — 5 drifted/extra-key Outputs", () => {
  it("D1: Top-Level Extra-Key 'priority' -> reject", () => {
    const out = {
      name: "Drift-1",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
      priority: "high",
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("D2: Action-Params Extra-Key 'urgent' -> reject", () => {
    const out = {
      name: "Drift-2",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "create_task",
          params: { title: "X", due_in_days: 1, urgent: true },
        },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("D3: trigger_config Extra-Key -> reject", () => {
    const out = {
      name: "Drift-3",
      trigger_event: "deal.stage_changed",
      trigger_config: { stage_id: UUID, deal_type: "B2B" },
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("D4: update_field auf PII-Feld 'email' -> reject via Whitelist-Check", () => {
    const out = {
      name: "Drift-4",
      trigger_event: "activity.created",
      trigger_config: {},
      conditions: [],
      actions: [
        {
          type: "update_field",
          params: { entity: "contact", field: "email", value: "x@y.com" },
        },
      ],
    };
    const r = SculptSuccessSchema.safeParse(out);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.message).toMatch(/Whitelist/);
    }
  });

  it("D5: Action-Type 'auto_winloss_extract' (System-Only) -> reject", () => {
    const out = {
      name: "Drift-5",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        { type: "auto_winloss_extract", params: {} },
      ],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });
});

// ============================================================================
// 5 malformed Outputs (wrong types, missing keys)
// ============================================================================

describe("SculptSuccessSchema — 5 malformed Outputs", () => {
  it("M1: Missing 'name' -> reject", () => {
    const out = {
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("M2: trigger_event 'unknown.event' -> reject", () => {
    const out = {
      name: "M2",
      trigger_event: "unknown.event",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("M3: actions als String statt Array -> reject", () => {
    const out = {
      name: "M3",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: "create_task",
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("M4: conditions[].op 'unknown_op' -> reject", () => {
    const out = {
      name: "M4",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [{ field: "stage_id", op: "matches", value: "x" }],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });

  it("M5: actions=[] (empty) -> reject (min(1))", () => {
    const out = {
      name: "M5",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [],
    };
    expect(SculptSuccessSchema.safeParse(out).success).toBe(false);
  });
});

// ============================================================================
// SculptRejectSchema Tests
// ============================================================================

describe("SculptRejectSchema", () => {
  it("akzeptiert valides Reject-Payload", () => {
    const out = {
      reject_reason: "out_of_domain",
      explanation:
        "Externe API-Call ist kein Workflow-Trigger im V6.2-Engine — bitte als Cron-Job mit Webhook implementieren.",
    };
    expect(SculptRejectSchema.safeParse(out).success).toBe(true);
  });

  it("rejected falsches reject_reason", () => {
    const out = { reject_reason: "other", explanation: "Reicht nicht" };
    expect(SculptRejectSchema.safeParse(out).success).toBe(false);
  });

  it("rejected zu kurze explanation (<5)", () => {
    const out = { reject_reason: "out_of_domain", explanation: "Ein" };
    expect(SculptRejectSchema.safeParse(out).success).toBe(false);
  });
});

// ============================================================================
// parseSculptOutput Convenience
// ============================================================================

describe("parseSculptOutput", () => {
  it("returnt success-Variant fuer valides Success-Payload", () => {
    const out = {
      name: "OK Standard Task",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const parsed = parseSculptOutput(out);
    expect(parsed.kind).toBe("success");
    if (parsed.kind === "success") {
      expect(parsed.data.name).toBe("OK Standard Task");
    }
  });

  it("returnt reject-Variant fuer valides Reject-Payload", () => {
    const out = {
      reject_reason: "out_of_domain",
      explanation: "Out of scope wegen externer Integration.",
    };
    const parsed = parseSculptOutput(out);
    expect(parsed.kind).toBe("reject");
  });

  it("returnt invalid-Variant mit beiden Error-Sets fuer Garbage", () => {
    const parsed = parseSculptOutput({ random: "junk" });
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind === "invalid") {
      expect(parsed.successErrors.length).toBeGreaterThan(0);
      expect(parsed.rejectErrors.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// ConditionSchema + ActionSchema standalone (Pure-Function-Probe)
// ============================================================================

describe("Standalone Schemas", () => {
  it("ConditionSchema akzeptiert min-shape", () => {
    expect(
      ConditionSchema.safeParse({ field: "value", op: "gt", value: 1000 }).success
    ).toBe(true);
  });

  it("ActionSchema rejected unbekanntes Action-Type", () => {
    expect(
      ActionSchema.safeParse({ type: "send_sms", params: {} }).success
    ).toBe(false);
  });
});
