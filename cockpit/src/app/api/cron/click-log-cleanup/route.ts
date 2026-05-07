// =============================================================
// Click-Log-Cleanup-Cron — DSGVO 90-Tage-Retention
// SLC-641 / FEAT-641 — V6.4 Hygiene-Sprint (BL-423)
// =============================================================
//
// Loescht campaign_link_clicks-Eintraege aelter als 90 Tage und
// schreibt eine audit_log-Zeile fuer Nachvollziehbarkeit.
//
// Auth: x-cron-secret-Header (verifyCronSecret) — konsistent mit
// allen anderen /api/cron-Endpoints (expire-proposals, meeting-
// briefing, automation-runner, call-processing).
//
// Idempotent: 0-Row-Lauf erzeugt success:true, deleted:0.
//
// Pure-Function-Extraction (runClickLogCleanup) macht die Logik
// in route.test.ts testbar mit Mock-Supabase + Mock-Now.

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "../verify-cron-secret";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface ClickLogCleanupResult {
  success: true;
  deleted: number;
  cutoff: string;
  oldest_kept: string | null;
  run_at: string;
  run_id: string;
}

// Minimal supabase-shape we depend on. Lets the test inject a mock
// without pulling in @supabase/supabase-js types.
type SupabaseLike = {
  from(table: string): {
    delete(options?: { count?: "exact" | "planned" | "estimated" }): {
      lt(column: string, value: string): Promise<{
        data: unknown;
        error: { message: string } | null;
        count: number | null;
      }>;
    };
    select(columns: string): {
      order(
        column: string,
        opts: { ascending: boolean },
      ): {
        limit(n: number): Promise<{
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert(row: Record<string, unknown>): Promise<{
      error: { message: string } | null;
    }>;
  };
};

export async function runClickLogCleanup(
  supabase: SupabaseLike,
  now: Date,
  runId: string = randomUUID(),
): Promise<ClickLogCleanupResult> {
  const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
  const runAt = now.toISOString();

  const { error: deleteError, count } = await supabase
    .from("campaign_link_clicks")
    .delete({ count: "exact" })
    .lt("clicked_at", cutoff);

  if (deleteError) {
    throw new Error(
      `[ClickLogCleanup] DELETE failed: ${deleteError.message}`,
    );
  }

  const deleted = count ?? 0;

  const { data: oldestRows, error: minError } = await supabase
    .from("campaign_link_clicks")
    .select("clicked_at")
    .order("clicked_at", { ascending: true })
    .limit(1);

  if (minError) {
    throw new Error(
      `[ClickLogCleanup] MIN(clicked_at) query failed: ${minError.message}`,
    );
  }

  const oldestKept =
    (oldestRows?.[0]?.clicked_at as string | undefined) ?? null;

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: null,
    action: "click_log_cleanup",
    entity_type: "campaign_link_clicks",
    entity_id: runId,
    changes: {
      run_id: runId,
      deleted_count: deleted,
      oldest_kept: oldestKept,
      cutoff,
      run_at: runAt,
    },
    context: `DSGVO 90d retention: deleted ${deleted} click-log row(s) older than ${cutoff}`,
  });

  if (auditError) {
    throw new Error(
      `[ClickLogCleanup] audit_log insert failed: ${auditError.message}`,
    );
  }

  return {
    success: true,
    deleted,
    cutoff,
    oldest_kept: oldestKept,
    run_at: runAt,
    run_id: runId,
  };
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const supabase = createAdminClient() as unknown as SupabaseLike;
    const result = await runClickLogCleanup(supabase, new Date());
    console.log(
      `[Cron/ClickLogCleanup] deleted=${result.deleted} cutoff=${result.cutoff} oldest_kept=${result.oldest_kept ?? "none"}`,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron/ClickLogCleanup] Fatal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
