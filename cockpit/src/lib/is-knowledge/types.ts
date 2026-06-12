// V8.7-A SLC-871 MT-1 — IS-Knowledge-API Konsumenten-Types (DEC-256).
//
// Response-Shape mirror der IS V3.5 SLC-352 Knowledge-API:
//   src/app/api/knowledge/search/route.ts (KnowledgeSearchHit + Response)
//   src/app/api/knowledge/item/[id]/route.ts (Single-Item-Response)
//
// zod-Schemas sind tolerant gegenueber zukuenftigen Felder-Ergaenzungen in
// IS (default: unbekannte Keys werden gestrippt, nicht abgelehnt).

import { z } from "zod";

export const DOMAINS = [
  "sales",
  "onboarding",
  "general",
  "marketing",
  "product",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const KnowledgeSearchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  body_markdown: z.string(),
  domain: z.string(),
  tags: z.array(z.string()),
  source_system: z.string(),
  source_reference: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  similarity: z.number(),
});

export type KnowledgeSearchHit = z.infer<typeof KnowledgeSearchHitSchema>;

export const IsKnowledgeSearchResponseSchema = z.object({
  items: z.array(KnowledgeSearchHitSchema),
  query_embedding_cost_usd: z.number(),
  total_ms: z.number(),
});

export type IsKnowledgeSearchResult = z.infer<
  typeof IsKnowledgeSearchResponseSchema
>;

export const KnowledgeItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body_markdown: z.string(),
  domain: z.string(),
  tags: z.array(z.string()),
  source_system: z.string(),
  source_reference: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export type IsKnowledgeItem = z.infer<typeof KnowledgeItemSchema>;

export const IsKnowledgeItemResponseSchema = z.object({
  item: KnowledgeItemSchema,
});

// V8.7-B SLC-355 MT-1 — Ingest-Item-Shape (DEC-289).
//
// Wire-Shape fuer POST /api/knowledge/ingest. Der IS-Endpoint erzwingt
// serverseitig aggregation_level='aggregated', source_tenant_id=null,
// source_consultant_id=null, pii_redacted=true — diese Felder NICHT senden
// (werden serverseitig gesetzt). Extra-Felder werden serverseitig verworfen.
export interface IsKnowledgeIngestItem {
  /** ≥1 Zeichen. */
  title: string;
  /** ≥1 Zeichen. */
  body_markdown: string;
  domain: Domain;
  /** Konstant "business_system" fuer BS-Push. */
  source_system: "business_system";
  /** Dedup-Key (UNIQUE(source_system, source_reference) IS-seitig). ≥1 Zeichen. */
  source_reference: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

// Antwort-Shape von POST /api/knowledge/ingest (200 alle ok / 207 Teil-Fail).
export const IsKnowledgeIngestResponseSchema = z.object({
  inserted: z.number(),
  deduped: z.number(),
  failed: z.number(),
});

export type IsKnowledgeIngestResult = z.infer<
  typeof IsKnowledgeIngestResponseSchema
>;

export type IsKnowledgeErrorKind =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "server"
  | "network";

/**
 * Typisierte Fehler-Klasse fuer IS-Knowledge-API-Aufrufe. Caller entscheidet
 * pro `kind` ueber Graceful-Degradation (DEC-256). retryAfterSeconds nur
 * fuer kind="rate_limit" gesetzt (aus Retry-After Header oder Body).
 */
export class IsKnowledgeError extends Error {
  public readonly kind: IsKnowledgeErrorKind;
  public readonly status?: number;
  public readonly retryAfterSeconds?: number;

  constructor(
    kind: IsKnowledgeErrorKind,
    status?: number,
    retryAfterSeconds?: number,
    message?: string
  ) {
    super(
      message ??
        `IsKnowledgeError(kind=${kind}${status !== undefined ? `, status=${status}` : ""})`
    );
    this.name = "IsKnowledgeError";
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
