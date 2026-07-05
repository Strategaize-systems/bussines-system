import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerPane } from "../AnswerPane";
import type { ReportResult } from "../types";

const RESULT: ReportResult = {
  markdown:
    "# Tagesanalyse\n\n" +
    "## Pipeline-Bewegung\n\n" +
    "Heute sind **3 Deals** durch Stages gewandert.\n\n" +
    "- Deal A: Qualified -> Proposal\n" +
    "- Deal B: New -> Qualified\n",
  completedAt: "2026-05-10T08:00:00Z",
  model: "claude-opus-4-7",
  refreshable: true,
};

describe("AnswerPane", () => {
  it("shows loading spinner when isLoading", () => {
    render(<AnswerPane isLoading={true} />);
    expect(screen.getByTestId("ki-workspace-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("ki-workspace-result")).toBeNull();
  });

  it("renders error alert when error is set", () => {
    render(<AnswerPane isLoading={false} error="Bedrock 500" />);
    const alert = screen.getByTestId("ki-workspace-error");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Bedrock 500");
  });

  it("renders markdown headings, lists and bold inline", () => {
    render(<AnswerPane isLoading={false} result={RESULT} />);
    const out = screen.getByTestId("ki-workspace-result");
    expect(out.querySelector("h1")?.textContent).toBe("Tagesanalyse");
    expect(out.querySelector("h2")?.textContent).toBe("Pipeline-Bewegung");
    expect(out.querySelector("strong")?.textContent).toBe("3 Deals");
    expect(out.querySelectorAll("li")).toHaveLength(2);
    expect(out.querySelectorAll("li")[0].textContent).toContain("Deal A");
  });

  // V8.16 SLC-914 MT-3 (ISSUE-133): inline-Link-hrefs laufen durch
  // safeExternalHref — protocol-relative + javascript:-URLs → "#".
  it("sanitizes inline link hrefs via safeExternalHref (ISSUE-133)", () => {
    const result: ReportResult = {
      markdown:
        "Siehe [sicher](https://example.com), [boese](//evil.com) und [js](javascript:x).",
      completedAt: "2026-07-05T00:00:00Z",
      model: "claude-opus-4-8",
      refreshable: false,
    };
    render(<AnswerPane isLoading={false} result={result} />);
    const out = screen.getByTestId("ki-workspace-result");
    const byText = (t: string) =>
      Array.from(out.querySelectorAll("a")).find((a) => a.textContent === t);
    expect(byText("sicher")?.getAttribute("href")).toBe("https://example.com");
    expect(byText("boese")?.getAttribute("href")).toBe("#");
    expect(byText("js")?.getAttribute("href")).toBe("#");
  });

  it("Aktualisieren button triggers onRefresh when result + onRefresh present", () => {
    const onRefresh = vi.fn();
    render(<AnswerPane isLoading={false} result={RESULT} onRefresh={onRefresh} />);
    const btn = screen.getByTestId("ki-workspace-refresh-button");
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("hides refresh button when no result", () => {
    render(<AnswerPane isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.queryByTestId("ki-workspace-refresh-button")).toBeNull();
  });

  // V7.6 SLC-763 MT-1 (DEC-216): "Als Bericht speichern"-Button erscheint nur
  // wenn Parent (KIWorkspace) den Callback setzt UND ein result vorliegt.
  describe("V7.6 SLC-763 Save-as-Report-Button", () => {
    it("shows Save-as-Report button when result and onSaveAsReport set", () => {
      const onSave = vi.fn();
      render(
        <AnswerPane
          isLoading={false}
          result={RESULT}
          onSaveAsReport={onSave}
        />,
      );
      expect(screen.getByTestId("answer-pane-save-as-report")).toBeInTheDocument();
    });

    it("hides Save-as-Report button when result is missing", () => {
      const onSave = vi.fn();
      render(<AnswerPane isLoading={false} onSaveAsReport={onSave} />);
      expect(screen.queryByTestId("answer-pane-save-as-report")).toBeNull();
    });

    it("hides Save-as-Report button when onSaveAsReport prop is missing", () => {
      render(<AnswerPane isLoading={false} result={RESULT} />);
      expect(screen.queryByTestId("answer-pane-save-as-report")).toBeNull();
    });

    it("Save-as-Report button click triggers onSaveAsReport callback", () => {
      const onSave = vi.fn();
      render(
        <AnswerPane
          isLoading={false}
          result={RESULT}
          onSaveAsReport={onSave}
        />,
      );
      fireEvent.click(screen.getByTestId("answer-pane-save-as-report"));
      expect(onSave).toHaveBeenCalledOnce();
    });
  });
});
