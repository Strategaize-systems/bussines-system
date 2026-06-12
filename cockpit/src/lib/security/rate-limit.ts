type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 100;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Zaehlt einen Versuch fuer `key` und prueft gegen `limit` im `windowMs`-Fenster.
 * Inkrementiert den Bucket bei jedem Aufruf (mutierend).
 *
 * `windowMs` ist optional (Default 1h) — Bestandsaufrufer (z.B. consent.ts mit
 * 100/1h) bleiben unveraendert. Login (MT-2) ruft mit 5 / 15min.
 */
export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Read-only Lockout-Check ohne Inkrement. Fuer Pfade, die VOR einer teuren/
 * sensiblen Operation pruefen wollen, ob bereits gesperrt ist (Login: Lockout
 * pruefen BEVOR `signInWithPassword` ueberhaupt aufgerufen wird — eine gesperrte
 * Anfrage beruehrt GoTrue dann gar nicht).
 */
export function peekRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, remaining: limit, resetAt: now };
  }

  return {
    allowed: bucket.count < limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * Setzt den Zaehler fuer einen einzelnen Key zurueck — z.B. nach erfolgreichem
 * Login, damit erfolgreiche Anmeldungen den Fehlversuch-Counter leeren.
 */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function _resetRateLimitsForTests() {
  buckets.clear();
}
