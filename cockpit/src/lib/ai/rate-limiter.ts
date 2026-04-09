// =============================================================
// Rate Limiter — In-memory token bucket for AI API requests
// =============================================================

interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[];
}

/** Rate limit check result */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Seconds until the next request is allowed (only set when blocked) */
  retryAfter?: number;
  /** Current request count in the window */
  currentCount: number;
  /** Maximum allowed requests in the window */
  limit: number;
}

// Configuration
const MAX_REQUESTS_PER_WINDOW = 10;
const WINDOW_MS = 60_000; // 1 minute

// In-memory store — sufficient for single-user deployment, no Redis needed
const store = new Map<string, RateLimitEntry>();

/**
 * Cleans up expired entries from the store.
 * Called periodically to prevent memory leaks in long-running processes.
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(cleanupExpired, 5 * 60_000);
    // Allow the process to exit even if the interval is active
    if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
      cleanupInterval.unref();
    }
  }
}

/**
 * Checks whether a request from the given user is allowed under rate limits.
 *
 * @param userId - The user identifier to rate-limit against
 * @returns RateLimitResult indicating whether the request is allowed
 */
export function checkRateLimit(userId: string): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const entry = store.get(userId) ?? { timestamps: [] };

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded — calculate retry-after
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);

    return {
      allowed: false,
      retryAfter: Math.ceil(retryAfterMs / 1000),
      currentCount: entry.timestamps.length,
      limit: MAX_REQUESTS_PER_WINDOW,
    };
  }

  // Request allowed — record the timestamp
  entry.timestamps.push(now);
  store.set(userId, entry);

  return {
    allowed: true,
    currentCount: entry.timestamps.length,
    limit: MAX_REQUESTS_PER_WINDOW,
  };
}

/**
 * Resets rate limit state for a specific user.
 * Useful for testing or administrative purposes.
 */
export function resetRateLimit(userId: string): void {
  store.delete(userId);
}

/**
 * Resets all rate limit state.
 * Useful for testing.
 */
export function resetAllRateLimits(): void {
  store.clear();
}
