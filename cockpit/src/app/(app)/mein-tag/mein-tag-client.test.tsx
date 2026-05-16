/**
 * V7.1 SLC-712b MT-3 — MeinTagClient readOnly + viewAsUserId Behavior.
 *
 * Verifiziert:
 * 1. readOnly={true} blendet alle 9 QuickActionButtons aus
 * 2. readOnly={false} (Default) zeigt QuickActionButtons (Regression-Frei)
 * 3. PageHeader-Title postfixt mit "(Read-Only: {Name})" wenn readOnly + targetUserDisplayName
 * 4. KI-Workspace ist im Drilldown (readOnly) komplett ausgeblendet (V7.1.1 SLC-714, BL-471)
 * 5. KI-Workspace ist im Self-Modus mit eigener userId sichtbar (Regression-frei)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Server-Action-Module mocken
vi.mock("@/app/(app)/mein-tag/actions", () => ({
  completeTaskFromMeinTag: vi.fn(),
  completeDealActionFromMeinTag: vi.fn(),
}));

vi.mock("@/app/actions/meetings", () => ({
  startMeeting: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Stub schwere Components weg
vi.mock("../pipeline/deal-detail-sheet", () => ({
  DealDetailSheet: () => null,
}));

vi.mock("../pipeline/deal-sheet", () => ({
  DealSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("../aufgaben/task-sheet", () => ({
  TaskSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("@/components/meetings/meeting-sheet", () => ({
  MeetingSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("@/components/calendar/event-sheet", () => ({
  EventSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("../contacts/contact-sheet", () => ({
  ContactSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("../companies/company-sheet", () => ({
  CompanySheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("./call-sheet", () => ({
  CallSheet: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger}</>,
}));

// KI-Workspace-Wrapper stub mit data-testid das wir gegenchecken
vi.mock("./ki-workspace-wrapper", () => ({
  MeinTagKIWorkspace: ({ userId }: { userId: string }) => (
    <div data-testid="ki-workspace-stub" data-user-id={userId} />
  ),
}));

import { MeinTagClient } from "./mein-tag-client";

function baseProps() {
  return {
    userId: "self-user-id",
    data: {
      overdue: [],
      today: [],
      upcoming: [],
      stats: { overdueCount: 0, todayCount: 0, upcomingCount: 0 },
    },
    stages: [],
    contacts: [],
    companies: [],
    deals: [],
    pipelines: [{ id: "p1", name: "Multiplikatoren" }],
    calendarSlots: [],
    nextMeeting: null,
    topDeals: [],
    gatekeeperSummary: { total: 0, unclassified: 0, dringend: 0, normal: 0, niedrig: 0, irrelevant: 0, pendingActions: 0 },
    dateLabel: "Donnerstag, 15. Mai 2026",
  };
}

describe("MeinTagClient readOnly + viewAsUserId behavior (SLC-712b)", () => {
  it("blendet alle 9 QuickActionButtons aus, wenn readOnly=true", () => {
    render(<MeinTagClient {...baseProps()} readOnly viewAsUserId="target-user-id" />);
    // QuickActionButtons sind nicht im DOM
    expect(screen.queryByText(/Aufgabe$/)).toBeNull();
    expect(screen.queryByText(/Meeting$/)).toBeNull();
    expect(screen.queryByText(/Termin$/)).toBeNull();
    expect(screen.queryByText(/Anruf$/)).toBeNull();
    expect(screen.queryByText(/Neuer Deal/)).toBeNull();
    expect(screen.queryByText(/Neuer Kontakt/)).toBeNull();
    expect(screen.queryByText(/Neue Firma/)).toBeNull();
    expect(screen.queryByText(/Multiplikator/)).toBeNull();
  });

  it("zeigt QuickActionButtons im Default-Modus (readOnly=false)", () => {
    render(<MeinTagClient {...baseProps()} />);
    expect(screen.getByText(/Aufgabe$/)).toBeInTheDocument();
    expect(screen.getByText(/Meeting$/)).toBeInTheDocument();
    expect(screen.getByText(/Neuer Deal/)).toBeInTheDocument();
  });

  it("postfixt PageHeader-Title mit '(Read-Only: {Name})' wenn readOnly + targetUserDisplayName", () => {
    render(
      <MeinTagClient
        {...baseProps()}
        readOnly
        viewAsUserId="target-user-id"
        targetUserDisplayName="Test Member"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Mein Tag \(Read-Only: Test Member\)/i }),
    ).toBeInTheDocument();
  });

  it("blendet KI-Workspace komplett aus im Drilldown (V7.1.1 SLC-714 / BL-471)", () => {
    render(
      <MeinTagClient
        {...baseProps()}
        readOnly
        viewAsUserId="target-user-id"
        targetUserDisplayName="Test Member"
      />,
    );
    // KI-Workspace wird im readOnly-Modus nicht gerendert — keine Berichts-Buttons,
    // keine Frage-Eingabe, kein Mutate-Pfad der Server-Errors werfen wuerde.
    expect(screen.queryByTestId("ki-workspace-stub")).toBeNull();
  });

  it("uebergibt eigene userId an KI-Workspace im Self-Modus", () => {
    render(<MeinTagClient {...baseProps()} />);
    const kiStub = screen.getByTestId("ki-workspace-stub");
    expect(kiStub.getAttribute("data-user-id")).toBe("self-user-id");
  });

  it("rendert PageHeader-Title 'Mein Tag' im Default-Modus", () => {
    render(<MeinTagClient {...baseProps()} />);
    expect(screen.getByRole("heading", { name: /^Mein Tag$/ })).toBeInTheDocument();
  });
});
