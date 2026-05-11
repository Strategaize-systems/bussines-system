import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerPane } from "../AnswerPane";
import type { ReportResult } from "../types";

const TOP_CHANCEN_MARKDOWN = [
  "## Top-Chancen",
  "",
  "## Pipeline: Multiplikatoren",
  "- Deal Alpha — Acme · 5000 EUR · 70%",
  "- Deal Beta — Bravo · 3000 EUR · 60%",
  "",
  "## Pipeline: Unternehmer-Chancen",
  "- Deal Gamma — Charlie · 8000 EUR · 80%",
  "",
  "## KI-Kommentar",
  "Multiplikatoren-Pipeline ist am vielversprechendsten.",
].join("\n");

const TOP_CHANCEN_RESULT: ReportResult = {
  markdown: TOP_CHANCEN_MARKDOWN,
  completedAt: "2026-05-11T10:00:00Z",
  model: "claude-opus-4-7",
  refreshable: true,
};

describe("AnswerPane top-chancen tab renderer (SLC-666 MT-7)", () => {
  it("renders Pipeline tabs when reportId='top-chancen' and markdown has Pipeline sections", () => {
    render(
      <AnswerPane
        isLoading={false}
        result={TOP_CHANCEN_RESULT}
        reportId="top-chancen"
      />,
    );
    expect(screen.getByTestId("pipeline-tabs-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("pipeline-tab-0")).toHaveTextContent("Multiplikatoren");
    expect(screen.getByTestId("pipeline-tab-1")).toHaveTextContent("Unternehmer-Chancen");
  });

  it("shows first Pipeline tab's content by default", () => {
    render(
      <AnswerPane
        isLoading={false}
        result={TOP_CHANCEN_RESULT}
        reportId="top-chancen"
      />,
    );
    const content = screen.getByTestId("pipeline-tab-content");
    expect(content.textContent).toContain("Deal Alpha");
    expect(content.textContent).toContain("Deal Beta");
    expect(content.textContent).not.toContain("Deal Gamma");
  });

  it("switches tab content client-side on tab click (no new fetch)", () => {
    render(
      <AnswerPane
        isLoading={false}
        result={TOP_CHANCEN_RESULT}
        reportId="top-chancen"
      />,
    );
    fireEvent.click(screen.getByTestId("pipeline-tab-1"));
    const content = screen.getByTestId("pipeline-tab-content");
    expect(content.textContent).toContain("Deal Gamma");
    expect(content.textContent).not.toContain("Deal Alpha");
  });

  it("renders the KI-Kommentar trailing block under tabs", () => {
    render(
      <AnswerPane
        isLoading={false}
        result={TOP_CHANCEN_RESULT}
        reportId="top-chancen"
      />,
    );
    const trailing = screen.getByTestId("pipeline-tabs-trailing");
    expect(trailing.textContent).toContain("KI-Kommentar");
    expect(trailing.textContent).toContain("Multiplikatoren-Pipeline ist am vielversprechendsten");
  });

  it("falls back to MarkdownView when reportId is not top-chancen", () => {
    render(
      <AnswerPane
        isLoading={false}
        result={TOP_CHANCEN_RESULT}
        reportId="pipeline-snapshot"
      />,
    );
    expect(screen.queryByTestId("pipeline-tabs-renderer")).toBeNull();
  });

  it("falls back to MarkdownView when markdown has no Pipeline sections", () => {
    const result: ReportResult = {
      markdown: "## Just a regular heading\n- bullet a\n- bullet b",
      completedAt: "2026-05-11T10:00:00Z",
      model: "x",
      refreshable: true,
    };
    render(<AnswerPane isLoading={false} result={result} reportId="top-chancen" />);
    expect(screen.queryByTestId("pipeline-tabs-renderer")).toBeNull();
  });
});
