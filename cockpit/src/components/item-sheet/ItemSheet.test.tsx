// SLC-665 MT-3 — ItemSheet Type-Discriminator-Tests
//
// Rendering-Branches:
//   - kind="task" zeigt Task-Meta (Status, Faellig, Prioritaet, Description)
//   - kind="activity" mit Bedrock-Summary zeigt KI-Sektionen
//   - kind="activity" ohne Bedrock-Summary zeigt Basis-Daten (Fallback)
//   - autoReplyHint rendert das Out-of-Office-Hint-Badge

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemSheet } from "./ItemSheet";
import type { ItemSheetData } from "./types";

const taskData: ItemSheetData = {
  kind: "task",
  task: {
    id: "t1",
    contact_id: null,
    company_id: null,
    deal_id: null,
    title: "Pitchdeck vorbereiten",
    description: "Erste Version bis Donnerstag",
    due_date: "2026-05-15",
    priority: "high",
    status: "open",
    type: "manual",
    completed_at: null,
    created_at: "2026-05-11T08:00:00Z",
  },
};

function buildActivity(
  overrides: Partial<
    Extract<ItemSheetData, { kind: "activity" }>["activity"]
  > = {}
): Extract<ItemSheetData, { kind: "activity" }>["activity"] {
  return {
    id: "a1",
    type: "meeting",
    title: "Discovery-Call",
    description: null,
    summary: null,
    created_at: "2026-05-10T10:00:00Z",
    contact_id: null,
    company_id: null,
    deal_id: null,
    source_type: null,
    ...overrides,
  };
}

describe("ItemSheet", () => {
  it("renders task body with status + priority", () => {
    render(<ItemSheet open={true} onOpenChange={() => {}} data={taskData} />);
    expect(screen.getByText("Pitchdeck vorbereiten")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(
      screen.getByText("Erste Version bis Donnerstag")
    ).toBeInTheDocument();
  });

  it("renders activity with Bedrock summary sections", () => {
    const data: ItemSheetData = {
      kind: "activity",
      activity: buildActivity(),
      bedrockSummary: {
        risiken: ["Budget unklar"],
        einwaende: ["Timing fragwuerdig"],
        naechsteSchritte: ["Follow-up Mi"],
        teilnehmer: ["Max Mustermann"],
        zusammenfassung: "Solider Erstkontakt.",
      },
    };
    render(<ItemSheet open={true} onOpenChange={() => {}} data={data} />);
    expect(screen.getByText("Discovery-Call")).toBeInTheDocument();
    expect(screen.getByText("KI-Zusammenfassung")).toBeInTheDocument();
    expect(screen.getByText("Risiken")).toBeInTheDocument();
    expect(screen.getByText("Einwaende")).toBeInTheDocument();
    expect(screen.getByText("Naechste Schritte")).toBeInTheDocument();
    expect(screen.getByText("Teilnehmer")).toBeInTheDocument();
    expect(screen.getByText("Solider Erstkontakt.")).toBeInTheDocument();
    expect(screen.getByText("Budget unklar")).toBeInTheDocument();
  });

  it("falls back to basis-data when activity has no Bedrock summary", () => {
    const data: ItemSheetData = {
      kind: "activity",
      activity: buildActivity({
        type: "note",
        title: "Kurze Notiz",
        description: "Inhalt der Notiz hier.",
      }),
    };
    render(<ItemSheet open={true} onOpenChange={() => {}} data={data} />);
    expect(screen.getByText("Kurze Notiz")).toBeInTheDocument();
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
    expect(screen.getByText("Inhalt der Notiz hier.")).toBeInTheDocument();
    // No KI section
    expect(screen.queryByText("KI-Zusammenfassung")).not.toBeInTheDocument();
  });

  it("renders auto-reply hint when set", () => {
    const data: ItemSheetData = {
      kind: "activity",
      activity: buildActivity({ type: "email", title: "Out of Office" }),
      autoReplyHint: true,
    };
    render(<ItemSheet open={true} onOpenChange={() => {}} data={data} />);
    expect(
      screen.getByText(/Automatische Antwort erkannt/i)
    ).toBeInTheDocument();
  });

  it("skips Bedrock sections when all fields empty", () => {
    const data: ItemSheetData = {
      kind: "activity",
      activity: buildActivity(),
      bedrockSummary: { risiken: [], einwaende: [] },
    };
    render(<ItemSheet open={true} onOpenChange={() => {}} data={data} />);
    expect(screen.queryByText("KI-Zusammenfassung")).not.toBeInTheDocument();
  });

  it("renders nothing in body when data is null but stays mountable", () => {
    const { container } = render(
      <ItemSheet open={false} onOpenChange={() => {}} data={null} />
    );
    // Sheet is closed and data is null -> safe path, no throw
    expect(container).toBeTruthy();
  });
});
