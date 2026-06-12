// V8.7-B SLC-355 MT-6 — Cron-Orchestrierung. Deckt AC-355-6/7/8.

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST, runKnowledgePush, type KnowledgePushDeps } from "./route";
import type { ObjectionGroup, WinLossBucket } from "@/lib/knowledge-push/types";
import type { DistillResult } from "@/lib/knowledge-push/distill";
import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";

const NOW = new Date("2026-06-14T02:00:00Z");
const RUN_ID = "00000000-0000-4000-8000-000000000abc";

function bucket(overrides: Partial<WinLossBucket> = {}): WinLossBucket {
  return {
    branche: "Beratung",
    sizeBucket: "small",
    targetStatus: "won",
    dealCount: 3,
    runMarkdowns: ["x"],
    ...overrides,
  };
}
function group(overrides: Partial<ObjectionGroup> = {}): ObjectionGroup {
  return { branche: "IT", noteCount: 2, notes: ["a"], ...overrides };
}

interface AuditState {
  rows: Record<string, unknown>[];
  error: { message: string } | null;
}
function makeAudit(state: AuditState) {
  return {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          state.rows.push(row);
          return Promise.resolve({ error: state.error });
        },
      };
    },
  };
}

function makeDeps(
  over: Partial<KnowledgePushDeps> & { auditState?: AuditState } = {}
): { deps: KnowledgePushDeps; audit: AuditState; ingestCalls: IsKnowledgeIngestItem[][] } {
  const audit = over.auditState ?? { rows: [], error: null };
  const ingestCalls: IsKnowledgeIngestItem[][] = [];
  const distilled: DistillResult = { markdown: "## Lessons", costUsd: 0.004 };
  const deps: KnowledgePushDeps = {
    admin: makeAudit(audit),
    aggregateWinLoss: over.aggregateWinLoss ?? (async () => [bucket()]),
    gatherObjectionNotes: over.gatherObjectionNotes ?? (async () => [group()]),
    distillWinLossBucket: over.distillWinLossBucket ?? (async () => distilled),
    classifyObjections: over.classifyObjections ?? (async () => distilled),
    ingestKnowledge:
      over.ingestKnowledge ??
      (async (items) => {
        ingestCalls.push(items);
        return { inserted: items.length, deduped: 0, failed: 0 };
      }),
  };
  return { deps, audit, ingestCalls };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runKnowledgePush — happy path (AC-355-4/6/8)", () => {
  it("baut Items, pusht redacted, schreibt genau eine audit_log-Row", async () => {
    const { deps, audit, ingestCalls } = makeDeps();

    const result = await runKnowledgePush(deps, NOW, RUN_ID);

    expect(result.success).toBe(true);
    expect(result.run_id).toBe(RUN_ID);
    expect(result.iso_week).toMatch(/^\d{4}-W\d{2}$/);
    expect(result.items_built).toBe(2); // 1 winloss + 1 objection
    expect(result.inserted).toBe(2);
    expect(result.bedrock_cost_usd).toBeCloseTo(0.008, 6);
    expect(result.buckets_skipped).toBe(0);

    // genau eine audit_log-Row mit korrekten Feldern
    expect(audit.rows).toHaveLength(1);
    const row = audit.rows[0];
    expect(row.action).toBe("is_knowledge_pushed");
    expect(row.actor_id).toBeNull();
    expect(row.entity_type).toBe("knowledge_push_run");
    expect(row.entity_id).toBe(RUN_ID);
    const changes = row.changes as Record<string, unknown>;
    expect(changes.inserted).toBe(2);
    expect(changes.bedrock_cost_usd).toBeCloseTo(0.008, 6);
    expect(typeof row.context).toBe("string");

    // ingest mit genau einem Chunk von 2 Items
    expect(ingestCalls).toHaveLength(1);
    expect(ingestCalls[0]).toHaveLength(2);
    expect(ingestCalls[0][0].source_system).toBe("business_system");
  });
});

describe("runKnowledgePush — fail-soft (AC-355-3/7)", () => {
  it("distill null -> bucket uebersprungen, kein Item, buckets_skipped++", async () => {
    const { deps, ingestCalls } = makeDeps({
      gatherObjectionNotes: async () => [],
      distillWinLossBucket: async () => null,
    });

    const result = await runKnowledgePush(deps, NOW, RUN_ID);
    expect(result.items_built).toBe(0);
    expect(result.buckets_skipped).toBe(1);
    // keine Items -> kein ingest-Call
    expect(ingestCalls).toHaveLength(0);
    expect(result.inserted).toBe(0);
  });

  it("ingest-Chunk-Fehler -> failed += chunk.length, Cron bleibt success", async () => {
    const { deps, audit } = makeDeps({
      ingestKnowledge: async () => {
        throw new Error("rate_limit");
      },
    });

    const result = await runKnowledgePush(deps, NOW, RUN_ID);
    expect(result.success).toBe(true);
    expect(result.failed).toBe(2);
    expect(result.inserted).toBe(0);
    expect(audit.rows).toHaveLength(1); // audit trotzdem geschrieben
  });

  it("207-Teilfehler werden durchgereicht", async () => {
    const { deps } = makeDeps({
      ingestKnowledge: async () => ({ inserted: 1, deduped: 0, failed: 1 }),
    });
    const result = await runKnowledgePush(deps, NOW, RUN_ID);
    expect(result.inserted).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe("runKnowledgePush — Chunking (AC-355-7)", () => {
  it("teilt >100 Items in Chunks <=100", async () => {
    const manyBuckets = Array.from({ length: 150 }, (_, i) =>
      bucket({ branche: `B${i}` })
    );
    const { deps, ingestCalls } = makeDeps({
      aggregateWinLoss: async () => manyBuckets,
      gatherObjectionNotes: async () => [],
    });

    const result = await runKnowledgePush(deps, NOW, RUN_ID);
    expect(result.items_built).toBe(150);
    expect(ingestCalls).toHaveLength(2);
    expect(ingestCalls[0]).toHaveLength(100);
    expect(ingestCalls[1]).toHaveLength(50);
  });
});

describe("runKnowledgePush — 0 Items", () => {
  it("schreibt audit_log auch ohne Items, kein ingest-Call", async () => {
    const { deps, audit, ingestCalls } = makeDeps({
      aggregateWinLoss: async () => [],
      gatherObjectionNotes: async () => [],
    });
    const result = await runKnowledgePush(deps, NOW, RUN_ID);
    expect(result.items_built).toBe(0);
    expect(ingestCalls).toHaveLength(0);
    expect(audit.rows).toHaveLength(1);
  });
});

describe("runKnowledgePush — Error", () => {
  it("wirft wenn audit_log-Insert fehlschlaegt", async () => {
    const { deps } = makeDeps({
      auditState: { rows: [], error: { message: "audit missing" } },
    });
    await expect(runKnowledgePush(deps, NOW, RUN_ID)).rejects.toThrow(
      /audit_log insert failed.*audit missing/
    );
  });

  it("generiert eine UUID als run_id ohne expliziten Wert", async () => {
    const { deps } = makeDeps();
    const result = await runKnowledgePush(deps, NOW);
    expect(result.run_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("POST — Gate-Pfade (AC-355-6)", () => {
  function req(headers: Record<string, string> = {}) {
    return new Request("http://localhost/api/cron/knowledge-push", {
      method: "POST",
      headers,
    }) as unknown as Parameters<typeof POST>[0];
  }

  it("401 bei falschem/fehlendem Secret", async () => {
    vi.stubEnv("CRON_SECRET", "right-secret");
    const res = await POST(req({ "x-cron-secret": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("KNOWLEDGE_PUSH_ENABLED != 'true' -> skip ohne IS-Call", async () => {
    vi.stubEnv("CRON_SECRET", "right-secret");
    vi.stubEnv("KNOWLEDGE_PUSH_ENABLED", "false");
    const res = await POST(req({ "x-cron-secret": "right-secret" }));
    const body = (await res.json()) as { success: boolean; skipped?: boolean };
    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
  });
});
