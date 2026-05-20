// V8 SLC-813 MT-2 — Tests fuer suggestLossReasonCore.

import { describe, it, expect, vi } from "vitest";
import {
  suggestLossReasonCore,
  type SuggestLossReasonDeps,
  type SuggestLossReasonAuditContext,
} from "../loss-reason-suggester";
import type { LossReasonActivity, LossReasonEmail } from "../loss-reason-prompt";
import type { LLMResponse } from "@/lib/ai/types";

const DEAL_ID = "00000000-0000-0000-0000-000000000001";

const DEAL = {
  title: "ACME Coaching",
  value: 12000,
  current_stage: "Verhandlung",
};

const ACTIVITIES: readonly LossReasonActivity[] = [
  { type: "call", title: "Preis-Diskussion", created_at: "2026-05-15T10:00:00Z" },
];

const EMAILS: readonly LossReasonEmail[] = [
  {
    from_email: "kunde@acme.de",
    subject: "Re: Angebot",
    snippet: "Wir haben uns intern fuer einen Wettbewerber entschieden.",
    received_at: "2026-05-16T11:00:00Z",
  },
];

function happyLLMResponse(): LLMResponse<string> {
  return {
    success: true,
    data: JSON.stringify({
      suggestions: [
        { reason: "Preis zu hoch.", source: "2026-05-15 | call | Preis-Diskussion" },
        { reason: "Wettbewerber gewann.", source: "2026-05-16 | E-Mail kunde@acme.de" },
      ],
    }),
    error: null,
    raw: "",
    usage: { input_tokens: 500, output_tokens: 300 },
    modelId: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
  };
}

function makeDeps(overrides: Partial<SuggestLossReasonDeps> = {}): {
  deps: SuggestLossReasonDeps;
  auditCalls: Array<{ dealId: string; ctx: SuggestLossReasonAuditContext }>;
} {
  const auditCalls: Array<{ dealId: string; ctx: SuggestLossReasonAuditContext }> = [];
  const defaults: SuggestLossReasonDeps = {
    invokeLLM: vi.fn(async () => happyLLMResponse()),
    fetchDealSnapshot: vi.fn(async () => DEAL),
    fetchActivities: vi.fn(async () => ACTIVITIES),
    fetchEmails: vi.fn(async () => EMAILS),
    insertAudit: vi.fn(async (dealId, ctx) => {
      auditCalls.push({ dealId, ctx });
    }),
  };
  return { deps: { ...defaults, ...overrides }, auditCalls };
}

describe("suggestLossReasonCore — V8 SLC-813 MT-2", () => {
  it("Happy-Path: liefert primary + alternatives + costUsd, Audit status=succeeded", async () => {
    const { deps, auditCalls } = makeDeps();
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).not.toBeNull();
    expect(result?.primary).toContain("Preis zu hoch");
    expect(result?.primary).toContain("Quelle:");
    expect(result?.alternatives).toHaveLength(1);
    expect(result?.alternatives[0]).toContain("Wettbewerber");
    expect(result?.costUsd).toBeGreaterThan(0);

    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0].ctx.status).toBe("succeeded");
    expect(auditCalls[0].ctx.suggestion_count).toBe(2);
    expect(auditCalls[0].ctx.input_tokens).toBe(500);
    expect(auditCalls[0].ctx.output_tokens).toBe(300);
  });

  it("Empty-Context: 0 Activities + 0 Emails -> skip Bedrock, status=skipped_empty_context, return null", async () => {
    const { deps, auditCalls } = makeDeps({
      fetchActivities: async () => [],
      fetchEmails: async () => [],
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(deps.invokeLLM).not.toHaveBeenCalled();
    expect(auditCalls[0].ctx.status).toBe("skipped_empty_context");
    expect(auditCalls[0].ctx.cost_usd).toBe(0);
  });

  it("Bedrock-Error (invoke throws): status=bedrock_error, return null", async () => {
    const { deps, auditCalls } = makeDeps({
      invokeLLM: async () => {
        throw new Error("Bedrock connection refused");
      },
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(auditCalls[0].ctx.status).toBe("bedrock_error");
    expect(auditCalls[0].ctx.error).toContain("Bedrock");
  });

  it("Bedrock-Error (invoke returns !success): status=bedrock_error", async () => {
    const { deps, auditCalls } = makeDeps({
      invokeLLM: async () => ({
        success: false,
        data: null,
        error: "Bedrock timeout",
        modelId: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      }),
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(auditCalls[0].ctx.status).toBe("bedrock_error");
    expect(auditCalls[0].ctx.error).toContain("timeout");
  });

  it("Parse-Error: status=parse_error, cost wird trotzdem persistiert", async () => {
    const { deps, auditCalls } = makeDeps({
      invokeLLM: async () => ({
        success: true,
        data: "not a json at all",
        error: null,
        usage: { input_tokens: 400, output_tokens: 50 },
        modelId: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      }),
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(auditCalls[0].ctx.status).toBe("parse_error");
    expect(auditCalls[0].ctx.cost_usd).toBeGreaterThan(0);
  });

  it("Schema-Error: status=schema_error", async () => {
    const { deps, auditCalls } = makeDeps({
      invokeLLM: async () => ({
        success: true,
        data: JSON.stringify({ suggestions: [{ reason: "X" }] }),
        error: null,
        usage: { input_tokens: 400, output_tokens: 50 },
        modelId: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      }),
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(auditCalls[0].ctx.status).toBe("schema_error");
  });

  it("Deal-not-found: status=deal_not_found, kein Bedrock-Call", async () => {
    const { deps, auditCalls } = makeDeps({
      fetchDealSnapshot: async () => null,
    });
    const result = await suggestLossReasonCore(DEAL_ID, deps);

    expect(result).toBeNull();
    expect(deps.invokeLLM).not.toHaveBeenCalled();
    expect(auditCalls[0].ctx.status).toBe("deal_not_found");
  });

  it("Audit-Insert-Fehler blockiert Suggest-Pfad NICHT (best-effort)", async () => {
    const { deps } = makeDeps({
      insertAudit: async () => {
        throw new Error("audit insert failed");
      },
    });
    // Sollte nicht werfen, Result kommt regulaer zurueck.
    const result = await suggestLossReasonCore(DEAL_ID, deps);
    expect(result).not.toBeNull();
    expect(result?.primary).toContain("Preis zu hoch");
  });
});
