/**
 * Shared Export-API Helpers (SLC-506)
 *
 * Pagination, Zeitraum-Filter, Response-Format.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyExportApiKey } from "./auth";
import { checkRateLimit, checkRateLimitByKey } from "./rate-limit";
import { resolveExportIdentity, type ExportIdentity } from "./tenant-auth";

export type ExportParams = {
  page: number;
  limit: number;
  since: string | null;
  until: string | null;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/**
 * Guards: API-Key + Rate-Limit. Returns NextResponse if blocked, null if OK.
 *
 * @deprecated V8.15 SLC-913 MT-7 — der globale EXPORT_API_KEY ohne Tenant-Scope
 * ist die ISSUE-116-Quelle. Neue/migrierte Read-APIs nutzen `guardExportTenant`
 * (per-Tenant-Key + identitaets-gebundener Rate-Limit + Scope-Filter).
 */
export function guardExportRequest(request: NextRequest): NextResponse | null {
  const authError = verifyExportApiKey(request);
  if (authError) return authError;

  const rateLimitError = checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  return null;
}

/**
 * V8.15 SLC-913 MT-7 (ISSUE-116, DEC-302): Tenant-scoped Export-Guard.
 * Loest den per-Tenant-Key zur Identitaet auf (resolveExportIdentity) und
 * rate-limitet auf die Key-Identitaet (nicht den spoofbaren x-forwarded-for).
 * Rueckgabe: ExportIdentity (Caller scopt seine Query auf identity.teamMemberIds)
 * oder NextResponse (401/429/500).
 */
export async function guardExportTenant(
  request: Request
): Promise<ExportIdentity | NextResponse> {
  const identity = await resolveExportIdentity(request);
  if (identity instanceof NextResponse) return identity;

  const rateLimitError = checkRateLimitByKey(`key:${identity.ownerUserId}`);
  if (rateLimitError) return rateLimitError;

  return identity;
}

/**
 * Parses pagination + date filter params from URL.
 */
export function parseExportParams(request: NextRequest): ExportParams {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const since = url.searchParams.get("since") || null;
  const until = url.searchParams.get("until") || null;

  return { page, limit, since, until };
}

/**
 * Builds JSON response with data + pagination metadata.
 */
export function exportResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  total: number,
  params: ExportParams
): NextResponse {
  const pagination: PaginationMeta = {
    page: params.page,
    limit: params.limit,
    total,
    hasMore: params.page * params.limit < total,
  };

  return NextResponse.json({ data, pagination });
}
