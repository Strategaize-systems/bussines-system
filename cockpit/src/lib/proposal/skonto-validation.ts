// V5.6 SLC-562 — Pure Validation fuer Skonto-Felder.
// Single-Source-of-Truth: wird im UI (live error) und in der Server Action
// (defense-in-depth gegen Bypass) gleichermassen genutzt.
// DEC-099 Pattern (V5.4) — pure Function, keine Side-Effects, keine I/O.

export type SkontoValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateSkonto(
  percent: number | null,
  days: number | null,
): SkontoValidationResult {
  // Off-State: beide null = gueltig (kein Skonto).
  if (percent === null && days === null) return { ok: true };

  // Halbleerer State: einer null, einer nicht.
  if (percent === null || days === null) {
    return {
      ok: false,
      error: "Beide Skonto-Felder muessen gesetzt sein",
    };
  }

  // Range-Checks (analog DB-CHECK proposals_skonto_percent_check / _days_check).
  if (!(percent > 0 && percent < 10)) {
    return {
      ok: false,
      error: "Skonto-Prozent muss > 0 und < 10 sein",
    };
  }

  if (!(days > 0 && days <= 90) || !Number.isInteger(days)) {
    return {
      ok: false,
      error: "Skonto-Tage muss eine ganze Zahl > 0 und <= 90 sein",
    };
  }

  return { ok: true };
}
