// V8 SLC-813 MT-4 — StageRequirementsModal Component-Tests.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  StageRequirementsModal,
  type KiLossSuggest,
} from "../stage-requirements-modal";
import { STAGE_REQUIRED_FIELDS } from "@/lib/pipeline/stage-required-fields";

const CONTACTS = [
  { id: "c1", first_name: "Anna", last_name: "Schmidt" },
  { id: "c2", first_name: "Max", last_name: "Mustermann" },
];

const KI_SUGGEST: KiLossSuggest = {
  primary: "Preis zu hoch (Quelle: 2026-05-15 | call | Preis-Diskussion)",
  alternatives: [
    "Wettbewerber gewann (Quelle: 2026-05-16 E-Mail kunde@acme.de)",
    "Timing passt nicht (Quelle: 2026-05-15 | call)",
  ],
};

function baseProps() {
  return {
    open: true,
    dealTitle: "ACME Coaching",
    oldStageName: "Erstkontakt",
    newStageName: "Verloren",
    contacts: CONTACTS,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  } as const;
}

describe("StageRequirementsModal — V8 SLC-813 MT-4", () => {
  it("rendert 1 Feld bei Stage 'Verloren' (won_lost_reason)", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
      />
    );
    expect(screen.getByTestId("field-won_lost_reason")).toBeInTheDocument();
    expect(screen.queryByTestId("field-value")).toBeNull();
  });

  it("rendert 2 Felder bei Stage 'Verhandlung / Einwände' (value + contact_id)", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        newStageName="Verhandlung / Einwände"
        requirements={STAGE_REQUIRED_FIELDS["Verhandlung / Einwände"]}
        currentValues={{ value: null, contact_id: null }}
      />
    );
    expect(screen.getByTestId("field-value")).toBeInTheDocument();
    expect(screen.getByTestId("field-contact_id")).toBeInTheDocument();
    expect(screen.queryByTestId("field-won_lost_reason")).toBeNull();
  });

  it("Pre-fill bei Verlustgrund mit KI-Vorschlag", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={KI_SUGGEST}
      />
    );
    const textarea = screen.getByTestId("req-input-won_lost_reason") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Preis zu hoch");
    expect(screen.getByTestId("ki-suggest-hint")).toBeInTheDocument();
  });

  it("zeigt KI-Suggest-Hint NICHT bei Won/Verhandlung/Angebot, sondern Info-Text 'KI nur fuer Verloren'", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        newStageName="Gewonnen"
        requirements={STAGE_REQUIRED_FIELDS["Gewonnen"]}
        currentValues={{ value: null }}
      />
    );
    expect(screen.queryByTestId("ki-suggest-hint")).toBeNull();
    expect(
      screen.getByTestId("ki-suggest-hint-other-stages")
    ).toBeInTheDocument();
  });

  it("Confirm-Button disabled wenn Pflichtfeld leer", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
      />
    );
    const confirmBtn = screen.getByTestId("stage-req-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("Confirm-Button enabled wenn alle Felder befuellt (z.B. via KI-Suggest pre-fill)", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={KI_SUGGEST}
      />
    );
    const confirmBtn = screen.getByTestId("stage-req-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it("Cancel-Klick ruft onCancel", () => {
    const onCancel = vi.fn();
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByTestId("stage-req-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Confirm-Klick ruft onConfirm mit aktuellen Werten (KI-Pre-Fill akzeptiert)", () => {
    const onConfirm = vi.fn();
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={KI_SUGGEST}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByTestId("stage-req-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0];
    expect(payload.won_lost_reason).toContain("Preis zu hoch");
  });

  it("Confirm-Klick mit editiertem Verlustgrund liefert editierten Wert", () => {
    const onConfirm = vi.fn();
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={KI_SUGGEST}
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByTestId("req-input-won_lost_reason"), {
      target: { value: "Eigenes Argument" },
    });
    fireEvent.click(screen.getByTestId("stage-req-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      won_lost_reason: "Eigenes Argument",
    });
  });

  it("Alternatives-Klick uebernimmt Vorschlag ins Feld", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={KI_SUGGEST}
      />
    );
    // Alternatives sind in einem <details>-Element — geoeffnet via Toggle.
    fireEvent.click(screen.getByTestId("ki-suggest-alternatives-toggle"));
    const list = screen.getByTestId("ki-suggest-alternatives");
    const buttons = list.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[0]);
    const textarea = screen.getByTestId(
      "req-input-won_lost_reason"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Wettbewerber gewann");
  });

  it("kiSuggestStatus=unavailable: zeigt 'mangels Activity-History' Hint, KEIN KI-Vorschlag-Block", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        kiSuggest={null}
        kiSuggestStatus="unavailable"
      />
    );
    expect(screen.queryByTestId("ki-suggest-hint")).toBeNull();
    expect(screen.getByTestId("ki-suggest-unavailable")).toBeInTheDocument();
  });

  it("Verhandlung-Stage: Confirm sendet value + contact_id atomar", () => {
    const onConfirm = vi.fn();
    render(
      <StageRequirementsModal
        {...baseProps()}
        newStageName="Verhandlung / Einwände"
        requirements={STAGE_REQUIRED_FIELDS["Verhandlung / Einwände"]}
        currentValues={{ value: null, contact_id: null }}
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByTestId("req-input-value"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByTestId("req-input-contact_id"), {
      target: { value: "c1" },
    });
    fireEvent.click(screen.getByTestId("stage-req-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      value: 5000,
      contact_id: "c1",
    });
  });

  it("Error-Banner wird angezeigt wenn errorMessage gesetzt", () => {
    render(
      <StageRequirementsModal
        {...baseProps()}
        requirements={STAGE_REQUIRED_FIELDS["Verloren"]}
        currentValues={{ won_lost_reason: null }}
        errorMessage="FK violation"
      />
    );
    expect(screen.getByTestId("stage-req-error")).toHaveTextContent(
      "FK violation"
    );
  });
});
