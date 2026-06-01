import { describe, expect, it } from "vitest";

import { buildIsKnowledgeQueryAuditParams } from "@/lib/audit-is-knowledge";

describe("buildIsKnowledgeQueryAuditParams — V8.7-A SLC-871 MT-3 (DEC-258)", () => {
  it("builds AuditParams with action='knowledge_queried' and entityType='is_knowledge_api'", () => {
    const params = buildIsKnowledgeQueryAuditParams({
      workspaceSessionId: "session-uuid-1",
      workspacePage: "deal-detail",
      queryExcerpt: "Vollmacht-Klausel bei [email]",
      costUsd: 0.0001,
      itemCount: 3,
      similarityTop: 0.95,
      isResponseMs: 142,
    });

    expect(params.action).toBe("knowledge_queried");
    expect(params.entityType).toBe("is_knowledge_api");
    expect(params.entityId).toBe("session-uuid-1");
  });

  it("packs DEC-258 schema fields into changes.after", () => {
    const params = buildIsKnowledgeQueryAuditParams({
      workspaceSessionId: "session-uuid-2",
      workspacePage: "deal-detail",
      queryExcerpt: "Pattern fuer DSB",
      costUsd: 0.00012,
      itemCount: 5,
      similarityTop: 0.87,
      isResponseMs: 220,
    });

    expect(params.changes?.after).toEqual({
      workspace_page: "deal-detail",
      consumer: "business-system",
      query_excerpt: "Pattern fuer DSB",
      cost_usd: 0.00012,
      item_count: 5,
      similarity_top: 0.87,
      is_response_ms: 220,
    });
  });

  it("truncates query_excerpt to max 200 chars (defense-in-depth even when caller already redacted)", () => {
    const longExcerpt = "x".repeat(500);
    const params = buildIsKnowledgeQueryAuditParams({
      workspaceSessionId: "session-uuid-3",
      workspacePage: "deal-detail",
      queryExcerpt: longExcerpt,
      costUsd: 0.0001,
      itemCount: 0,
      similarityTop: null,
      isResponseMs: 50,
    });

    const after = params.changes?.after as { query_excerpt: string };
    expect(after.query_excerpt.length).toBe(200);
    expect(after.query_excerpt).toBe("x".repeat(200));
  });

  it("preserves similarityTop=null when no hits returned", () => {
    const params = buildIsKnowledgeQueryAuditParams({
      workspaceSessionId: "session-uuid-4",
      workspacePage: "deal-detail",
      queryExcerpt: "nichts dergleichen",
      costUsd: 0.00009,
      itemCount: 0,
      similarityTop: null,
      isResponseMs: 88,
    });

    const after = params.changes?.after as { similarity_top: number | null; item_count: number };
    expect(after.similarity_top).toBeNull();
    expect(after.item_count).toBe(0);
  });
});
