// V7.5 SLC-752 MT-8 — Pure-Function-Tests fuer parseHistoryRow.
//
// Die DB-Query selbst (listNlSculptHistory) ist Live-DB-Test unter
// `__tests__/automation/nl-history-live.test.ts`. Hier nur die Parse-Robustheit
// gegen Drift in audit_log.context.

import { describe, it, expect } from "vitest";
import { parseHistoryRow } from "../nl-history";

function baseRow() {
  return {
    id: "aaaa1111-2222-4333-9444-555555555555",
    actor_id: "bbbb1111-2222-4333-9444-555555555555",
    created_at: "2026-05-16T18:00:00Z",
    entity_id: "session-uuid-123",
    context: JSON.stringify({
      nl_input: "Test NL Input",
      transcript_source: "text",
      sculptor_model_id: "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
      sculptor_cost_usd: 0.0105,
      attempt_count: 1,
      result_status: "success",
      result_payload: { name: "Test Rule" },
      sculpt_session_id: "session-uuid-123",
    }),
  };
}

describe("parseHistoryRow", () => {
  it("parsed valides metadata-context vollstaendig", () => {
    const out = parseHistoryRow(baseRow());
    expect(out.audit_log_id).toBe("aaaa1111-2222-4333-9444-555555555555");
    expect(out.attempt_count).toBe(1);
    expect(out.result_status).toBe("success");
    expect(out.sculptor_cost_usd).toBe(0.0105);
    expect(out.nl_input).toBe("Test NL Input");
    expect(out.transcript_source).toBe("text");
    expect(out.session_id).toBe("session-uuid-123");
  });

  it("toleriert null context (best-effort Defaults)", () => {
    const row = { ...baseRow(), context: null };
    const out = parseHistoryRow(row);
    expect(out.attempt_count).toBe(1);
    expect(out.result_status).toBe("validation_fail");
    expect(out.session_id).toBe("session-uuid-123"); // fallback auf entity_id
    expect(out.sculptor_cost_usd).toBe(0);
  });

  it("toleriert malformed JSON in context", () => {
    const row = { ...baseRow(), context: "{ this is not valid json" };
    const out = parseHistoryRow(row);
    expect(out.attempt_count).toBe(1);
    expect(out.nl_input).toBe("");
  });

  it("propagiert voice transcript_source", () => {
    const row = baseRow();
    row.context = JSON.stringify({
      ...JSON.parse(row.context),
      transcript_source: "voice",
    });
    const out = parseHistoryRow(row);
    expect(out.transcript_source).toBe("voice");
  });

  it("propagiert validation_fail result_status", () => {
    const row = baseRow();
    row.context = JSON.stringify({
      ...JSON.parse(row.context),
      result_status: "validation_fail",
      attempt_count: 2,
    });
    const out = parseHistoryRow(row);
    expect(out.result_status).toBe("validation_fail");
    expect(out.attempt_count).toBe(2);
  });
});
