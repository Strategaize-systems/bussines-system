/**
 * Simple In-Memory Rate Limiter (MT-2, SLC-506)
 *
 * Zaehlt Requests pro IP-Adresse. >100 pro Minute → 429.
 * In-Memory: Resets bei Server-Restart. Ausreichend fuer Single-Instance.
 */

import { NextResponse } from "next/server";

const WINDOW_MS = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 100;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Returns NextResponse with 429 if rate limit exceeded, null if OK.
 */
export function checkRateLimit(request: Request): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return checkRateLimitByKey(`ip:${ip}`);
}

/**
 * V8.15 SLC-913 MT-7 (ISSUE-116): Rate-Limit auf eine explizite Identitaet
 * (z.B. die aufgeloeste Export-Key-owner_user_id) statt auf den client-
 * spoofbaren x-forwarded-for-Header. Der Tenant-scoped Export keyed damit auf
 * `key:<owner_user_id>` — ein Angreifer kann das Limit nicht per Header-Rotation
 * umgehen.
 */
export function checkRateLimitByKey(key: string): NextResponse | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}
