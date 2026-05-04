// V5.7 SLC-572 — Skonto-Toggle UI-State-Drift Bugfix (DEC-126 Option A).
// Trennt die Revert-Decision aus der React-Component, damit sie ohne
// React-Testing-Library mit Vitest (node env, *.test.ts) testbar ist.
//
// Why: Bei Auto-Save-Error fuer Skonto-touching Patches darf der UI-State
// nicht im invaliden Zwischenzustand stehenbleiben (z.B. skonto_percent=null
// nach Empty-Input). Revert auf das letzte vom Server bestaetigte Wertepaar.

export type SkontoState = {
  skonto_percent: number | null;
  skonto_days: number | null;
};

type SkontoTouchingPatch = {
  skonto_percent?: number | null;
  skonto_days?: number | null;
};

export function patchTouchesSkonto(patch: SkontoTouchingPatch): boolean {
  return "skonto_percent" in patch || "skonto_days" in patch;
}

// Auf Save-Success: ref aktualisieren, falls der erfolgreiche Patch Skonto
// beruehrt hat. Andernfalls bleibt die ref unveraendert (z.B. bei reinem
// Title-Save).
export function nextSkontoRefAfterSave(
  prev: SkontoState,
  patch: SkontoTouchingPatch,
): SkontoState {
  if (!patchTouchesSkonto(patch)) return prev;
  return {
    skonto_percent: patch.skonto_percent ?? null,
    skonto_days: patch.skonto_days ?? null,
  };
}

// Auf Save-Error: nur dann ein Revert-Patch zurueckgeben, wenn der
// fehlgeschlagene Patch Skonto beruehrt hat. Andere Felder bleiben
// unangetastet (Skonto-Revert darf parallel laufende Edits an title/
// payment_terms nicht ueberschreiben).
export function revertPatchIfSkontoFailed(
  patch: SkontoTouchingPatch,
  lastGood: SkontoState,
): SkontoState | null {
  if (!patchTouchesSkonto(patch)) return null;
  return {
    skonto_percent: lastGood.skonto_percent,
    skonto_days: lastGood.skonto_days,
  };
}
