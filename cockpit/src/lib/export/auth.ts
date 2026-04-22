/**
 * Export API-Key Authentication (MT-1, SLC-506, DEC-067)
 *
 * Prueft Bearer Token gegen EXPORT_API_KEY ENV.
 * Wird von allen /api/export/* Endpoints verwendet.
 */

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

  if (token !== expectedKey) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  return null; // Auth OK
}
