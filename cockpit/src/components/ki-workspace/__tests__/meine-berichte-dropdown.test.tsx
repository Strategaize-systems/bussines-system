// V7.6 SLC-763 MT-3 — MeineBerichteDropdown Component-Tests.
//
// Verifiziert:
//   1. Trigger-Klick togglet Panel.
//   2. 0 Items → Empty-Hint sichtbar.
//   3. 3 Items (1-5) → 3 Eintraege ohne Filter-Input.
//   4. 7 Items (>=6) → Filter-Input + Filter "stag" zeigt 1 Eintrag.
//   5. Klick auf Item → onSelect-Callback.
//   6. ⋮-Klick togglet Sub-Menu.
//   7. "Loeschen" → Confirm-Dialog + deleteCustomReport-Call + onChanged.
//   8. "Umbenennen" → Rename-Dialog + renameCustomReport-Call + onChanged.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/custom-reports/actions/rename", () => ({
  renameCustomReport: vi.fn(),
}));

vi.mock("@/lib/custom-reports/actions/delete", () => ({
  deleteCustomReport: vi.fn(),
}));

const { MeineBerichteDropdown } = await import("../meine-berichte-dropdown");
const { renameCustomReport } = await import("@/lib/custom-reports/actions/rename");
const { deleteCustomReport } = await import("@/lib/custom-reports/actions/delete");

type Row = import("@/lib/custom-reports/types").CustomReportRow;

function makeReport(name: string, idx: number, lastUsed?: string): Row {
  return {
    id: `rep-${idx}`,
    owner_user_id: "user-1",
    context_type: "mein-tag",
    name,
    prompt_template: "Frage?",
    description: null,
    last_used_at: lastUsed ?? null,
    usage_count: 0,
    created_at: "2026-05-19T10:00:00Z",
    updated_at: "2026-05-19T10:00:00Z",
  };
}

beforeEach(() => {
  vi.mocked(renameCustomReport).mockReset();
  vi.mocked(deleteCustomReport).mockReset();
});

describe("MeineBerichteDropdown", () => {
  it("trigger click toggles panel open and closed", () => {
    render(
      <MeineBerichteDropdown
        reports={[]}
        onSelect={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("meine-berichte-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    expect(screen.getByTestId("meine-berichte-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    expect(screen.queryByTestId("meine-berichte-panel")).toBeNull();
  });

  it("0 Items → empty hint visible, no list", () => {
    render(
      <MeineBerichteDropdown
        reports={[]}
        onSelect={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    expect(screen.getByTestId("meine-berichte-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("meine-berichte-list")).toBeNull();
    expect(screen.queryByTestId("meine-berichte-filter")).toBeNull();
  });

  it("1-5 items → list visible, no filter input", () => {
    const reports = [
      makeReport("Bericht A", 1),
      makeReport("Bericht B", 2),
      makeReport("Bericht C", 3),
    ];
    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    expect(screen.getByTestId("meine-berichte-list")).toBeInTheDocument();
    expect(screen.queryByTestId("meine-berichte-filter")).toBeNull();
    expect(screen.getByTestId("meine-berichte-item-rep-1")).toBeInTheDocument();
    expect(screen.getByTestId("meine-berichte-item-rep-2")).toBeInTheDocument();
    expect(screen.getByTestId("meine-berichte-item-rep-3")).toBeInTheDocument();
  });

  it("6+ items → filter input visible; filter 'stag' returns only matching item case-insensitively", () => {
    const reports = [
      makeReport("Stagnierende Deals 14d", 1),
      makeReport("Forecast Q3", 2),
      makeReport("Pipeline-Risiko", 3),
      makeReport("Win/Loss Q2", 4),
      makeReport("Top-Chancen", 5),
      makeReport("Stagnierende Deals 30d", 6),
      makeReport("Conversion-Funnel", 7),
    ];
    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    const filter = screen.getByTestId("meine-berichte-filter") as HTMLInputElement;
    expect(filter).toBeInTheDocument();

    fireEvent.change(filter, { target: { value: "stag" } });
    expect(screen.getByTestId("meine-berichte-item-rep-1")).toBeInTheDocument();
    expect(screen.getByTestId("meine-berichte-item-rep-6")).toBeInTheDocument();
    expect(screen.queryByTestId("meine-berichte-item-rep-2")).toBeNull();
    expect(screen.queryByTestId("meine-berichte-item-rep-3")).toBeNull();

    // Case-insensitive
    fireEvent.change(filter, { target: { value: "FORECAST" } });
    expect(screen.getByTestId("meine-berichte-item-rep-2")).toBeInTheDocument();
    expect(screen.queryByTestId("meine-berichte-item-rep-1")).toBeNull();

    // No match → no-match-hint
    fireEvent.change(filter, { target: { value: "xxx" } });
    expect(screen.getByTestId("meine-berichte-no-match")).toBeInTheDocument();
  });

  it("clicking item calls onSelect with the report", () => {
    const reports = [makeReport("Bericht A", 1)];
    const onSelect = vi.fn();
    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={onSelect}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-select-rep-1"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("rep-1");
  });

  it("⋮ button toggles Sub-Menu with Umbenennen + Loeschen", () => {
    const reports = [makeReport("Bericht A", 1)];
    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    expect(screen.queryByTestId("meine-berichte-submenu-rep-1")).toBeNull();
    fireEvent.click(screen.getByTestId("meine-berichte-item-more-rep-1"));
    expect(screen.getByTestId("meine-berichte-submenu-rep-1")).toBeInTheDocument();
    expect(screen.getByTestId("meine-berichte-item-rename-rep-1")).toBeInTheDocument();
    expect(screen.getByTestId("meine-berichte-item-delete-rep-1")).toBeInTheDocument();
  });

  it("Loeschen → Confirm-Dialog → deleteCustomReport call + onChanged", async () => {
    vi.mocked(deleteCustomReport).mockResolvedValue({ ok: true });
    const onChanged = vi.fn();
    const reports = [makeReport("Bericht A", 1)];

    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-more-rep-1"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-delete-rep-1"));

    expect(screen.getByTestId("delete-custom-report-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("delete-custom-report-confirm"));

    await waitFor(() => {
      expect(deleteCustomReport).toHaveBeenCalledWith({ id: "rep-1" });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it("Umbenennen → Rename-Dialog → renameCustomReport call + onChanged", async () => {
    vi.mocked(renameCustomReport).mockResolvedValue({ ok: true });
    const onChanged = vi.fn();
    const reports = [makeReport("Alter Name", 1)];

    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-more-rep-1"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-rename-rep-1"));

    expect(screen.getByTestId("rename-custom-report-dialog")).toBeInTheDocument();
    const name = screen.getByTestId("rename-custom-report-name") as HTMLInputElement;
    expect(name.value).toBe("Alter Name");

    fireEvent.change(name, { target: { value: "Neuer Name" } });
    fireEvent.submit(screen.getByTestId("rename-custom-report-form"));

    await waitFor(() => {
      expect(renameCustomReport).toHaveBeenCalledWith({
        id: "rep-1",
        name: "Neuer Name",
      });
      expect(onChanged).toHaveBeenCalledTimes(1);
    });
  });

  it("Rename with duplicate_name shows inline error and keeps dialog open", async () => {
    vi.mocked(renameCustomReport).mockResolvedValue({
      ok: false,
      code: "duplicate_name",
      message: "Du hast bereits einen Custom-Report mit dem Namen ...",
    });
    const onChanged = vi.fn();
    const reports = [makeReport("Alter Name", 1)];

    render(
      <MeineBerichteDropdown
        reports={reports}
        onSelect={vi.fn()}
        onChanged={onChanged}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-berichte-trigger"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-more-rep-1"));
    fireEvent.click(screen.getByTestId("meine-berichte-item-rename-rep-1"));
    fireEvent.change(screen.getByTestId("rename-custom-report-name"), {
      target: { value: "Bereits Vergeben" },
    });
    fireEvent.submit(screen.getByTestId("rename-custom-report-form"));

    await waitFor(() => {
      const err = screen.getByTestId("rename-custom-report-error");
      expect(err).toBeInTheDocument();
      expect(err.textContent).toMatch(/bereits vergeben/i);
    });
    expect(onChanged).not.toHaveBeenCalled();
  });
});
