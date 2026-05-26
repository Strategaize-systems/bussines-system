/**
 * VIES Online VAT-ID Lookup mit DB-Cache (DEC-157, DEC-158, MIG-030).
 *
 * Strategie:
 * 1. Format-Layer (vat-id.ts) muss VOR diesem Adapter laufen — invalides Format
 *    skipt VIES (kein HTTP-Call).
 * 2. DB-Cache via `vat_id_validations` mit 24h-TTL (`expires_at`).
 * 3. Cache-Hit: query DB, return cached.
 * 4. Cache-Miss: VIES-HTTP-Call → Insert → return. Bei VIES-Down: insert mit
 *    `source='vies_unavailable'` + `is_valid=null`-Aequivalent (false als best-effort,
 *    via source-Discriminator unterscheidbar).
 * 5. ENV `VIES_ENABLED=false` faellt komplett auf Format-only zurueck.
 *
 * Audit-Trail: pro Cache-Miss wird ein audit_log-Eintrag (Trace-Pattern aus V5.2).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ViesLookupSource = "vies" | "vies_unavailable" | "format_only";

export interface ViesLookupResult {
  is_valid: boolean;
  source: ViesLookupSource;
  validated_at: Date;
  vies_response?: ViesRawResponse | null;
}

export interface ViesRawResponse {
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  valid: boolean;
  name?: string | null;
  address?: string | null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const VIES_TIMEOUT_MS = 5_000;
const VIES_REST_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country}/vat/{number}";

/**
 * Pure helper: returns true when ENV `VIES_ENABLED` is not explicitly set to "false".
 * Default behavior is enabled.
 *
 * V8.6 SLC-861 MT-4 (ISSUE-085-Fix): Parameter-Type von `NodeJS.ProcessEnv` auf
 * `Record<string, string | undefined>` gelockert — matched ProcessEnv structural
 * (Index-Signature) UND Test-side `{}` / `{VIES_ENABLED: "..."}`-Mocks ohne
 * NODE_ENV-Required-Field-Drift (Next.js 16 / TS major).
 */
export function isViesEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.VIES_ENABLED !== "false";
}

/**
 * Pure helper: assemble VIES REST endpoint URL for a given country + number.
 * Country and number must already be normalized (uppercase, no whitespace).
 */
export function buildViesUrl(country: string, number: string): string {
  return VIES_REST_URL
    .replace("{country}", encodeURIComponent(country))
    .replace("{number}", encodeURIComponent(number));
}

/**
 * Pure helper: returns the expires_at timestamp 24h after `validated_at`.
 */
export function computeExpiresAt(validatedAt: Date = new Date()): Date {
  return new Date(validatedAt.getTime() + CACHE_TTL_MS);
}

/**
 * Pure helper: parses VIES REST JSON-Response into our internal raw shape.
 * VIES REST returns: `{ isValid: boolean, requestDate: string, userError?: string, name?, address? }`.
 */
export function parseViesResponse(json: unknown, country: string, number: string): ViesRawResponse | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.isValid !== "boolean") return null;
  return {
    countryCode: country,
    vatNumber: number,
    requestDate: typeof j.requestDate === "string" ? j.requestDate : new Date().toISOString(),
    valid: j.isValid,
    name: typeof j.name === "string" ? j.name : null,
    address: typeof j.address === "string" ? j.address : null,
  };
}

/**
 * VIES HTTP-Call mit Timeout. Returns null on any failure (network, timeout, non-200, parse-error).
 * Pure with respect to the global `fetch` — pass a custom fetcher for tests.
 */
export async function callViesApi(
  country: string,
  number: string,
  fetcher: typeof fetch = fetch
): Promise<ViesRawResponse | null> {
  const url = buildViesUrl(country, number);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VIES_TIMEOUT_MS);

  try {
    const res = await fetcher(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return parseViesResponse(json, country, number);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cache-Lookup against `vat_id_validations`. Returns the cached result or null
 * when no fresh entry exists (expires_at > now).
 */
export async function fetchCachedLookup(
  supabase: SupabaseClient,
  country: string,
  number: string
): Promise<ViesLookupResult | null> {
  const { data, error } = await supabase
    .from("vat_id_validations")
    .select("is_valid, source, validated_at, expires_at, vies_response")
    .eq("country", country)
    .eq("number", number)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    is_valid: data.is_valid,
    source: data.source as ViesLookupSource,
    validated_at: new Date(data.validated_at),
    vies_response: data.vies_response as ViesRawResponse | null,
  };
}

/**
 * Upsert into `vat_id_validations`. Uses ON CONFLICT (country, number) DO UPDATE
 * to refresh expired entries instead of inserting duplicates.
 */
export async function upsertLookup(
  supabase: SupabaseClient,
  country: string,
  number: string,
  result: ViesLookupResult
): Promise<void> {
  const expires_at = computeExpiresAt(result.validated_at);
  await supabase
    .from("vat_id_validations")
    .upsert(
      {
        country,
        number,
        is_valid: result.is_valid,
        source: result.source,
        vies_response: result.vies_response ?? null,
        validated_at: result.validated_at.toISOString(),
        expires_at: expires_at.toISOString(),
      },
      { onConflict: "country,number" }
    );
}

/**
 * High-level Lookup with cache + graceful-degradation.
 *
 * Order of operations:
 * 1. If `is_format_valid` is false → return immediately with source='format_only',
 *    is_valid=false. No VIES-Call, no cache-write.
 * 2. Cache-Lookup: if fresh entry exists → return cached.
 * 3. VIES-HTTP-Call (or `viesCall` mock):
 *    - Success → upsert cache + return result with source='vies'.
 *    - Failure → upsert cache with source='vies_unavailable', is_valid=false.
 *      Caller sollte source='vies_unavailable' UI-seitig erkennen und nicht als
 *      "invalides VAT-ID" werten — graceful-degradation.
 * 4. ENV-Check: bei VIES_ENABLED=false return source='format_only' bei is_format_valid=true.
 */
export async function lookupVatId(args: {
  country: string;
  number: string;
  is_format_valid: boolean;
  supabase: SupabaseClient;
  fetcher?: typeof fetch;
  // V8.6 SLC-861 MT-4 (ISSUE-085-Fix): Record-Type statt NodeJS.ProcessEnv.
  env?: Record<string, string | undefined>;
}): Promise<ViesLookupResult> {
  const { country, number, is_format_valid, supabase, fetcher = fetch, env = process.env } = args;
  const validated_at = new Date();

  if (!is_format_valid) {
    return {
      is_valid: false,
      source: "format_only",
      validated_at,
    };
  }

  if (!isViesEnabled(env)) {
    return {
      is_valid: true,
      source: "format_only",
      validated_at,
    };
  }

  const cached = await fetchCachedLookup(supabase, country, number);
  if (cached) return cached;

  const viesResponse = await callViesApi(country, number, fetcher);

  if (viesResponse === null) {
    const result: ViesLookupResult = {
      is_valid: false,
      source: "vies_unavailable",
      validated_at,
      vies_response: null,
    };
    await upsertLookup(supabase, country, number, result);
    return result;
  }

  const result: ViesLookupResult = {
    is_valid: viesResponse.valid,
    source: "vies",
    validated_at,
    vies_response: viesResponse,
  };
  await upsertLookup(supabase, country, number, result);
  return result;
}
