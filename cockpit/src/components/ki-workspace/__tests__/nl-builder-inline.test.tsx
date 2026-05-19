// V7.6 SLC-761 MT-3 — NLBuilderInline Component-Tests.
//
// Verifiziert:
//   1. Initial-Render zeigt Textarea + Sculpt-Button + Mic-Button.
//   2. Cost-Display + Modell-Hint sind NICHT im DOM (DEC-214).
//   3. Submit + sculpt success → Klarsprache + Schema-Karte rendern.
//   4. Submit + sculpt reject → Reject-Karte rendern, Schema-Karte versteckt.
//   5. Apply-Success → onClose-Prop wird aufgerufen + Card-State-Reset.
//   6. SLC-755 Voice-Input-Wiring (Hook-Reuse).
//
// Pattern aus V7.5 cockpit/src/components/mein-tag/nl-rule-builder-card.test.tsx
// portiert; formatBedrockCost-Helper-Tests entfernt (Helper existiert nicht mehr).

import { describe, it, expect, vi, beforeEach } from "vitest";
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

vi.mock("@/components/ki-workspace/hooks/useVoiceCapture", () => ({
  useVoiceCapture: vi.fn(),
}));

const { NLBuilderInline } = await import("../nl-builder-inline");
const { sculptNlRule } = await import("@/app/(app)/mein-tag/actions/sculpt-nl-rule");
const { previewNlRule } = await import("@/app/(app)/mein-tag/actions/preview-nl-rule");
const { applyNlRule } = await import("@/app/(app)/mein-tag/actions/apply-nl-rule");
const { useVoiceCapture } = await import("@/components/ki-workspace/hooks/useVoiceCapture");

beforeEach(() => {
  vi.mocked(useVoiceCapture).mockReturnValue({
    isRecording: false,
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(""),
    error: null,
  });
});

describe("NLBuilderInline — Initial state", () => {
  it("renders form + idle mic-button + sculpt-button", () => {
    render(<NLBuilderInline onClose={vi.fn()} />);
    expect(screen.getByTestId("nl-builder-inline")).toBeInTheDocument();
    expect(screen.getByTestId("nl-builder-inline-form")).toBeInTheDocument();
    const mic = screen.getByTestId("nl-builder-inline-mic") as HTMLButtonElement;
    expect(mic.disabled).toBe(false);
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("nl-builder-inline-submit")).toBeInTheDocument();
    expect(screen.queryByTestId("nl-builder-inline-clarsprache")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nl-builder-inline-schema")).not.toBeInTheDocument();
  });

  it("does NOT render Cost-Display or Modell-Hint anywhere (DEC-214)", async () => {
    // AC7: kein "Bedrock Claude Sonnet"-Text, kein "$0.x"-Cost-Anzeige.
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
        totalCostUsd: 0.0123,
        attemptCount: 1,
        sessionId: "session-cost-test",
      },
    });

    render(<NLBuilderInline onClose={vi.fn()} />);

    // Initial — kein Cost im DOM
    expect(screen.queryByText(/Bedrock Claude Sonnet/i)).toBeNull();
    expect(screen.queryByText(/\$0\.\d/)).toBeNull();
    expect(screen.queryByText(/Bedrock-Kosten/)).toBeNull();

    // Nach Sculpt-Success ebenfalls kein Cost im DOM
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Wenn Deal in Phase Angebot, leg mir Follow-up an" },
    });
    fireEvent.click(screen.getByTestId("nl-builder-inline-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("nl-builder-inline-schema")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Bedrock Claude Sonnet/i)).toBeNull();
    expect(screen.queryByText(/\$0\.\d/)).toBeNull();
    expect(screen.queryByText(/Bedrock-Kosten/)).toBeNull();
    expect(screen.queryByTestId("nl-rule-builder-cost")).not.toBeInTheDocument();
  });
});

describe("NLBuilderInline — Success state", () => {
  it("renders Klarsprache + Schema-Karte after successful sculpt", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: true,
      result: {
        status: "success",
        payload: {
          name: "Follow-up nach Angebot",
          description: null,
          trigger_event: "deal.stage_changed",
          trigger_config: {},
          conditions: [{ field: "deal.value", op: "gt", value: 1000 }],
          actions: [
            { type: "create_task", params: { title: "Follow-up Anruf", due_in_days: 2 } },
          ],
        },
        totalCostUsd: 0.0028,
        attemptCount: 1,
        sessionId: "s1",
      },
    });

    render(<NLBuilderInline onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Wenn Deal in Phase Angebot, leg mir eine Follow-up-Task in 2 Tagen an" },
    });
    fireEvent.click(screen.getByTestId("nl-builder-inline-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("nl-builder-inline-clarsprache")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-builder-inline-schema")).toBeInTheDocument();
    expect(screen.getByTestId("nl-builder-inline-clarsprache").textContent).toMatch(/Stage-Wechsel/);
    expect(screen.getByTestId("nl-builder-inline-clarsprache").textContent).toMatch(/Folge-Aufgabe/);
    expect(screen.getByTestId("nl-builder-inline-preview-cta")).toBeInTheDocument();
    expect(screen.queryByTestId("nl-builder-inline-reject")).not.toBeInTheDocument();
  });
});

describe("NLBuilderInline — Reject state", () => {
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

    render(<NLBuilderInline onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Verschiebe meinen Termin um 30 Minuten" },
    });
    fireEvent.click(screen.getByTestId("nl-builder-inline-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("nl-builder-inline-reject")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-builder-inline-reject").textContent).toMatch(/Kalender-Management/);
    expect(screen.queryByTestId("nl-builder-inline-schema")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nl-builder-inline-clarsprache")).not.toBeInTheDocument();
  });
});

describe("NLBuilderInline — Forbidden server-action error", () => {
  it("renders action error when server-action returns ok:false", async () => {
    vi.mocked(sculptNlRule).mockResolvedValue({
      ok: false,
      error: "forbidden",
      message: "Nur Admin oder Teamlead darf den NL-Rule-Builder verwenden.",
    });
    render(<NLBuilderInline onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Test-Eingabe" },
    });
    fireEvent.click(screen.getByTestId("nl-builder-inline-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("nl-builder-inline-action-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-builder-inline-action-error").textContent).toMatch(/Admin/);
  });
});

describe("NLBuilderInline — Apply-Success calls onClose", () => {
  it("calls onClose-Prop after apply succeeds", async () => {
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
        sessionId: "session-apply",
      },
    });
    vi.mocked(previewNlRule).mockResolvedValue({
      ok: true,
      result: {
        total_matched: 1,
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
        ],
        truncated: false,
        source_count: 5,
      },
    });
    vi.mocked(applyNlRule).mockResolvedValue({
      ok: true,
      rule_id: "rule-new-apply",
    });

    const onClose = vi.fn();
    render(<NLBuilderInline onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Beispiel/), {
      target: { value: "Wenn Deal nach Angebot, leg Follow-up an" },
    });
    fireEvent.click(screen.getByTestId("nl-builder-inline-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("nl-builder-inline-schema")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("nl-builder-inline-preview-button"));
    await waitFor(() => {
      expect(screen.getByTestId("preview-result-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("nl-builder-inline-apply-cta")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("nl-builder-inline-apply-button"));
    await waitFor(() => {
      expect(screen.getByTestId("apply-confirm-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("apply-confirm-checkbox"));
    const submitBtn = screen.getByTestId("apply-confirm-submit") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(applyNlRule).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("nl-builder-inline-schema")).not.toBeInTheDocument();
  });
});

describe("NLBuilderInline — Voice-Input (SLC-755 reuse)", () => {
  it("shows recording-state when isRecording=true", () => {
    vi.mocked(useVoiceCapture).mockReturnValue({
      isRecording: true,
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(""),
      error: null,
    });

    render(<NLBuilderInline onClose={vi.fn()} />);
    const mic = screen.getByTestId("nl-builder-inline-mic") as HTMLButtonElement;
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

    render(<NLBuilderInline onClose={vi.fn()} />);
    const err = screen.getByTestId("nl-builder-inline-voice-error");
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

    render(<NLBuilderInline onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("nl-builder-inline-mic"));
    expect(startMock).toHaveBeenCalledTimes(1);
  });
});
