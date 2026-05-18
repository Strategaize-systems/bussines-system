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

vi.mock("@/app/(app)/mein-tag/actions/preview-nl-rule", () => ({
  previewNlRule: vi.fn(),
}));

vi.mock("@/app/(app)/mein-tag/actions/apply-nl-rule", () => ({
  applyNlRule: vi.fn(),
}));

const { NLRuleBuilderCard, formatBedrockCost } = await import("./nl-rule-builder-card");
const { sculptNlRule } = await import("@/app/(app)/mein-tag/actions/sculpt-nl-rule");
const { previewNlRule } = await import("@/app/(app)/mein-tag/actions/preview-nl-rule");
const { applyNlRule } = await import("@/app/(app)/mein-tag/actions/apply-nl-rule");

describe("NLRuleBuilderCard — Hide for non-allowed roles", () => {
  it("renders nothing when canSculpt=false", () => {
    const { container } = render(<NLRuleBuilderCard canSculpt={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("nl-rule-builder-card")).not.toBeInTheDocument();
  });
});

describe("NLRuleBuilderCard — Initial state", () => {
  it("renders form + idle mic-button (SLC-755 enabled)", () => {
    render(<NLRuleBuilderCard canSculpt={true} />);
    expect(screen.getByTestId("nl-rule-builder-card")).toBeInTheDocument();
    expect(screen.getByTestId("nl-rule-builder-form")).toBeInTheDocument();
    const mic = screen.getByTestId("nl-rule-builder-mic") as HTMLButtonElement;
    // SLC-755: Mikro ist aktiv, idle-State zeigt "Spracheingabe starten"
    expect(mic.disabled).toBe(false);
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(mic.getAttribute("aria-label")).toBe("Spracheingabe starten");
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
    // SLC-754 MT-5: Preview-CTA-Card sichtbar (statt SLC-753-Placeholder)
    expect(screen.getByTestId("nl-rule-builder-preview-cta")).toBeInTheDocument();
    expect(screen.getByTestId("nl-rule-builder-preview-button")).toBeInTheDocument();
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

describe("NLRuleBuilderCard — SLC-754 Trockenlauf + Apply Sequenz", () => {
  it("renders preview-result + apply-cta after preview, opens modal, applies on submit", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: true,
      result: {
        status: "success",
        payload: {
          name: "Follow-up nach Angebot",
          description: null,
          trigger_event: "deal.stage_changed",
          trigger_config: {},
          conditions: [],
          actions: [
            { type: "create_task", params: { title: "Follow-up", due_in_days: 2 } },
          ],
        },
        totalCostUsd: 0.012,
        attemptCount: 1,
        sessionId: "session-aaa",
      },
    });
    vi.mocked(previewNlRule).mockResolvedValue({
      ok: true,
      result: {
        total_matched: 2,
        hits: [
          {
            entity_type: "deal",
            entity_id: "d1",
            entity_label: "Deal: Acme",
            entity_url: "/deals/d1",
            matched_at: "2026-05-15T09:00:00Z",
            would_run_actions: [
              { type: "create_task", summary: 'Aufgabe anlegen: "Follow-up"' },
            ],
          },
          {
            entity_type: "deal",
            entity_id: "d2",
            entity_label: "Deal: Beta",
            entity_url: "/deals/d2",
            matched_at: "2026-05-14T09:00:00Z",
            would_run_actions: [
              { type: "create_task", summary: 'Aufgabe anlegen: "Follow-up"' },
            ],
          },
        ],
        truncated: false,
        source_count: 5,
      },
    });
    vi.mocked(applyNlRule).mockResolvedValue({
      ok: true,
      rule_id: "rule-new-1",
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Wenn Deal nach Angebot, leg Follow-up an" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Regel bauen/ }));

    // 1) Wait for sculpt + schema to render
    await waitFor(() => {
      expect(screen.getByTestId("nl-rule-builder-schema")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-rule-builder-preview-cta")).toBeInTheDocument();

    // 2) Click Trockenlauf
    fireEvent.click(screen.getByTestId("nl-rule-builder-preview-button"));
    await waitFor(() => {
      expect(screen.getByTestId("preview-result-card")).toBeInTheDocument();
    });
    expect(previewNlRule).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("nl-rule-builder-apply-cta")).toBeInTheDocument();

    // 3) Click Regel aktivieren -> Modal opens
    fireEvent.click(screen.getByTestId("nl-rule-builder-apply-button"));
    await waitFor(() => {
      expect(screen.getByTestId("apply-confirm-modal")).toBeInTheDocument();
    });
    const submitBtn = screen.getByTestId("apply-confirm-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // 4) Check checkbox -> submit enabled
    fireEvent.click(screen.getByTestId("apply-confirm-checkbox"));
    expect(submitBtn.disabled).toBe(false);

    // 5) Submit -> applyNlRule called + success banner
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByTestId("nl-rule-builder-apply-success")).toBeInTheDocument();
    });
    expect(applyNlRule).toHaveBeenCalledTimes(1);
    const applyArg = vi.mocked(applyNlRule).mock.calls[0][0];
    expect(applyArg.sculpt_audit_id).toBe("session-aaa");
    expect(applyArg.sculptor_cost_usd).toBe(0.012);
    expect(applyArg.edited_in_form).toBe(false);
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

// ---------------------------------------------------------------------------
// SLC-755 Voice-Input: Mikro-Button-States + Permission-Denied
//
// Hook-Reuse von useVoiceCapture (KIWorkspace-Pattern). Tests mocken den Hook
// direkt — Hook-Internals sind durch useVoiceCapture.test.tsx getrennt
// abgedeckt (happy + denied + network-error). Hier geht es nur um die
// Verdrahtung im NL-Card.
// ---------------------------------------------------------------------------

vi.mock("@/components/ki-workspace/hooks/useVoiceCapture", () => ({
  useVoiceCapture: vi.fn(),
}));

const { useVoiceCapture } = await import("@/components/ki-workspace/hooks/useVoiceCapture");

describe("NLRuleBuilderCard — Voice-Input (SLC-755)", () => {
  it("shows recording-state (aria-pressed=true, label='Aufnahme stoppen') when isRecording=true", () => {
    vi.mocked(useVoiceCapture).mockReturnValue({
      isRecording: true,
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(""),
      error: null,
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    const mic = screen.getByTestId("nl-rule-builder-mic") as HTMLButtonElement;
    expect(mic.getAttribute("aria-pressed")).toBe("true");
    expect(mic.getAttribute("aria-label")).toBe("Aufnahme stoppen");
  });

  it("renders voice.error in red banner when error is set", () => {
    vi.mocked(useVoiceCapture).mockReturnValue({
      isRecording: false,
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(""),
      error: "Mikrofon-Zugriff verweigert",
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    const err = screen.getByTestId("nl-rule-builder-voice-error");
    expect(err).toBeInTheDocument();
    expect(err.textContent).toMatch(/Mikrofon-Zugriff verweigert/);
  });

  it("calls voice.start when idle and clicked", () => {
    const startMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useVoiceCapture).mockReturnValue({
      isRecording: false,
      start: startMock,
      stop: vi.fn().mockResolvedValue(""),
      error: null,
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    fireEvent.click(screen.getByTestId("nl-rule-builder-mic"));
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("calls voice.stop when recording and clicked, appends transcript to textarea", async () => {
    const stopMock = vi.fn().mockResolvedValue("transkribierter Text");
    vi.mocked(useVoiceCapture).mockReturnValue({
      isRecording: true,
      start: vi.fn(),
      stop: stopMock,
      error: null,
    });

    render(<NLRuleBuilderCard canSculpt={true} />);
    fireEvent.click(screen.getByTestId("nl-rule-builder-mic"));
    expect(stopMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const ta = screen.getByPlaceholderText(/Beispiel/) as HTMLTextAreaElement;
      expect(ta.value).toBe("transkribierter Text");
    });
  });
});
