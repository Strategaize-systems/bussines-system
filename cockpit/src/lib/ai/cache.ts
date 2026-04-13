// =============================================================
// AI Query Cache — In-memory TTL cache for management queries
// =============================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a stable cache key from query type + context */
export function buildCacheKey(type: string, context: unknown): string {
  const contextStr = JSON.stringify(context, Object.keys(context as object).sort());
  return `${type}:${contextStr}`;
}

/** Get a cached result if it exists and is not expired */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/** Store a result in the cache with TTL */
export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/** Clean up expired entries */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

// Run cleanup periodically
if (typeof globalThis !== "undefined") {
  const key = "__ai_cache_cleanup";
  if (!(globalThis as any)[key]) {
    (globalThis as any)[key] = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  }
}
