/**
 * Export API-Key Authentication (MT-1, SLC-506, DEC-067)
 *
 * Prueft Bearer Token gegen EXPORT_API_KEY ENV.
 * Wird von allen /api/export/* Endpoints verwendet.
 * Seit V8.15 (SLC-913 MT-5) zusaetzlich: verifyLeadIntakeApiKey gegen den
 * separaten write-scoped LEAD_INTAKE_API_KEY (ISSUE-118).
 *
 * SEC-891 SEC-010: Uses crypto.timingSafeEqual to prevent timing-side-channel
 * attacks that could leak the API key one byte at a time via response-latency
 * differences. Pattern reused from cockpit/src/lib/calcom/webhook-handler.ts:61-67.
 * Signature unchanged for caller compatibility (6 export routes).
 */

import crypto from "node:crypto";
import { NextResponse } from "next/server";

export function verifyExportApiKey(request: Request): NextResponse | null {
  return verifyBearerKeyAgainstEnv(request, "EXPORT_API_KEY");
}

/**
 * V8.15 SLC-913 MT-5 (ISSUE-118): Lead-Intake bekommt einen eigenen
 * write-scoped Key. Der read-scoped EXPORT_API_KEY autorisiert keine
 * Schreib-Endpoints mehr — Key-Kompromittierung auf Export-Seite kann damit
 * keine Leads/Contacts mehr anlegen.
 */
export function verifyLeadIntakeApiKey(request: Request): NextResponse | null {
  return verifyBearerKeyAgainstEnv(request, "LEAD_INTAKE_API_KEY");
}

function verifyBearerKeyAgainstEnv(
  request: Request,
  envVar: string
): NextResponse | null {
  const expectedKey = process.env[envVar];

  if (!expectedKey) {
    return NextResponse.json(
      { error: `${envVar} not configured` },
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
