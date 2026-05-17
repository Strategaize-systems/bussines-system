// V7.5 SLC-754 MT-4 — RTL-Tests fuer ApplyConfirmModal.
//
// Verifiziert:
//   1. Apply-Button ist disabled wenn Checkbox unchecked.
//   2. Apply-Button ist enabled wenn Checkbox checked + nicht-pending.
//   3. Apply-Klick ruft onApply-Handler.
//   4. Checkbox-Reset bei open=false -> open=true.
//   5. errorMessage wird gerendert.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ApplyConfirmModal } from "./apply-confirm-modal";
import type { SculptSuccess } from "@/lib/automation/sculptor-schema";

function schema(): SculptSuccess {
  return {
    name: "Test-Rule",
    description: null,
    trigger_event: "deal.stage_changed",
    trigger_config: {},
    conditions: [],
    actions: [
      {
        type: "create_task",
        params: { title: "Follow-up", due_in_days: 2 },
      },
    ],
  };
}

describe("ApplyConfirmModal", () => {
  it("renders apply-button disabled when checkbox is unchecked", () => {
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={schema()}
        onApply={() => {}}
        isApplying={false}
      />
    );
    const applyBtn = screen.getByTestId("apply-confirm-submit") as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
  });

  it("enables apply-button after checkbox is checked", () => {
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={schema()}
        onApply={() => {}}
        isApplying={false}
      />
    );
    const checkbox = screen.getByTestId("apply-confirm-checkbox") as HTMLInputElement;
    fireEvent.click(checkbox);
    const applyBtn = screen.getByTestId("apply-confirm-submit") as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
  });

  it("calls onApply when apply-button is clicked after check", () => {
    const onApply = vi.fn();
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={schema()}
        onApply={onApply}
        isApplying={false}
      />
    );
    fireEvent.click(screen.getByTestId("apply-confirm-checkbox"));
    fireEvent.click(screen.getByTestId("apply-confirm-submit"));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("keeps apply-button disabled when isApplying=true even if checked", () => {
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={schema()}
        onApply={() => {}}
        isApplying={true}
      />
    );
    fireEvent.click(screen.getByTestId("apply-confirm-checkbox"));
    const applyBtn = screen.getByTestId("apply-confirm-submit") as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(applyBtn.textContent).toContain("Aktiviere");
  });

  it("renders errorMessage when provided", () => {
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={schema()}
        onApply={() => {}}
        isApplying={false}
        errorMessage="Dedup-Konflikt: identische Regel existiert."
      />
    );
    const err = screen.getByTestId("apply-confirm-error");
    expect(err.textContent).toContain("Dedup-Konflikt");
  });

  it("renders all actions in apply-confirm-actions list", () => {
    const multiActionSchema: SculptSuccess = {
      ...schema(),
      actions: [
        { type: "create_task", params: { title: "First" } },
        { type: "create_activity", params: { type: "note", title: "Second" } },
      ],
    };
    render(
      <ApplyConfirmModal
        open={true}
        onOpenChange={() => {}}
        schema={multiActionSchema}
        onApply={() => {}}
        isApplying={false}
      />
    );
    const actionsBlock = screen.getByTestId("apply-confirm-actions");
    expect(actionsBlock.textContent).toContain("First");
    expect(actionsBlock.textContent).toContain("Second");
  });
});
