// V8.7-A SLC-871 MT-1 — IS-Knowledge-API Konsumenten-Adapter (DEC-253).
//
// Server-Side-only Module. Kein "use client"-Direktive im File. Caller
// duerfen das Modul ausschliesslich aus Server-Actions / API-Routes /
// Server-Components importieren — sonst landet der Service-Key im
// Browser-Bundle (siehe DEC-253 + MT-8 Build-Time-Leak-Check).
//
// Pattern aus strategaize-intelligence-studio/src/lib/api/serviceKeyAuth.ts
// (Header-Mechanik) — Mirror auf Konsumenten-Seite. Auth-Header werden auf
// jedem Request gesetzt, Service-Key kommt aus ENV.

import { redactPiiFromQ } from "./redact-pii";
import {
  IsKnowledgeError,
  IsKnowledgeItemResponseSchema,
  IsKnowledgeSearchResponseSchema,
  type Domain,
  type IsKnowledgeItem,
  type IsKnowledgeSearchResult,
} from "./types";

const DEFAULT_BASE_URL = "https://is.strategaizetransition.com";
const DEFAULT_TIMEOUT_MS = 4000;
const CONSUMER_ID = "business-system";

function getBaseUrl(): string {
  return (
    process.env.STRATEGAIZE_KNOWLEDGE_API_BASE_URL ?? DEFAULT_BASE_URL
  );
}

function getServiceKey(): string {
  const key = process.env.STRATEGAIZE_KNOWLEDGE_SERVICE_KEY;
  if (!key || key.length === 0) {
    throw new Error(
      "STRATEGAIZE_KNOWLEDGE_SERVICE_KEY ENV is not set. Configure the " +
        "service key in Coolify before invoking the IS-Knowledge-API."
    );
  }
  return key;
}

function buildAuthHeaders(): Record<string, string> {
  return {
    "x-strategaize-service-key": getServiceKey(),
    "x-strategaize-consumer": CONSUMER_ID,
    Accept: "application/json",
  };
}

/**
 * Verbindet einen optionalen Caller-Signal mit unserem Timeout-Controller.
 * Wenn der Caller seinen Signal abbricht, brechen wir auch ab. Wenn unser
 * Timeout feuert, brechen wir ab (Caller-Signal bleibt unberuehrt).
 */
function startRequestController(
  callerSignal: AbortSignal | undefined
): { controller: AbortController; timer: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS
  );
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true }
      );
    }
  }
  return { controller, timer };
}

function toIsKnowledgeError(e: unknown): IsKnowledgeError {
  if (e instanceof IsKnowledgeError) return e;
  const err = e as { name?: string; message?: string };
  if (err?.name === "AbortError") {
    return new IsKnowledgeError(
      "timeout",
      undefined,
      undefined,
      "IS request timed out"
    );
  }
  return new IsKnowledgeError(
    "network",
    undefined,
    undefined,
    err?.message ?? "network failure"
  );
}

async function parseRateLimit(response: Response): Promise<number | undefined> {
  const headerValue = response.headers.get("Retry-After");
  if (headerValue) {
    const parsed = Number(headerValue);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  try {
    const body = (await response.clone().json()) as {
      retry_after_seconds?: number;
    };
    if (typeof body.retry_after_seconds === "number") {
      return body.retry_after_seconds;
    }
  } catch {
    // Body might not be JSON; fall through.
  }
  return undefined;
}

export interface SearchKnowledgeOptions {
  domain?: Domain;
  limit?: number;
  signal?: AbortSignal;
}

/**
 * Sucht im IS-Knowledge-Index per pgvector-Cosine-Similarity.
 *
 * DEC-250: `q` wird Adapter-intern via redactPiiFromQ vor dem Wire-Call
 *          transparent gefiltert (Email + Phone -> [email]/[phone]). Der
 *          Caller uebergibt unredacted, der Adapter sorgt fuer DSGVO-
 *          Konformitaet — keine Vergesslich-Falle.
 * DEC-253: Service-Key kommt aus ENV ohne NEXT_PUBLIC_-Prefix, ist
 *          Server-Side-only.
 * DEC-256: Fehler werden als IsKnowledgeError mit `kind` geworfen, Caller
 *          entscheidet Graceful-Degradation.
 */
export async function searchKnowledge(
  q: string,
  opts: SearchKnowledgeOptions = {}
): Promise<IsKnowledgeSearchResult> {
  const redacted = redactPiiFromQ(q);

  const url = new URL("/api/knowledge/search", getBaseUrl());
  url.searchParams.set("q", redacted);
  if (opts.domain) url.searchParams.set("domain", opts.domain);
  if (opts.limit !== undefined) {
    url.searchParams.set("limit", String(opts.limit));
  }

  const { controller, timer } = startRequestController(opts.signal);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: buildAuthHeaders(),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw toIsKnowledgeError(e);
  }
  clearTimeout(timer);

  if (!response.ok) {
    if (response.status === 401) {
      throw new IsKnowledgeError("auth", 401);
    }
    if (response.status === 429) {
      const retryAfterSeconds = await parseRateLimit(response);
      throw new IsKnowledgeError("rate_limit", 429, retryAfterSeconds);
    }
    throw new IsKnowledgeError("server", response.status);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new IsKnowledgeError(
      "server",
      response.status,
      undefined,
      "IS response was not valid JSON"
    );
  }
  const parsed = IsKnowledgeSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new IsKnowledgeError(
      "server",
      response.status,
      undefined,
      "IS response schema mismatch"
    );
  }
  return parsed.data;
}

/**
 * Single-Item-Lookup. V8.7-A nutzt diese Funktion nicht direkt im Free-
 * Question-Pfad, exportiert sie aber fuer kuenftige Caller (z.B. Klickbarer
 * Item-Titel im AnswerPane-Block, V8.7.1-Polish).
 */
export async function getKnowledgeItem(
  id: string,
  opts: { signal?: AbortSignal } = {}
): Promise<IsKnowledgeItem> {
  const url = new URL(
    `/api/knowledge/item/${encodeURIComponent(id)}`,
    getBaseUrl()
  );

  const { controller, timer } = startRequestController(opts.signal);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: buildAuthHeaders(),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw toIsKnowledgeError(e);
  }
  clearTimeout(timer);

  if (!response.ok) {
    if (response.status === 401) {
      throw new IsKnowledgeError("auth", 401);
    }
    if (response.status === 429) {
      const retryAfterSeconds = await parseRateLimit(response);
      throw new IsKnowledgeError("rate_limit", 429, retryAfterSeconds);
    }
    throw new IsKnowledgeError("server", response.status);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new IsKnowledgeError(
      "server",
      response.status,
      undefined,
      "IS response was not valid JSON"
    );
  }
  const parsed = IsKnowledgeItemResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new IsKnowledgeError(
      "server",
      response.status,
      undefined,
      "IS response schema mismatch"
    );
  }
  return parsed.data.item;
}

export { IsKnowledgeError } from "./types";
export type {
  Domain,
  IsKnowledgeItem,
  IsKnowledgeSearchResult,
  KnowledgeSearchHit,
} from "./types";
