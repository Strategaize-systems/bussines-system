import { describe, it, expect } from "vitest";
import {
  nextSkontoRefAfterSave,
  patchTouchesSkonto,
  revertPatchIfSkontoFailed,
  type SkontoState,
} from "./skonto-revert";

describe("patchTouchesSkonto", () => {
  it("returns false for an empty patch", () => {
    expect(patchTouchesSkonto({})).toBe(false);
  });

  it("returns false for a patch object without skonto keys", () => {
    // EditorPatch baut Skonto-Patches immer mit beiden Keys explizit
    // gesetzt, also testen wir hier nur den Fall "Keys gar nicht im Objekt"
    // (z.B. ein reiner Title- oder PaymentTerms-Save).
    const titlePatch: { title?: string } = { title: "neu" };
    expect(patchTouchesSkonto(titlePatch)).toBe(false);
  });

  it("returns true when skonto_percent is explicitly present", () => {
    expect(patchTouchesSkonto({ skonto_percent: 2.0 })).toBe(true);
    expect(patchTouchesSkonto({ skonto_percent: null })).toBe(true);
  });

  it("returns true when skonto_days is explicitly present", () => {
    expect(patchTouchesSkonto({ skonto_days: 7 })).toBe(true);
    expect(patchTouchesSkonto({ skonto_days: null })).toBe(true);
  });
});

describe("nextSkontoRefAfterSave", () => {
  const prev: SkontoState = { skonto_percent: 2.0, skonto_days: 7 };

  it("keeps prev unchanged when patch does not touch skonto", () => {
    expect(nextSkontoRefAfterSave(prev, {})).toEqual(prev);
  });

  it("updates ref to patch values on a valid skonto save", () => {
    expect(nextSkontoRefAfterSave(prev, { skonto_percent: 3.5, skonto_days: 10 })).toEqual({
      skonto_percent: 3.5,
      skonto_days: 10,
    });
  });

  it("updates ref to {null,null} when toggle goes off via save-success", () => {
    expect(
      nextSkontoRefAfterSave(prev, { skonto_percent: null, skonto_days: null }),
    ).toEqual({ skonto_percent: null, skonto_days: null });
  });

  it("returns prev unchanged on multiple consecutive non-skonto saves", () => {
    let ref: SkontoState = prev;
    ref = nextSkontoRefAfterSave(ref, {});
    ref = nextSkontoRefAfterSave(ref, {});
    ref = nextSkontoRefAfterSave(ref, {});
    expect(ref).toEqual(prev);
  });
});

describe("revertPatchIfSkontoFailed", () => {
  const lastGood: SkontoState = { skonto_percent: 2.0, skonto_days: 7 };

  it("returns null when the failed patch did not touch skonto", () => {
    expect(revertPatchIfSkontoFailed({}, lastGood)).toBeNull();
  });

  it("returns the lastGood values when a skonto save fails", () => {
    expect(
      revertPatchIfSkontoFailed({ skonto_percent: 10, skonto_days: 7 }, lastGood),
    ).toEqual(lastGood);
  });

  it("returns the lastGood values when an invalid empty-percent save fails", () => {
    // RPT-277-Repro: User clears percent input -> patch {null, 7} -> server reject.
    expect(
      revertPatchIfSkontoFailed({ skonto_percent: null, skonto_days: 7 }, lastGood),
    ).toEqual(lastGood);
  });

  it("preserves lastGood across 5 consecutive failed saves", () => {
    // Simuliert RPT-277 5x Wiederholung: ref bleibt bei {2.0, 7}, jede Revert
    // gibt {2.0, 7} zurueck. AC7 / AC8.
    const reverts = [
      { skonto_percent: 10, skonto_days: 7 },
      { skonto_percent: null, skonto_days: 7 },
      { skonto_percent: 99, skonto_days: 7 },
      { skonto_percent: 2.0, skonto_days: 1000 },
      { skonto_percent: -1, skonto_days: 7 },
    ].map((patch) => revertPatchIfSkontoFailed(patch, lastGood));

    for (const result of reverts) {
      expect(result).toEqual(lastGood);
    }
  });

  it("works correctly with lastGood={null,null} (toggle was off)", () => {
    const offState: SkontoState = { skonto_percent: null, skonto_days: null };
    expect(
      revertPatchIfSkontoFailed({ skonto_percent: 2.0, skonto_days: 0 }, offState),
    ).toEqual(offState);
  });
});

describe("integration scenario — RPT-277 repro path", () => {
  it("user typing invalid 10 then clearing input, both saves fail, ref stays at last good", () => {
    let ref: SkontoState = { skonto_percent: 2.0, skonto_days: 7 };

    // 1. Initial save success {2.0, 7} bestaetigt vom Server -> ref bleibt
    ref = nextSkontoRefAfterSave(ref, { skonto_percent: 2.0, skonto_days: 7 });
    expect(ref).toEqual({ skonto_percent: 2.0, skonto_days: 7 });

    // 2. User typt 10 -> save error -> revert returned
    const revert1 = revertPatchIfSkontoFailed(
      { skonto_percent: 10, skonto_days: 7 },
      ref,
    );
    expect(revert1).toEqual({ skonto_percent: 2.0, skonto_days: 7 });

    // 3. User cleared input -> save error -> revert returned
    const revert2 = revertPatchIfSkontoFailed(
      { skonto_percent: null, skonto_days: 7 },
      ref,
    );
    expect(revert2).toEqual({ skonto_percent: 2.0, skonto_days: 7 });

    // ref blieb durchgaengig at last good
    expect(ref).toEqual({ skonto_percent: 2.0, skonto_days: 7 });
  });

  it("user typing valid value, save success updates ref to new value", () => {
    let ref: SkontoState = { skonto_percent: 2.0, skonto_days: 7 };

    // User aendert auf gueltiges 3.5 -> save success
    ref = nextSkontoRefAfterSave(ref, { skonto_percent: 3.5, skonto_days: 7 });
    expect(ref).toEqual({ skonto_percent: 3.5, skonto_days: 7 });

    // Nachfolgender Save-Error -> revert auf den neuen ref-Stand
    const revert = revertPatchIfSkontoFailed(
      { skonto_percent: 99, skonto_days: 7 },
      ref,
    );
    expect(revert).toEqual({ skonto_percent: 3.5, skonto_days: 7 });
  });

  it("non-skonto saves between skonto saves do not affect the ref", () => {
    let ref: SkontoState = { skonto_percent: 2.0, skonto_days: 7 };

    // Title-Save: ref bleibt
    ref = nextSkontoRefAfterSave(ref, {});
    expect(ref).toEqual({ skonto_percent: 2.0, skonto_days: 7 });

    // Skonto-Save: ref aktualisiert
    ref = nextSkontoRefAfterSave(ref, { skonto_percent: 5.0, skonto_days: 14 });
    expect(ref).toEqual({ skonto_percent: 5.0, skonto_days: 14 });

    // Wieder Title-Save: ref bleibt am aktuellen Skonto-Stand
    ref = nextSkontoRefAfterSave(ref, {});
    expect(ref).toEqual({ skonto_percent: 5.0, skonto_days: 14 });
  });
});
