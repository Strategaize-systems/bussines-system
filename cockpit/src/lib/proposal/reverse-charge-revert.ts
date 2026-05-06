// V6.3 SLC-631 MT-4 — Reverse-Charge-Toggle UI-State-Drift Bugfix.
// Pattern 1:1 von skonto-revert.ts uebernommen (V5.7 SLC-572 DEC-126 Option A).
//
// Why: Wenn der Reverse-Charge-Toggle Server-side abgelehnt wird (Branding-
// vat_id fehlt, Company-vat_id fehlt, Company-Country nicht-EU oder NL,
// tax_rate inkonsistent — alle 4 Pfade aus validateReverseCharge), bleibt der
// optimistic State im Editor sonst auf {reverse_charge:true, tax_rate:0} bis
// Page-Reload. DB-State ist dabei korrekt, nur das UI driftet auseinander.
// Loesung: useRef-last-known-good + Revert-on-Reject (Defense-in-Depth).
//
// reverse_charge UND tax_rate sind durch validateReverseCharge gekoppelt
// (RC=true erfordert tax_rate=0). Daher behandeln wir BEIDE Felder
// gemeinsam als "RC-touching"-Patch.

export type ReverseChargeState = {
  reverse_charge: boolean;
  tax_rate: number;
};

type ReverseChargeTouchingPatch = {
  reverse_charge?: boolean;
  tax_rate?: number;
};

export function patchTouchesReverseCharge(
  patch: ReverseChargeTouchingPatch,
): boolean {
  return "reverse_charge" in patch || "tax_rate" in patch;
}

// Auf Save-Success: ref aktualisieren mit den im Patch enthaltenen Feldern.
// Nicht im Patch enthaltene Felder bleiben am letzten Stand. Anders als beim
// Skonto-Pattern sendet der Editor RC-Patches manchmal nur mit einem Feld
// (z.B. handleTaxRateChange sendet nur { tax_rate }), daher partial-merge.
export function nextReverseChargeRefAfterSave(
  prev: ReverseChargeState,
  patch: ReverseChargeTouchingPatch,
): ReverseChargeState {
  if (!patchTouchesReverseCharge(patch)) return prev;
  return {
    reverse_charge:
      "reverse_charge" in patch && patch.reverse_charge !== undefined
        ? patch.reverse_charge
        : prev.reverse_charge,
    tax_rate:
      "tax_rate" in patch && patch.tax_rate !== undefined
        ? patch.tax_rate
        : prev.tax_rate,
  };
}

// Auf Save-Error: nur dann ein Revert-Patch zurueckgeben, wenn der
// fehlgeschlagene Patch RC oder tax_rate beruehrt hat. Andere Felder
// (title, payment_terms, skonto_*) bleiben unangetastet.
export function revertPatchIfReverseChargeFailed(
  patch: ReverseChargeTouchingPatch,
  lastGood: ReverseChargeState,
): ReverseChargeState | null {
  if (!patchTouchesReverseCharge(patch)) return null;
  return {
    reverse_charge: lastGood.reverse_charge,
    tax_rate: lastGood.tax_rate,
  };
}
