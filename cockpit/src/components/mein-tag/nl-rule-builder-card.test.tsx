// V7.5 SLC-753 MT-2/MT-4 — NLRuleBuilderCard Component-Tests.
//
// Verifiziert:
//   1. canSculpt=false → return null (kein DOM-Knoten).
//   2. Submit + sculptRule success → Klarsprache + Schema-Karte rendern, Cost sichtbar.
//   3. Submit + sculptRule reject → Reject-Karte rendert, Schema-Karte NICHT.
//   4. formatBedrockCost-Helper (MT-4).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/app/(app)/mein-tag/actions/sculpt-nl-rule", () => ({
  sculptNlRule: vi.fn(),
}));

const { NLRuleBuilderCard, formatBedrockCost } = await import("./nl-rule-builder-card");
const { sculptNlRule } = await import("@/app/(app)/mein-tag/actions/sculpt-nl-rule");

describe("NLRuleBuilderCard — Hide for non-allowed roles", () => {
  it("renders nothing when canSculpt=false", () => {
    const { container } = render(<NLRuleBuilderCard canSculpt={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("nl-rule-builder-card")).not.toBeInTheDocument();
  });
});

describe("NLRuleBuilderCard — Initial state", () => {
  it("renders form + disabled mic placeholder", () => {
    render(<NLRuleBuilderCard canSculpt={true} />);
    expect(screen.getByTestId("nl-rule-builder-card")).toBeInTheDocument();
    expect(screen.getByTestId("nl-rule-builder-form")).toBeInTheDocument();
    const mic = screen.getByTestId("nl-rule-builder-mic") as HTMLButtonElement;
    expect(mic.disabled).toBe(true);
    expect(mic.title).toMatch(/SLC-755/);
    expect(screen.queryByTestId("nl-rule-builder-clarsprache")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nl-rule-builder-schema")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nl-rule-builder-cost")).not.toBeInTheDocument();
  });
});

describe("NLRuleBuilderCard — Success state", () => {
  it("renders Klarsprache + Schema-Karte + Cost after successful sculpt", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: true,
      result: {
        status: "success",
        payload: {
          name: "Follow-up nach Angebot",
          trigger_event: "deal.stage_changed",
          trigger_config: {},
          conditions: [{ field: "deal.value", op: "gt", value: 1000 }],
          actions: [
            {
              type: "create_task",
              params: { title: "Follow-up Anruf", due_in_days: 2 },
            },
          ],
        },
        totalCostUsd: 0.0028,
        attemptCount: 1,
        sessionId: "s1",
      },
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    const textarea = screen.getByPlaceholderText(/Beispiel/) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: "Wenn Deal in Phase Angebot, leg mir eine Follow-up-Task in 2 Tagen an",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Regel bauen/ }));

    await waitFor(() => {
      expect(screen.getByTestId("nl-rule-builder-clarsprache")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-rule-builder-schema")).toBeInTheDocument();
    // Klarsprache enthaelt Trigger-Label + Action-Label
    expect(screen.getByTestId("nl-rule-builder-clarsprache").textContent).toMatch(/Stage-Wechsel/);
    expect(screen.getByTestId("nl-rule-builder-clarsprache").textContent).toMatch(/Folge-Aufgabe/);
    // Cost-Display
    expect(screen.getByTestId("nl-rule-builder-cost").textContent).toMatch(/~\$0\.003 fuer 1 Versuch/);
    // Trockenlauf-Placeholder sichtbar
    expect(screen.getByTestId("nl-rule-builder-dryrun-placeholder")).toBeInTheDocument();
    // KEIN Reject
    expect(screen.queryByTestId("nl-rule-builder-reject")).not.toBeInTheDocument();
  });
});

describe("NLRuleBuilderCard — Reject state", () => {
  it("renders Reject-Karte and hides Schema-Karte when sculpt rejects", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: true,
      result: {
        status: "reject",
        reason: {
          reject_reason: "out_of_domain",
          explanation: "Diese Anfrage betrifft kein Workflow-Thema, sondern Kalender-Management.",
        },
        totalCostUsd: 0.0029,
        attemptCount: 1,
        sessionId: "s2",
      },
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Verschiebe meinen Termin um 30 Minuten" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Regel bauen/ }));

    await waitFor(() => {
      expect(screen.getByTestId("nl-rule-builder-reject")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-rule-builder-reject").textContent).toMatch(/Kalender-Management/);
    // Schema-Karte darf nicht rendern bei reject
    expect(screen.queryByTestId("nl-rule-builder-schema")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nl-rule-builder-clarsprache")).not.toBeInTheDocument();
    // Cost sichtbar
    expect(screen.getByTestId("nl-rule-builder-cost").textContent).toMatch(/~\$0\.003 fuer 1 Versuch/);
  });
});

describe("NLRuleBuilderCard — Forbidden server-action error", () => {
  it("renders action error when server-action returns ok:false", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: false,
      error: "forbidden",
      message: "Nur Admin oder Teamlead darf den NL-Rule-Builder verwenden.",
    });
    render(<NLRuleBuilderCard canSculpt={true} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Test-Eingabe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Regel bauen/ }));
    await waitFor(() => {
      expect(screen.getByTestId("nl-rule-builder-action-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-rule-builder-action-error").textContent).toMatch(/Admin/);
  });
});

describe("formatBedrockCost", () => {
  it("formats 1 attempt with Versuch singular", () => {
    expect(formatBedrockCost(0.0028, 1)).toBe("~$0.003 fuer 1 Versuch");
  });

  it("formats 2 attempts with Versuche plural", () => {
    expect(formatBedrockCost(0.0058, 2)).toBe("~$0.006 fuer 2 Versuche");
  });

  it("rounds half-up to 3 decimals", () => {
    expect(formatBedrockCost(0.0125, 1)).toBe("~$0.013 fuer 1 Versuch");
  });
});
