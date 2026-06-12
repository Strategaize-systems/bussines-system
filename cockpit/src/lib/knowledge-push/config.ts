// V8.7-B SLC-355 — Konfigurations-Helper fuer den BS->IS Verdichtungs-Cron.
//
// Alle Werte sind ENV-ueberschreibbar. Founder-Direktive 2026-06-12: am
// Anfang wird NICHTS uebersprungen (alle Deals zaehlen, gerade frueh) — daher
// Default-k-Anonymitaets-Schwelle = 1 (effektiv kein Skip). Der Mechanismus
// bleibt erhalten und kann spaeter via KNOWLEDGE_PUSH_MIN_BUCKET angehoben
// werden, sobald genug Deal-Volumen vorhanden ist (DEC-290, Founder-Override).

export type SizeBucket = "small" | "medium" | "large" | "unknown";

export interface SizeThresholds {
  /** deals.value < smallMax  -> "small". */
  smallMax: number;
  /** deals.value > largeMin  -> "large". Dazwischen -> "medium". */
  largeMin: number;
}

export const DEFAULT_SIZE_THRESHOLDS: SizeThresholds = {
  smallMax: 10_000,
  largeMin: 50_000,
};

/** Founder-Override 2026-06-12: kein Skip am Anfang. */
export const DEFAULT_MIN_BUCKET = 1;

/** Window fuer "letzte 7 Tage" (trailing). */
export const WINDOW_DAYS = 7;

/** Obergrenze fuer den Roh-Input in den Bedrock-Pass (R-355-3 Input deckeln). */
export const DEFAULT_MAX_NOTES_PER_GROUP = 50;

/**
 * k-Anonymitaets-Schwelle. Buckets/Gruppen mit weniger Deals/Notizen werden
 * uebersprungen. Default 1 = kein Skip (Founder-Direktive).
 */
export function getMinBucket(): number {
  const raw = process.env.KNOWLEDGE_PUSH_MIN_BUCKET;
  if (!raw) return DEFAULT_MIN_BUCKET;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MIN_BUCKET;
  return Math.floor(parsed);
}

/**
 * Deal-Groessen-Schwellen aus ENV `KNOWLEDGE_PUSH_SIZE_THRESHOLDS` ("smallMax,largeMin",
 * z.B. "10000,50000"). Faellt bei ungueltigem/fehlendem Wert auf Default zurueck.
 */
export function getSizeThresholds(): SizeThresholds {
  const raw = process.env.KNOWLEDGE_PUSH_SIZE_THRESHOLDS;
  if (!raw) return DEFAULT_SIZE_THRESHOLDS;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (
    parts.length !== 2 ||
    !Number.isFinite(parts[0]) ||
    !Number.isFinite(parts[1]) ||
    parts[0] <= 0 ||
    parts[1] <= parts[0]
  ) {
    return DEFAULT_SIZE_THRESHOLDS;
  }
  return { smallMax: parts[0], largeMin: parts[1] };
}

/**
 * Ordnet einen Deal-Wert einem Groessen-Bucket zu.
 * value === null/undefined -> "unknown".
 */
export function sizeBucketOf(
  value: number | null | undefined,
  thresholds: SizeThresholds = DEFAULT_SIZE_THRESHOLDS
): SizeBucket {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "unknown";
  }
  if (value < thresholds.smallMax) return "small";
  if (value > thresholds.largeMin) return "large";
  return "medium";
}
