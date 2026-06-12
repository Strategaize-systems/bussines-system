// V8.7-B SLC-355 MT-6 — BS->IS Verdichtungs-Cron (DEC-289/290/291).
//
// Woechentlich (So 02:00). Verdichtet succeeded Win/Loss-Analysen +
// Activity-Einwand-Notizen der letzten 7 Tage zu anonymisierten, aggregierten
// Wissens-Bausteinen und pusht sie an die IS-Knowledge-API.
//
// Pure-Function-Extraktion (runKnowledgePush) macht die Orchestrierung
// testbar; der POST-Handler macht nur Auth + ENABLED-Gate + Wiring.
// Keine Migration: audit_log.actor_id ist bereits nullable, Idempotenz via
// IS-seitiges UNIQUE(source_system, source_reference). Cost BS-lokal in
// audit_log.changes (kein ai_jobs/ai_cost_ledger in BS, DEC-291).

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestKnowledge } from "@/lib/is-knowledge/client";
import { aggregateWinLoss } from "@/lib/knowledge-push/aggregate-winloss";
import { gatherObjectionNotes } from "@/lib/knowledge-push/gather-objections";
import {
  classifyObjections,
  distillWinLossBucket,
} from "@/lib/knowledge-push/distill";
import {
  buildObjectionItem,
  buildWinLossItem,
  isoWeekOf,
} from "@/lib/knowledge-push/build-items";
import { redactItemsBeforeSend } from "@/lib/knowledge-push/redact";
import type { IsKnowledgeIngestItem } from "@/lib/is-knowledge/types";
import type {
  ObjectionGroup,
  WinLossBucket,
} from "@/lib/knowledge-push/types";
import type { DistillResult } from "@/lib/knowledge-push/distill";

export const maxDuration = 300;

const INGEST_CHUNK_SIZE = 100;

// Minimale Supabase-Shape fuer den audit_log-Insert (Test injiziert Mock).
type AuditSupabaseLike = {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{
      error: { message: string } | null;
    }>;
  };
};

export interface KnowledgePushDeps {
  admin: AuditSupabaseLike;
  aggregateWinLoss: (now: Date) => Promise<WinLossBucket[]>;
  gatherObjectionNotes: (now: Date) => Promise<ObjectionGroup[]>;
  distillWinLossBucket: (b: WinLossBucket) => Promise<DistillResult | null>;
  classifyObjections: (g: ObjectionGroup) => Promise<DistillResult | null>;
  ingestKnowledge: (
    items: IsKnowledgeIngestItem[]
  ) => Promise<{ inserted: number; deduped: number; failed: number }>;
}

export interface KnowledgePushResult {
  success: true;
  run_id: string;
  iso_week: string;
  items_built: number;
  inserted: number;
  deduped: number;
  failed: number;
  bedrock_cost_usd: number;
  buckets_skipped: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Orchestriert MT-2 -> MT-3 -> MT-4 -> MT-5 -> ingest und schreibt genau eine
 * audit_log-Spur. fail-soft: einzelne LLM-Skips und Ingest-Chunk-Fehler senken
 * das Cron-Gesamtergebnis NICHT (Teil-Fehler werden gezaehlt + geloggt).
 */
export async function runKnowledgePush(
  deps: KnowledgePushDeps,
  now: Date,
  runId: string = crypto.randomUUID()
): Promise<KnowledgePushResult> {
  const isoWeek = isoWeekOf(now);

  const buckets = await deps.aggregateWinLoss(now);
  const groups = await deps.gatherObjectionNotes(now);

  const items: IsKnowledgeIngestItem[] = [];
  let bedrockCostUsd = 0;
  let bucketsSkipped = 0;

  for (const bucket of buckets) {
    const distilled = await deps.distillWinLossBucket(bucket);
    if (!distilled) {
      bucketsSkipped += 1;
      continue;
    }
    bedrockCostUsd += distilled.costUsd;
    items.push(buildWinLossItem(bucket, distilled, isoWeek));
  }

  for (const group of groups) {
    const classified = await deps.classifyObjections(group);
    if (!classified) {
      bucketsSkipped += 1;
      continue;
    }
    bedrockCostUsd += classified.costUsd;
    items.push(buildObjectionItem(group, classified, isoWeek));
  }

  const redacted = redactItemsBeforeSend(items);

  let inserted = 0;
  let deduped = 0;
  let failed = 0;

  for (const batch of chunk(redacted, INGEST_CHUNK_SIZE)) {
    try {
      const r = await deps.ingestKnowledge(batch);
      inserted += r.inserted;
      deduped += r.deduped;
      failed += r.failed;
    } catch (err) {
      // Ein fehlgeschlagener Chunk (z.B. rate_limit/network) zaehlt als failed,
      // Cron laeuft weiter (AC-355-7).
      failed += batch.length;
      console.error(
        `[Cron/KnowledgePush] ingest chunk failed (${batch.length} items):`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const { error: auditError } = await deps.admin.from("audit_log").insert({
    actor_id: null,
    action: "is_knowledge_pushed",
    entity_type: "knowledge_push_run",
    entity_id: runId,
    changes: {
      run_id: runId,
      iso_week: isoWeek,
      items_built: redacted.length,
      inserted,
      deduped,
      failed,
      bedrock_cost_usd: bedrockCostUsd,
      buckets_skipped: bucketsSkipped,
      run_at: now.toISOString(),
    },
    context: `BS->IS Verdichtungs-Cron ${isoWeek}: ${redacted.length} Items gebaut, inserted=${inserted}, deduped=${deduped}, failed=${failed}, Bedrock=$${bedrockCostUsd.toFixed(4)}, skipped=${bucketsSkipped}`,
  });
  if (auditError) {
    throw new Error(`knowledge-push audit_log insert failed: ${auditError.message}`);
  }

  return {
    success: true,
    run_id: runId,
    iso_week: isoWeek,
    items_built: redacted.length,
    inserted,
    deduped,
    failed,
    bedrock_cost_usd: bedrockCostUsd,
    buckets_skipped: bucketsSkipped,
  };
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  if (process.env.KNOWLEDGE_PUSH_ENABLED !== "true") {
    return NextResponse.json({ success: true, skipped: true });
  }

  const admin = createAdminClient();

  try {
    const result = await runKnowledgePush(
      {
        admin: admin as unknown as AuditSupabaseLike,
        aggregateWinLoss: (now) =>
          aggregateWinLoss(admin as never, { now }),
        gatherObjectionNotes: (now) =>
          gatherObjectionNotes(admin as never, { now }),
        distillWinLossBucket: (b) => distillWinLossBucket(b),
        classifyObjections: (g) => classifyObjections(g),
        ingestKnowledge,
      },
      new Date()
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron/KnowledgePush] Fatal error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
