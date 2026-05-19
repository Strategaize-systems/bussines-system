// V7.6 SLC-763 MT-2 — SaveCustomReportModal Component-Tests.
//
// Verifiziert:
//   1. Initial-Render zeigt Name-Input + optional Description + Submit/Cancel.
//   2. Submit mit gueltigem Name ruft saveCustomReport mit korrektem Object.
//   3. Submit-Success ruft `onSaved(id)` + `onOpenChange(false)`.
//   4. Submit-Duplicate-Name zeigt Inline-Error.
//   5. Submit-Infra-Error zeigt Server-Message inline.
//   6. Cancel-Button schliesst Modal ohne Save.
//   7. State-Reset bei Re-Open.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/custom-reports/actions/save", () => ({
  saveCustomReport: vi.fn(),
}));

const { SaveCustomReportModal } = await import("../save-custom-report-modal");
const { saveCustomReport } = await import("@/lib/custom-reports/actions/save");

beforeEach(() => {
  vi.mocked(saveCustomReport).mockReset();
});

describe("SaveCustomReportModal", () => {
  const defaultProps = {
    open: true,
    promptTemplate: "Welche Deals haben in den letzten 14 Tagen keine Aktivitaet?",
    contextType: "mein-tag" as const,
  };

  it("renders form with Name input + Description textarea + Submit/Cancel buttons", () => {
    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByTestId("save-custom-report-modal")).toBeInTheDocument();
    expect(screen.getByTestId("save-custom-report-name")).toBeInTheDocument();
    expect(screen.getByTestId("save-custom-report-description")).toBeInTheDocument();
    expect(screen.getByTestId("save-custom-report-submit")).toBeInTheDocument();
    expect(screen.getByTestId("save-custom-report-cancel")).toBeInTheDocument();
  });

  it("Submit-Button is disabled while name is too short (<2 chars)", () => {
    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const submit = screen.getByTestId("save-custom-report-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const name = screen.getByTestId("save-custom-report-name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "A" } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(name, { target: { value: "Ab" } });
    expect(submit.disabled).toBe(false);
  });

  it("Submit with valid name calls saveCustomReport with correct payload", async () => {
    vi.mocked(saveCustomReport).mockResolvedValue({ ok: true, id: "new-id-1" });
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />,
    );

    const name = screen.getByTestId("save-custom-report-name");
    fireEvent.change(name, { target: { value: "Stagnierende Deals 14d" } });

    const description = screen.getByTestId("save-custom-report-description");
    fireEvent.change(description, { target: { value: "Test-Beschreibung" } });

    const form = screen.getByTestId("save-custom-report-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(saveCustomReport).toHaveBeenCalledWith({
        name: "Stagnierende Deals 14d",
        prompt_template: defaultProps.promptTemplate,
        context_type: "mein-tag",
        description: "Test-Beschreibung",
      });
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith("new-id-1");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("Submit with empty description sends null", async () => {
    vi.mocked(saveCustomReport).mockResolvedValue({ ok: true, id: "new-id-2" });

    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("save-custom-report-name"), {
      target: { value: "Mein Bericht" },
    });
    fireEvent.submit(screen.getByTestId("save-custom-report-form"));

    await waitFor(() => {
      expect(saveCustomReport).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });
  });

  it("Submit with duplicate_name shows inline error and keeps modal open", async () => {
    vi.mocked(saveCustomReport).mockResolvedValue({
      ok: false,
      code: "duplicate_name",
      message: 'Du hast bereits einen Custom-Report mit dem Namen "X".',
    });
    const onOpenChange = vi.fn();

    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("save-custom-report-name"), {
      target: { value: "Duplicate" },
    });
    fireEvent.submit(screen.getByTestId("save-custom-report-form"));

    await waitFor(() => {
      const err = screen.getByTestId("save-custom-report-error");
      expect(err).toBeInTheDocument();
      expect(err.textContent).toMatch(/bereits vergeben/i);
    });
    // Modal bleibt offen
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("Submit with infra error shows the server message inline", async () => {
    vi.mocked(saveCustomReport).mockResolvedValue({
      ok: false,
      code: "infra",
      message: "DB-Connection fehlgeschlagen",
    });

    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("save-custom-report-name"), {
      target: { value: "Foo" },
    });
    fireEvent.submit(screen.getByTestId("save-custom-report-form"));

    await waitFor(() => {
      expect(screen.getByTestId("save-custom-report-error").textContent).toContain(
        "DB-Connection fehlgeschlagen",
      );
    });
  });

  it("Cancel-Button calls onOpenChange(false) without saving", () => {
    const onOpenChange = vi.fn();
    render(
      <SaveCustomReportModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("save-custom-report-cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(saveCustomReport).not.toHaveBeenCalled();
  });

  it("resets state on re-open", () => {
    const { rerender } = render(
      <SaveCustomReportModal
        {...defaultProps}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const name = screen.getByTestId("save-custom-report-name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Dirty" } });
    expect(name.value).toBe("Dirty");

    rerender(
      <SaveCustomReportModal
        {...defaultProps}
        open={false}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    rerender(
      <SaveCustomReportModal
        {...defaultProps}
        open={true}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    // Modal wurde neu geoeffnet → name muss zurueckgesetzt sein.
    expect((screen.getByTestId("save-custom-report-name") as HTMLInputElement).value).toBe("");
  });
});
