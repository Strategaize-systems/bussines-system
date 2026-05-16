// V7.5 SLC-752 MT-6 — Sculptor-Core Tests.
//
// Mock-Bedrock-Strategie (Architecture-Standard, siehe slice-spec Open Points).
// Real-Bedrock-Test wird in /qa Live-Smoke abgedeckt — hier nur deterministische
// Pure-Function-Probes des Re-Prompt-Loops, Audit-Insert-Side-Effects, Cost-
// Akkumulation und 8 Real-World-Prompt-Mappings.

import { describe, it, expect } from "vitest";
import type { LLMResponse } from "@/lib/ai/types";
import {
  type SculptAuditInsertRow,
  type SculptDeps,
  type SculptResult,
  sculptRule,
} from "../sculptor";

const USER_ID = "00000000-0000-4000-9000-000000000099";
const TEMPLATE_UUID = "00000000-0000-4000-8000-000000000000";

// ---------------------------------------------------------------------------
// Mock-Bedrock-Response-Helper
// ---------------------------------------------------------------------------

function bedrockSuccess(text: string, modelId = "test-model-id"): LLMResponse<string> {
  return {
    success: true,
    data: text,
    error: null,
    raw: text,
    usage: { input_tokens: 1000, output_tokens: 500 },
    modelId,
  };
}

function bedrockInfraFail(error: string): LLMResponse<string> {
  return { success: false, data: null, error };
}

interface CapturedAudit {
  rows: SculptAuditInsertRow[];
}

interface ScriptedInvoker {
  invoke: SculptDeps["invoke"];
  callCount: () => number;
}

function scriptedInvoker(responses: Array<LLMResponse<string> | Error>): ScriptedInvoker {
  let i = 0;
  return {
    invoke: async () => {
      const r = responses[i] ?? responses[responses.length - 1];
      i++;
      if (r instanceof Error) throw r;
      return r;
    },
    callCount: () => i,
  };
}

function makeDeps(
  invoker: ScriptedInvoker,
  audit: CapturedAudit,
  modelInPricing = "anthropic.claude-sonnet-4-6-20250514-v1:0"
): Partial<SculptDeps> {
  return {
    invoke: async (sys, prompt) => {
      const r = await invoker.invoke(sys, prompt);
      if (r.success && r.modelId === "test-model-id") {
        // Substituieren mit Real-Pricing-Model-ID, damit calculateSculptCost
        // einen Eintrag findet (sculptor-cost PRICING-Table).
        return { ...r, modelId: modelInPricing };
      }
      return r;
    },
    auditInsert: async (row) => {
      audit.rows.push(row);
    },
    uuid: () => "sess-uuid-test-1111",
    transcriptSource: "text",
  };
}

// ---------------------------------------------------------------------------
// 4 Success-Cases (AC3: 4 Success-Prompts)
// ---------------------------------------------------------------------------

describe("sculptRule — AC3: 4 Success-Prompts", () => {
  it("S1: deal.stage_changed -> create_task (Follow-up Angebot)", async () => {
    const payload = {
      name: "Follow-up Angebot",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        { type: "create_task", params: { title: "Anruf nachfassen", due_in_days: 2, assignee: "deal_owner" } },
      ],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn ein Deal in Stage Angebot wechselt, leg dem Owner eine Follow-up-Task in 2 Tagen an.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("success");
    expect(invoker.callCount()).toBe(1);
    expect(audit.rows.length).toBe(1);
    expect(audit.rows[0].action).toBe("automation_rule.sculpt_attempt");
    expect(res.attemptCount).toBe(1);
    expect(res.totalCostUsd).toBeCloseTo(0.0105, 6); // 1000*0.003/1k + 500*0.015/1k
  });

  it("S2: deal.created -> send_email_template (Welcome-Mail)", async () => {
    const payload = {
      name: "Welcome-Mail bei neuem Deal",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [
        { type: "send_email_template", params: { template_id: TEMPLATE_UUID, mode: "draft" } },
      ],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn ein Deal neu angelegt wird, sende eine Welcome-Mail aus dem Standard-Template als Entwurf.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("success");
  });

  it("S3: activity.created -> update_field auf contact.tags", async () => {
    const payload = {
      name: "Lead-Tagging",
      trigger_event: "activity.created",
      trigger_config: { activity_types: ["call"] },
      conditions: [],
      actions: [
        { type: "update_field", params: { entity: "contact", field: "tags", value: ["aktiv"] } },
      ],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn ein Anruf protokolliert wird, ergaenze beim Kontakt das Tag 'aktiv'.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("success");
    if (res.status === "success") {
      expect(res.payload.actions[0].type).toBe("update_field");
    }
  });

  it("S4: deal.stage_changed -> create_activity (Note)", async () => {
    const payload = {
      name: "Auto-Note bei Stage-Wechsel",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        { type: "create_activity", params: { type: "note", title: "Stage-Wechsel" } },
      ],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Auto-Note jedes Mal wenn ein Deal die Stage wechselt.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// 2 Reject-Cases (AC3: 2 Reject-Prompts)
// ---------------------------------------------------------------------------

describe("sculptRule — AC3: 2 Reject-Prompts", () => {
  it("R1: WhatsApp-Sprachnachricht -> reject", async () => {
    const payload = {
      reject_reason: "out_of_domain",
      explanation:
        "WhatsApp-Sprachnachrichten sind kein Trigger der V6.2-Workflow-Engine. Verfuegbar sind 3 Trigger-Events.",
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn der Kunde eine Sprachnachricht ueber WhatsApp schickt, antworte automatisch.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("reject");
    if (res.status === "reject") {
      expect(res.reason.reject_reason).toBe("out_of_domain");
    }
  });

  it("R2: externer API-Call -> reject", async () => {
    const payload = {
      reject_reason: "out_of_domain",
      explanation:
        "Externer ERP-API-Call ist keine Action der V6.2-Workflow-Engine. Erlaubt sind 4 Action-Types.",
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn ein Deal gewonnen wird, rufe via externer API unser ERP-System auf.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("reject");
  });
});

// ---------------------------------------------------------------------------
// 2 Edge-Cases (AC3: 2 Edge-Prompts)
// ---------------------------------------------------------------------------

describe("sculptRule — AC3: 2 Edge-Prompts", () => {
  it("E1: Multi-Action (Mail + Task) -> success mit 2 actions", async () => {
    const payload = {
      name: "Vorbereitung Verhandlung",
      trigger_event: "deal.stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [
        { type: "send_email_template", params: { template_id: TEMPLATE_UUID, mode: "draft" } },
        { type: "create_task", params: { title: "Vorbereitung Termin", due_in_days: 0 } },
      ],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn ein Deal in Verhandlung kommt, schick Vorbereitungs-Mail UND lege Task fuer heute an.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("success");
    if (res.status === "success") {
      expect(res.payload.actions.length).toBe(2);
    }
  });

  it("E2: Ambiguer Field-Name 'Status' -> reject als out_of_domain", async () => {
    const payload = {
      reject_reason: "out_of_domain",
      explanation:
        "Feld 'status' ist mehrdeutig — meinst du deal.stage_id oder activity.status? Bitte spezifiziere.",
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule(
      "Wenn Status sich aendert, mach was.",
      USER_ID,
      makeDeps(invoker, audit)
    );
    expect(res.status).toBe("reject");
  });
});

// ---------------------------------------------------------------------------
// AC8: Re-Prompt-Loop Coverage
// ---------------------------------------------------------------------------

describe("sculptRule — AC8: Re-Prompt-Loop", () => {
  it("1st call malformed JSON -> 2nd call success, 2 Bedrock-Calls + Cost kumulativ", async () => {
    const malformed = bedrockSuccess(
      "{ this is not valid json at all, just text "
    );
    const validPayload = {
      name: "Recovered Task",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const valid = bedrockSuccess(JSON.stringify(validPayload));
    const invoker = scriptedInvoker([malformed, valid]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule("Lege eine Task an wenn Deal angelegt wird.", USER_ID, makeDeps(invoker, audit));
    expect(res.status).toBe("success");
    expect(res.attemptCount).toBe(2);
    expect(invoker.callCount()).toBe(2);
    // Cost kumulativ ueber 2 Calls
    expect(res.totalCostUsd).toBeCloseTo(0.0105 * 2, 6);
    // Audit-Log: 2 Eintraege (1 validation_fail + 1 success)
    expect(audit.rows.length).toBe(2);
    const m1 = JSON.parse(audit.rows[0].context);
    const m2 = JSON.parse(audit.rows[1].context);
    expect(m1.result_status).toBe("validation_fail");
    expect(m2.result_status).toBe("success");
  });

  it("Beide Calls validation_fail -> result status validation_fail", async () => {
    const garbage = bedrockSuccess("not even close");
    const invoker = scriptedInvoker([garbage, garbage]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule("Mach irgendwas", USER_ID, makeDeps(invoker, audit));
    expect(res.status).toBe("validation_fail");
    expect(res.attemptCount).toBe(2);
    expect(audit.rows.length).toBe(2);
  });

  it("1st call heals via healJsonEscapes -> success ohne 2nd call", async () => {
    // Bedrock returnt JSON mit unescaped inner Quote — heal repariert das.
    const drifted = bedrockSuccess(
      '{"name":"Heal-Test Quote inside","trigger_event":"deal.created","trigger_config":{},"conditions":[],"actions":[{"type":"create_task","params":{"title":"User said "hi" inside"}}]}'
    );
    const invoker = scriptedInvoker([drifted]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule("Heal-Test", USER_ID, makeDeps(invoker, audit));
    expect(res.status).toBe("success");
    expect(invoker.callCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AC9: Audit-Log-Metadata-Format
// ---------------------------------------------------------------------------

describe("sculptRule — AC9: Audit-Log-Metadata", () => {
  it("setzt alle 7 metadata-Felder pro sculpt_attempt-Eintrag", async () => {
    const payload = {
      name: "AC9-Test",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    await sculptRule("AC9-Input", USER_ID, makeDeps(invoker, audit));
    const m = JSON.parse(audit.rows[0].context);
    expect(m).toMatchObject({
      nl_input: "AC9-Input",
      transcript_source: "text",
      sculptor_model_id: expect.any(String),
      sculptor_cost_usd: expect.any(Number),
      attempt_count: 1,
      result_status: "success",
      sculpt_session_id: expect.any(String),
    });
    expect(m.result_payload).toBeDefined();
  });

  it("nutzt action='automation_rule.sculpt_attempt' und entity_type='automation_rule'", async () => {
    const payload = {
      name: "Action-Type-Check",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    await sculptRule("X", USER_ID, makeDeps(invoker, audit));
    expect(audit.rows[0].action).toBe("automation_rule.sculpt_attempt");
    expect(audit.rows[0].entity_type).toBe("automation_rule");
    expect(audit.rows[0].actor_id).toBe(USER_ID);
  });

  it("propagiert transcriptSource='voice' bei Voice-Input", async () => {
    const payload = {
      name: "Voice-Input-Test",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    await sculptRule("voice-said", USER_ID, {
      ...makeDeps(invoker, audit),
      transcriptSource: "voice",
    });
    const m = JSON.parse(audit.rows[0].context);
    expect(m.transcript_source).toBe("voice");
  });
});

// ---------------------------------------------------------------------------
// Infra-Fail-Probe
// ---------------------------------------------------------------------------

describe("sculptRule — Infra-Fail-Pfad", () => {
  it("queryLLM wirft -> infra_fail mit message", async () => {
    const invoker = scriptedInvoker([new Error("Bedrock timeout simulated")]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule("X", USER_ID, makeDeps(invoker, audit));
    expect(res.status).toBe("infra_fail");
    if (res.status === "infra_fail") {
      expect(res.infraError).toMatch(/timeout simulated/);
    }
    expect(audit.rows.length).toBe(1);
    const m = JSON.parse(audit.rows[0].context);
    expect(m.result_status).toBe("infra_fail");
  });

  it("queryLLM returnt success=false -> infra_fail propagiert error", async () => {
    const invoker = scriptedInvoker([bedrockInfraFail("Credentials missing")]);
    const audit: CapturedAudit = { rows: [] };
    const res = await sculptRule("Y", USER_ID, makeDeps(invoker, audit));
    expect(res.status).toBe("infra_fail");
    if (res.status === "infra_fail") {
      expect(res.infraError).toBe("Credentials missing");
    }
  });
});

// ---------------------------------------------------------------------------
// Auxiliary: SculptResult-Shape-Probe
// ---------------------------------------------------------------------------

describe("sculptRule — Result-Shape", () => {
  it("returnt SessionId konsistent in jedem Pfad", async () => {
    const payload = {
      name: "SessionId-Test",
      trigger_event: "deal.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "create_task", params: { title: "X" } }],
    };
    const invoker = scriptedInvoker([bedrockSuccess(JSON.stringify(payload))]);
    const audit: CapturedAudit = { rows: [] };
    const res: SculptResult = await sculptRule("X", USER_ID, makeDeps(invoker, audit));
    expect(res.sessionId).toBe("sess-uuid-test-1111");
    const m = JSON.parse(audit.rows[0].context);
    expect(m.sculpt_session_id).toBe("sess-uuid-test-1111");
  });
});
