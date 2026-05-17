// V7.5 SLC-754 MT-3 — RTL-Tests fuer PreviewResultCard.
//
// Verifiziert:
//   1. 0-Match -> empty-state (no list, "nicht ausgeloest"-Text).
//   2. N-Match -> list with hits, total_matched, action-summaries.
//   3. truncated=true -> truncated-notice angezeigt.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PreviewResultCard } from "./preview-result-card";
import type { DryRunResult } from "@/lib/automation/dry-run";

function emptyResult(): DryRunResult {
  return { total_matched: 0, hits: [], truncated: false, source_count: 0 };
}

function threeHitsResult(): DryRunResult {
  return {
    total_matched: 3,
    hits: [
      {
        entity_type: "deal",
        entity_id: "deal-1",
        entity_label: "Deal: Acme Roll-out",
        entity_url: "/deals/deal-1",
        matched_at: "2026-05-15T09:30:00Z",
        would_run_actions: [
          { type: "create_task", summary: 'Aufgabe anlegen: "Follow-up"' },
        ],
      },
      {
        entity_type: "deal",
        entity_id: "deal-2",
        entity_label: "Deal: Beta Inc",
        entity_url: "/deals/deal-2",
        matched_at: "2026-05-14T11:00:00Z",
        would_run_actions: [
          { type: "create_task", summary: 'Aufgabe anlegen: "Follow-up"' },
        ],
      },
      {
        entity_type: "deal",
        entity_id: "deal-3",
        entity_label: "Deal: Gamma Ltd",
        entity_url: "/deals/deal-3",
        matched_at: "2026-05-13T14:15:00Z",
        would_run_actions: [
          { type: "create_task", summary: 'Aufgabe anlegen: "Follow-up"' },
        ],
      },
    ],
    truncated: false,
    source_count: 10,
  };
}

describe("PreviewResultCard", () => {
  it("renders empty-state when total_matched=0", () => {
    render(<PreviewResultCard result={emptyResult()} />);
    const card = screen.getByTestId("preview-result-card");
    expect(card.getAttribute("data-state")).toBe("empty");
    expect(card.textContent).toContain("nicht");
    expect(screen.queryByTestId("preview-result-list")).toBeNull();
  });

  it("renders hits list with total_matched and action summaries", () => {
    render(<PreviewResultCard result={threeHitsResult()} />);
    const card = screen.getByTestId("preview-result-card");
    expect(card.getAttribute("data-state")).toBe("hits");
    expect(screen.getByTestId("preview-result-total").textContent).toBe("3");
    expect(screen.getAllByTestId("preview-result-hit")).toHaveLength(3);
    expect(screen.getByText("Deal: Acme Roll-out")).toBeTruthy();
    expect(
      screen.getAllByText('Aufgabe anlegen: "Follow-up"', { exact: false })
    ).toHaveLength(3);
  });

  it("shows truncated-notice when result.truncated=true", () => {
    const truncated: DryRunResult = {
      ...threeHitsResult(),
      total_matched: 150,
      truncated: true,
    };
    render(<PreviewResultCard result={truncated} />);
    const notice = screen.getByTestId("preview-result-truncated");
    expect(notice.textContent).toContain("150");
  });
});
