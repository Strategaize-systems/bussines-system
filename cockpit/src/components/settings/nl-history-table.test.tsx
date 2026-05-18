// SLC-756 MT-2 — Tests fuer NlHistoryTable (Slice-Spec Verification).
//
// 1) Rendert 3 Rows + zeigt User-Email + Status-Badge + truncated NL-Input.
// 2) filterNlHistoryRows: Status-Filter "reject" liefert nur reject-Rows;
//    Trigger-Filter "deal.created" liefert nur passende Rows; combined-Filter
//    funktioniert.
//
// Filter-Toggle ueber das Base-UI Select wird im Live-Smoke MT-4 (Playwright-
// MCP) gegen das echte UI verifiziert — jsdom kann das portal-basierte Popup
// nicht zuverlaessig oeffnen. Die Filter-Logik selber ist als Pure-Function
// `filterNlHistoryRows` ausgelagert und hier 1:1 abgedeckt.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { EnrichedNlHistoryRow } from "@/app/(app)/settings/workflow-automation/nl-history/page";

import { NlHistoryTable, filterNlHistoryRows } from "./nl-history-table";

const baseRow = (overrides: Partial<EnrichedNlHistoryRow>): EnrichedNlHistoryRow => ({
  audit_log_id: "log-1",
  actor_id: "user-1",
  actor_email: "alice@example.com",
  created_at: "2026-05-18T10:00:00.000Z",
  session_id: "sess-1",
  attempt_count: 1,
  result_status: "success",
  nl_input: "Wenn ein Deal in Phase Angebot wechselt, leg Follow-up-Task an",
  transcript_source: "text",
  sculptor_model_id: "anthropic.claude-sonnet-4-5",
  sculptor_cost_usd: 0.0028,
  result_payload: {
    name: "Follow-up nach Angebot",
    trigger_event: "deal.stage_changed",
  },
  ...overrides,
});

const rowSuccess: EnrichedNlHistoryRow = baseRow({});

const rowReject: EnrichedNlHistoryRow = baseRow({
  audit_log_id: "log-2",
  actor_id: "user-2",
  actor_email: "bob@example.com",
  created_at: "2026-05-18T11:00:00.000Z",
  session_id: "sess-2",
  result_status: "reject",
  nl_input: "Mach was sinnvolles",
  sculptor_cost_usd: 0.0012,
  result_payload: { reason: "Eingabe zu vage — Trigger nicht ableitbar" },
});

const rowValidationFail: EnrichedNlHistoryRow = baseRow({
  audit_log_id: "log-3",
  actor_id: "user-3",
  actor_email: "carol@example.com",
  created_at: "2026-05-18T12:00:00.000Z",
  session_id: "sess-3",
  result_status: "validation_fail",
  nl_input: "x".repeat(120),
  sculptor_cost_usd: 0.0019,
  result_payload: null,
});

describe("NlHistoryTable — render", () => {
  it("rendert 3 Rows mit Datum, User-Email, Status und Count", () => {
    render(
      <NlHistoryTable rows={[rowSuccess, rowReject, rowValidationFail]} />,
    );

    const rows = screen.getAllByTestId("nl-history-row");
    expect(rows).toHaveLength(3);

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("carol@example.com")).toBeInTheDocument();

    expect(screen.getByText("Erfolgreich")).toBeInTheDocument();
    expect(screen.getByText("Abgelehnt")).toBeInTheDocument();
    expect(screen.getByText("Validierung fehlgeschlagen")).toBeInTheDocument();

    expect(screen.getByTestId("nl-history-row-count").textContent).toBe(
      "3 von 3",
    );

    // Truncate-Marker fuer den >80-Chars-NL-Input
    expect(screen.getByText(/^x+…$/)).toBeInTheDocument();
  });

  it("rendert Empty-State wenn rows leer ist", () => {
    render(<NlHistoryTable rows={[]} />);
    expect(screen.getByTestId("nl-history-table-empty")).toBeInTheDocument();
    expect(
      screen.queryByTestId("nl-history-row-count"),
    ).not.toBeInTheDocument();
  });
});

describe("filterNlHistoryRows — Filter-Logik", () => {
  const rows = [rowSuccess, rowReject, rowValidationFail];

  it("statusFilter=all + triggerFilter=all liefert alle Rows", () => {
    expect(filterNlHistoryRows(rows, "all", "all")).toHaveLength(3);
  });

  it("statusFilter=reject liefert nur reject-Rows", () => {
    const filtered = filterNlHistoryRows(rows, "reject", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].audit_log_id).toBe("log-2");
  });

  it("statusFilter=validation_fail liefert nur validation_fail-Rows", () => {
    const filtered = filterNlHistoryRows(rows, "validation_fail", "all");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].audit_log_id).toBe("log-3");
  });

  it("triggerFilter=deal.stage_changed liefert nur Rows mit passendem trigger_event", () => {
    const filtered = filterNlHistoryRows(rows, "all", "deal.stage_changed");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].audit_log_id).toBe("log-1");
  });

  it("triggerFilter=deal.created liefert leeres Array bei diesem Mock-Set", () => {
    expect(filterNlHistoryRows(rows, "all", "deal.created")).toHaveLength(0);
  });

  it("statusFilter=success + triggerFilter=deal.stage_changed liefert genau 1 Row", () => {
    const filtered = filterNlHistoryRows(rows, "success", "deal.stage_changed");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].result_status).toBe("success");
  });
});
