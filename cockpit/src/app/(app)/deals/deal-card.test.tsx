import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DealCard } from "./deal-card";
import type { DealCardData } from "@/lib/deals/queries";

function makeDeal(overrides: Partial<DealCardData> = {}): DealCardData {
  return {
    id: "d1",
    title: "Acme Onboarding",
    value: 12000,
    status: "active",
    pipeline_id: "p1",
    stage_id: "s1",
    stage_name: "Verhandlung",
    stage_color: "#4454b8",
    probability: 50,
    company_name: "Acme GmbH",
    next_action_title: "Angebot nachfassen",
    next_action_date: "2099-12-31",
    weighted_value: 6000,
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("DealCard", () => {
  it("renders title, value, company, stage badge, probability and next action", () => {
    render(<DealCard deal={makeDeal()} onClick={() => {}} />);
    expect(screen.getByText("Acme Onboarding")).toBeInTheDocument();
    expect(screen.getByText(/12\.000/)).toBeInTheDocument();
    expect(screen.getByText("Acme GmbH")).toBeInTheDocument();
    expect(screen.getByTestId("deal-card-stage")).toHaveTextContent("Verhandlung");
    expect(screen.getByTestId("deal-card-probability")).toHaveTextContent("50%");
    expect(screen.getByTestId("deal-card-next-action")).toHaveTextContent(
      "Angebot nachfassen",
    );
  });

  it("triggers onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<DealCard deal={makeDeal()} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("deal-card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders em-dash when value is null", () => {
    render(<DealCard deal={makeDeal({ value: null })} onClick={() => {}} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("omits company row when company is null", () => {
    render(<DealCard deal={makeDeal({ company_name: null })} onClick={() => {}} />);
    expect(screen.queryByText("Acme GmbH")).not.toBeInTheDocument();
  });

  it("omits next-action row when next_action_title is null", () => {
    render(
      <DealCard
        deal={makeDeal({ next_action_title: null, next_action_date: null })}
        onClick={() => {}}
      />,
    );
    expect(screen.queryByTestId("deal-card-next-action")).not.toBeInTheDocument();
  });

  it("does NOT render an avatar (no img, no avatar testid)", () => {
    render(<DealCard deal={makeDeal()} onClick={() => {}} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(document.querySelector("[data-testid='deal-card-avatar']")).toBeNull();
  });

  it("applies stage color as inline style", () => {
    render(
      <DealCard
        deal={makeDeal({ stage_color: "#ff0000" })}
        onClick={() => {}}
      />,
    );
    const badge = screen.getByTestId("deal-card-stage");
    expect(badge.getAttribute("style")).toContain("color: rgb(255, 0, 0)");
  });
});
