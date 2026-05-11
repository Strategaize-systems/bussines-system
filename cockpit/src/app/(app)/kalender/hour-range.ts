// SLC-667 MT-6 + MT-8 — Pure-Function-Logik fuer Kalender-Hour-Range.
//
// Default = 06:00-21:00 (DEFAULT_HOUR_RANGE).
// Mode "full" = Default-Range.
// Mode "work" = Working-Hours-Range, wenn gesetzt; sonst Fallback auf Default.

import type { WorkingHoursSettings } from "@/lib/settings/working-hours-actions";

export type HourRangeMode = "full" | "work";

export const DEFAULT_HOUR_RANGE = { start: 6, end: 21 } as const;

export interface HourRange {
  start: number;
  end: number;
  hours: number[];
}

export function buildHours(start: number, end: number): number[] {
  if (end <= start) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

/**
 * "HH:MM"-String → Stunde als Zahl. Floort Minuten ab.
 * Bei ungueltigem Input → null.
 */
export function parseHour(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  if (h < 0 || h > 23) return null;
  return h;
}

/**
 * Liefert die aktive Hour-Range basierend auf Toggle-Mode + Working-Hours.
 *
 * "full" oder fehlende/unvollstaendige Working-Hours ⇒ DEFAULT_HOUR_RANGE.
 * "work" + Working-Hours ⇒ Working-Hours-Range (mit ceil end damit Stunde der
 *   End-Zeit noch sichtbar ist).
 */
export function computeHourRange(
  mode: HourRangeMode,
  workingHours: WorkingHoursSettings | null | undefined,
): HourRange {
  if (mode === "work" && workingHours) {
    const start = parseHour(workingHours.start);
    const end = parseHour(workingHours.end);
    if (start !== null && end !== null && start < end) {
      // End-Stunde inkludieren (z.B. 18:00 Ende ⇒ 18 noch sichtbar)
      const endHour = end;
      return {
        start,
        end: endHour,
        hours: buildHours(start, endHour),
      };
    }
  }
  return {
    start: DEFAULT_HOUR_RANGE.start,
    end: DEFAULT_HOUR_RANGE.end,
    hours: buildHours(DEFAULT_HOUR_RANGE.start, DEFAULT_HOUR_RANGE.end),
  };
}

export function isWorkingHoursConfigured(
  wh: WorkingHoursSettings | null | undefined,
): boolean {
  if (!wh) return false;
  return parseHour(wh.start) !== null && parseHour(wh.end) !== null;
}
