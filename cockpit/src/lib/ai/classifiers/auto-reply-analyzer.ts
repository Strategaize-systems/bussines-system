/**
 * Analyzes auto-reply emails to extract absence period information.
 */

export interface AbsenceInfo {
  /** Return date in ISO format (YYYY-MM-DD), null if not extractable */
  returnDate: string | null;
  /** Whether the return date was extracted (true) or defaulted (false) */
  extracted: boolean;
  /** The raw text snippet that contained the date info */
  sourceSnippet: string | null;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Parse a German-format date (DD.MM.YYYY or DD.MM.) into ISO date string.
 * Defaults year to current year if not provided.
 * Returns null for invalid dates.
 */
function parseGermanDate(
  dayStr: string,
  monthStr: string,
  yearStr?: string
): string | null {
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  let year: number;
  if (yearStr) {
    year = parseInt(yearStr, 10);
    if (isNaN(year)) return null;
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
  } else {
    year = new Date().getFullYear();
  }

  // Validate the date is real
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parse an English-format date (MM/DD/YYYY or MM/DD) into ISO date string.
 * Defaults year to current year if not provided.
 * Returns null for invalid dates.
 */
function parseEnglishDate(
  monthStr: string,
  dayStr: string,
  yearStr?: string
): string | null {
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  let year: number;
  if (yearStr) {
    year = parseInt(yearStr, 10);
    if (isNaN(year)) return null;
    if (year < 100) {
      year += 2000;
    }
  } else {
    year = new Date().getFullYear();
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Convert English month name to number (1-12).
 */
function monthNameToNumber(name: string): number | null {
  const months: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  return months[name.toLowerCase()] ?? null;
}

/**
 * Add one day to an ISO date string.
 * Used for "bis" patterns where the stated date is the last day of absence.
 */
function nextDay(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Default absence: 7 days from now.
 */
function defaultAbsence(): AbsenceInfo {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const y = future.getFullYear();
  const m = String(future.getMonth() + 1).padStart(2, "0");
  const d = String(future.getDate()).padStart(2, "0");
  return {
    returnDate: `${y}-${m}-${d}`,
    extracted: false,
    sourceSnippet: null,
  };
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extract return date from auto-reply text using regex patterns.
 * Handles German and English date formats.
 * Falls back to 7 days from now if no date found.
 */
export function extractAbsenceInfo(bodyText: string | null): AbsenceInfo {
  if (!bodyText) {
    return defaultAbsence();
  }

  const text = bodyText.slice(0, 2000).toLowerCase();

  // --- German patterns (most common in this system) ---

  // "bis (zum) DD.MM.YYYY"
  const bisPattern = /bis\s+(?:zum\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/i;
  const bisMatch = text.match(bisPattern);
  if (bisMatch) {
    const date = parseGermanDate(bisMatch[1], bisMatch[2], bisMatch[3]);
    if (date) {
      return { returnDate: nextDay(date), extracted: true, sourceSnippet: bisMatch[0] };
    }
  }

  // "ab (dem) DD.MM. wieder/erreichbar/zurück/im büro"
  const abPattern =
    /ab\s+(?:dem\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\s+(?:wieder|erreichbar|zurück|zurueck|im büro|im buero)/i;
  const abMatch = text.match(abPattern);
  if (abMatch) {
    const date = parseGermanDate(abMatch[1], abMatch[2], abMatch[3]);
    if (date) {
      return { returnDate: date, extracted: true, sourceSnippet: abMatch[0] };
    }
  }

  // "zurück am DD.MM."
  const zurueckPattern =
    /(?:zurück|zurueck)\s+(?:am\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/i;
  const zurueckMatch = text.match(zurueckPattern);
  if (zurueckMatch) {
    const date = parseGermanDate(zurueckMatch[1], zurueckMatch[2], zurueckMatch[3]);
    if (date) {
      return { returnDate: date, extracted: true, sourceSnippet: zurueckMatch[0] };
    }
  }

  // --- English patterns ---

  // "back on MM/DD/YYYY" or "return on MM/DD"
  const backOnPattern =
    /(?:back|return)\s+(?:on\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i;
  const backOnMatch = text.match(backOnPattern);
  if (backOnMatch) {
    const date = parseEnglishDate(backOnMatch[1], backOnMatch[2], backOnMatch[3]);
    if (date) {
      return { returnDate: date, extracted: true, sourceSnippet: backOnMatch[0] };
    }
  }

  // "until Month DD"
  const untilPattern =
    /until\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i;
  const untilMatch = text.match(untilPattern);
  if (untilMatch) {
    const monthNum = monthNameToNumber(untilMatch[1]);
    if (monthNum) {
      const year = new Date().getFullYear();
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(parseInt(untilMatch[2])).padStart(2, "0")}`;
      // Validate the date
      const check = new Date(date + "T00:00:00");
      if (!isNaN(check.getTime())) {
        return {
          returnDate: nextDay(date),
          extracted: true,
          sourceSnippet: untilMatch[0],
        };
      }
    }
  }

  // No date found — default to 7 days
  return defaultAbsence();
}
