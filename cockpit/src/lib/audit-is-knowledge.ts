// V8.7-A SLC-871 MT-3 — Pure-Helper fuer den IS-Knowledge-Audit-Payload.
//
// Diese Datei hat KEINE "use server"-Direktive: sie enthaelt nur Pure-
// Functions ohne Server-Side-Effekte und ist Vitest-testbar ohne Supabase-
// Mock. Der async-Wrapper logIsKnowledgeQuery lebt in src/lib/audit.ts und
// importiert von hier (Next.js erlaubt sync exports nur in nicht-"use
// server"-Files — sonst Turbopack-Build-Fehler "Server Actions must be
// async").

import type { AuditParams } from "./audit";

export interface IsKnowledgeQueryAuditParams {
  workspaceSessionId: string;
  workspacePage: "deal-detail";
  queryExcerpt: string;
  costUsd: number;
  itemCount: number;
  similarityTop: number | null;
  isResponseMs: number;
}

/**
 * Pure Helper — baut die AuditParams fuer einen IS-Knowledge-Query-Event
 * gemaess DEC-258 Schema. Einzeln testbar ohne Supabase-Mock.
 *
 * query_excerpt wird hier final auf 200 chars getrimmt (Defense-in-Depth
 * fuer audit_log-Schema — auch wenn der Caller bereits PII-redacted hat).
 */
export function buildIsKnowledgeQueryAuditParams(
  params: IsKnowledgeQueryAuditParams
): AuditParams {
  return {
    action: "knowledge_queried",
    entityType: "is_knowledge_api",
    entityId: params.workspaceSessionId,
    changes: {
      after: {
        workspace_page: params.workspacePage,
        consumer: "business-system",
        query_excerpt: params.queryExcerpt.slice(0, 200),
        cost_usd: params.costUsd,
        item_count: params.itemCount,
        similarity_top: params.similarityTop,
        is_response_ms: params.isResponseMs,
      },
    },
  };
}
