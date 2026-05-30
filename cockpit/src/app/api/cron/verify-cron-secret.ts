import crypto from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Verify x-cron-secret header for /api/cron/* endpoints.
 * Returns null if valid, NextResponse with error if invalid.
 *
 * SEC-891 SEC-010: Uses crypto.timingSafeEqual to prevent timing-side-channel
 * attacks that could leak the secret one byte at a time via response-latency
 * differences. Pattern reused from cockpit/src/lib/calcom/webhook-handler.ts:61-67.
 * Signature unchanged for caller compatibility (17 cron routes).
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (!timingSafeStringEqual(secret ?? "", expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
