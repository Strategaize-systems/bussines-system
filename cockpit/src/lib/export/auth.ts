/**
 * Export API-Key Authentication (MT-1, SLC-506, DEC-067)
 *
 * Prueft Bearer Token gegen EXPORT_API_KEY ENV.
 * Wird von allen /api/export/* Endpoints verwendet.
 *
 * SEC-891 SEC-010: Uses crypto.timingSafeEqual to prevent timing-side-channel
 * attacks that could leak the API key one byte at a time via response-latency
 * differences. Pattern reused from cockpit/src/lib/calcom/webhook-handler.ts:61-67.
 * Signature unchanged for caller compatibility (6 export routes).
 */

import crypto from "node:crypto";
import { NextResponse } from "next/server";

export function verifyExportApiKey(request: Request): NextResponse | null {
  const expectedKey = process.env.EXPORT_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: "EXPORT_API_KEY not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }

  // Support "Bearer <key>" and plain "<key>"
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!timingSafeStringEqual(token, expectedKey)) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  return null; // Auth OK
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
