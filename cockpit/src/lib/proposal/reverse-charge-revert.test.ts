import { describe, it, expect } from "vitest";
import {
  nextReverseChargeRefAfterSave,
  patchTouchesReverseCharge,
  revertPatchIfReverseChargeFailed,
  type ReverseChargeState,
} from "./reverse-charge-revert";

describe("patchTouchesReverseCharge", () => {
  it("returns false for an empty patch", () => {
    expect(patchTouchesReverseCharge({})).toBe(false);
  });

  it("returns false for a patch object without RC keys", () => {
    const titlePatch: { title?: string } = { title: "neu" };
    expect(patchTouchesReverseCharge(titlePatch)).toBe(false);
  });

  it("returns true when reverse_charge is explicitly present", () => {
    expect(patchTouchesReverseCharge({ reverse_charge: true })).toBe(true);
    expect(patchTouchesReverseCharge({ reverse_charge: false })).toBe(true);
  });

  it("returns true when tax_rate is explicitly present", () => {
    expect(patchTouchesReverseCharge({ tax_rate: 19 })).toBe(true);
    expect(patchTouchesReverseCharge({ tax_rate: 0 })).toBe(true);
  });

  it("returns true when both fields are present (RC-toggle-ON pattern)", () => {
    expect(
      patchTouchesReverseCharge({ reverse_charge: true, tax_rate: 0 }),
    ).toBe(true);
  });
});

describe("nextReverseChargeRefAfterSave", () => {
  const prev: ReverseChargeState = { reverse_charge: false, tax_rate: 21 };

  it("keeps prev unchanged when patch does not touch RC", () => {
    expect(nextReverseChargeRefAfterSave(prev, {})).toEqual(prev);
  });

  it("updates both fields on a valid RC-toggle-ON save", () => {
    expect(
      nextReverseChargeRefAfterSave(prev, {
        reverse_charge: true,
        tax_rate: 0,
      }),
    ).toEqual({ reverse_charge: true, tax_rate: 0 });
  });

  it("updates both fields on a valid RC-toggle-OFF save", () => {
    const onState: ReverseChargeState = { reverse_charge: true, tax_rate: 0 };
    expect(
      nextReverseChargeRefAfterSave(onState, {
        reverse_charge: false,
        tax_rate: 21,
      }),
    ).toEqual({ reverse_charge: false, tax_rate: 21 });
  });

  it("partial patch with only tax_rate keeps reverse_charge from prev", () => {
    // handleTaxRateChange sends { tax_rate: next } only — RC-state unchanged.
    expect(nextReverseChargeRefAfterSave(prev, { tax_rate: 19 })).toEqual({
      reverse_charge: false,
      tax_rate: 19,
    });
  });

  it("partial patch with only reverse_charge keeps tax_rate from prev", () => {
    // Hypothetical: future code path that sends only reverse_charge field.
    expect(nextReverseChargeRefAfterSave(prev, { reverse_charge: true })).toEqual({
      reverse_charge: true,
      tax_rate: 21,
    });
  });
});

describe("revertPatchIfReverseChargeFailed — 4 reject paths from validateReverseCharge", () => {
  const lastGood: ReverseChargeState = { reverse_charge: false, tax_rate: 21 };

  it("returns null when the failed patch did not touch RC", () => {
    expect(revertPatchIfReverseChargeFailed({}, lastGood)).toBeNull();
  });

  it("Pfad 1: tax_rate-only patch with RC=true rejected (tax_rate must be 0)", () => {
    // User toggled RC=true earlier (now lastGood says false:21 because that
    // was the last server-confirmed state), but UI tries tax_rate=21 patch.
    // Server rejects. Revert to lastGood.
    expect(
      revertPatchIfReverseChargeFailed({ tax_rate: 21 }, lastGood),
    ).toEqual(lastGood);
  });

  it("Pfad 2: RC-toggle-ON rejected because branding.vat_id missing", () => {
    expect(
      revertPatchIfReverseChargeFailed(
        { reverse_charge: true, tax_rate: 0 },
        lastGood,
      ),
    ).toEqual(lastGood);
  });

  it("Pfad 3: RC-toggle-ON rejected because company.vat_id missing", () => {
    // Same shape as Pfad 2 from the patch's perspective — server returns
    // different error message, but Revert-Logic is identical.
    expect(
      revertPatchIfReverseChargeFailed(
        { reverse_charge: true, tax_rate: 0 },
        lastGood,
      ),
    ).toEqual(lastGood);
  });

  it("Pfad 4: RC-toggle-ON rejected because company.country is NL or non-EU", () => {
    expect(
      revertPatchIfReverseChargeFailed(
        { reverse_charge: true, tax_rate: 0 },
        lastGood,
      ),
    ).toEqual(lastGood);
  });

  it("preserves lastGood across 5 consecutive failed saves", () => {
    const reverts = [
      { reverse_charge: true, tax_rate: 0 },
      { reverse_charge: true, tax_rate: 0 },
      { tax_rate: 0 },
      { tax_rate: 19 },
      { reverse_charge: false, tax_rate: 0 },
    ].map((patch) => revertPatchIfReverseChargeFailed(patch, lastGood));

    for (const result of reverts) {
      expect(result).toEqual(lastGood);
    }
  });

  it("works correctly with lastGood={reverse_charge:true, tax_rate:0}", () => {
    const onState: ReverseChargeState = { reverse_charge: true, tax_rate: 0 };
    // User tried to switch tax_rate=19 while RC=true → server rejects
    expect(
      revertPatchIfReverseChargeFailed({ tax_rate: 19 }, onState),
    ).toEqual(onState);
  });
});

describe("integration scenario — RC-toggle ON without prerequisites", () => {
  it("user toggles RC=true 3x, all saves fail, ref stays at last-known-good off-state", () => {
    const ref: ReverseChargeState = { reverse_charge: false, tax_rate: 21 };

    // Initial state is OFF / 21% (lastGood already at initial proposal state).
    // User toggles ON. Server rejects (branding.vat_id missing).
    const revert1 = revertPatchIfReverseChargeFailed(
      { reverse_charge: true, tax_rate: 0 },
      ref,
    );
    expect(revert1).toEqual({ reverse_charge: false, tax_rate: 21 });

    // User toggles ON again (after dismissing toast). Same reject.
    const revert2 = revertPatchIfReverseChargeFailed(
      { reverse_charge: true, tax_rate: 0 },
      ref,
    );
    expect(revert2).toEqual({ reverse_charge: false, tax_rate: 21 });

    // User toggles ON one more time. Same reject.
    const revert3 = revertPatchIfReverseChargeFailed(
      { reverse_charge: true, tax_rate: 0 },
      ref,
    );
    expect(revert3).toEqual({ reverse_charge: false, tax_rate: 21 });

    // ref blieb durchgaengig at last good (initial off-state).
    expect(ref).toEqual({ reverse_charge: false, tax_rate: 21 });
  });

  it("user toggles ON successfully, then tries invalid tax_rate, save fails, ref reverts to ON-state", () => {
    let ref: ReverseChargeState = { reverse_charge: false, tax_rate: 21 };

    // Toggle-ON success — ref updates to {true, 0}.
    ref = nextReverseChargeRefAfterSave(ref, {
      reverse_charge: true,
      tax_rate: 0,
    });
    expect(ref).toEqual({ reverse_charge: true, tax_rate: 0 });

    // User accidentally clicks tax_rate=19 (UI keeps reverseCharge state but
    // updates dropdown). Server rejects (Pfad 1: RC requires tax=0).
    const revert = revertPatchIfReverseChargeFailed({ tax_rate: 19 }, ref);
    expect(revert).toEqual({ reverse_charge: true, tax_rate: 0 });
  });

  it("non-RC saves between RC saves do not affect the ref", () => {
    let ref: ReverseChargeState = { reverse_charge: false, tax_rate: 21 };

    // Title-Save: ref bleibt unveraendert.
    ref = nextReverseChargeRefAfterSave(ref, {});
    expect(ref).toEqual({ reverse_charge: false, tax_rate: 21 });

    // RC-Toggle-ON Success: ref aktualisiert sich.
    ref = nextReverseChargeRefAfterSave(ref, {
      reverse_charge: true,
      tax_rate: 0,
    });
    expect(ref).toEqual({ reverse_charge: true, tax_rate: 0 });

    // Wieder Title-Save: ref bleibt am ON-State.
    ref = nextReverseChargeRefAfterSave(ref, {});
    expect(ref).toEqual({ reverse_charge: true, tax_rate: 0 });
  });
});
