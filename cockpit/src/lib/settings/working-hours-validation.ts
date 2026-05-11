// SLC-667 MT-7 — Pure-Function-Validation fuer Working-Hours-Eingaben.
// Spiegelt die MIG-032 CHECK-Constraint: (start IS NULL AND end IS NULL) OR start<end.

export interface WorkingHoursValidationResult {
  ok: boolean;
  error?: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Vergleicht 2 HH:MM-Strings als Tageszeiten.
 * @returns negative wenn a<b, 0 wenn gleich, positive wenn a>b
 */
export function compareTimes(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

export function validateWorkingHours(
  start: string | null,
  end: string | null,
): WorkingHoursValidationResult {
  const startEmpty = start === null || start === "";
  const endEmpty = end === null || end === "";

  if (startEmpty && endEmpty) {
    return { ok: true };
  }
  if (startEmpty || endEmpty) {
    return {
      ok: false,
      error: "Start- und End-Zeit muessen beide gesetzt sein oder beide leer.",
    };
  }
  if (!TIME_PATTERN.test(start!) || !TIME_PATTERN.test(end!)) {
    return {
      ok: false,
      error: "Zeit-Format muss HH:MM sein (z.B. 09:00).",
    };
  }
  if (compareTimes(start!, end!) >= 0) {
    return {
      ok: false,
      error: "Start-Zeit muss vor End-Zeit liegen.",
    };
  }
  return { ok: true };
}
