import { NextResponse } from "next/server";

/**
 * Verify x-cron-secret header for /api/cron/* endpoints.
 * Returns null if valid, NextResponse with error if invalid.
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

  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
