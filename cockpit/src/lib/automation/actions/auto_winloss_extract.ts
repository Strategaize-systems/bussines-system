// SLC-665 MT-6 (DEC-171) — Workflow-Action: auto_winloss_extract
//
// Wird durch die System-Rule "[SYSTEM] Auto Win/Loss Extract" aufgerufen,
// sobald der V6.2-Dispatcher einen deal.stage_changed-Event verarbeitet.
//
// Verhalten:
//   1. Klassifiziere targetStatus aus deal.status ("won" / "lost"). Sonst skip.
//   2. Time-Window-Throttle: existiert ein triggered_at innerhalb 5 Minuten
//      fuer (deal_id, target_status) -> skip + audit "skipped:recent_run".
//   3. INSERT auto_winloss_runs status='pending'.
//   4. Bedrock-Call (FEAT-114-Pfad ueber runWinLossExtract).
//   5. UPDATE auto_winloss_runs status='succeeded' + bedrock_output + Modell + completed_at.
//      Bei Fehler: status='failed' + error_message.
//   6. audit_log Eintrag event_type='auto_winloss_triggered' (best-effort).

import type { ActionResult } from "@/types/automation";
import type { ActionExecutionContext } from "./types";
import {
  runWinLossExtract,
  type RunWinLossExtractResult,
} from "@/lib/winloss/runWinLossExtract";

const THROTTLE_MINUTES = 5;

export interface AutoWinLossExtractParams {
  // V1: keine Parameter — Stage-Identifikation laeuft ueber den Deal-Status.
  // Zukuenftige Erweiterungen koennen z.B. target_status_override aufnehmen.
  [key: string]: unknown;
}

export async function executeAutoWinLossExtract(
  context: ActionExecutionContext,
  _params: AutoWinLossExtractParams,
  deps: AutoWinLossExtractDeps = {}
): Promise<ActionResult> {
  const { supabase, entity, actionIndex, triggerUserId } = context;
  const action = "auto_winloss_extract" as const;
  const baseFailure = (msg: string): ActionResult => ({
    action_index: actionIndex,
    type: action as unknown as ActionResult["type"],
    outcome: "failed",
    error_message: msg.slice(0, 500),
  });

  try {
    if (entity.type !== "deal") {
      return {
        action_index: actionIndex,
        type: action as unknown as ActionResult["type"],
        outcome: "skipped",
        error_message: "non-deal-entity",
      };
    }

    const targetStatus = classifyTargetStatus(entity.data);
    if (!targetStatus) {
      // Keine won/lost-Stage -> Action ist No-Op fuer alle anderen
      // Stage-Wechsel. Audit-Log nicht noetig (kein Side-Effect erwartet).
      return {
        action_index: actionIndex,
        type: action as unknown as ActionResult["type"],
        outcome: "skipped",
        error_message: "stage-not-won-or-lost",
      };
    }

    const now = deps.now ? deps.now() : new Date();
    const recent = await findRecentRun(
      supabase,
      entity.id,
      targetStatus,
      now,
      THROTTLE_MINUTES
    );

    if (recent) {
      await safeAudit(supabase, {
        actorId: triggerUserId,
        dealId: entity.id,
        event: "auto_winloss_skipped_recent_run",
        targetStatus,
      });
      return {
        action_index: actionIndex,
        type: action as unknown as ActionResult["type"],
        outcome: "skipped",
        error_message: `skipped:recent_run`,
      };
    }

    // INSERT pending run-row
    const { data: runInserted, error: insErr } = await supabase
      .from("auto_winloss_runs")
      .insert({
        deal_id: entity.id,
        target_status: targetStatus,
        triggered_at: now.toISOString(),
        triggered_by_user_id: triggerUserId,
        triggered_by_system: true,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (insErr || !runInserted) {
      return baseFailure(`run-insert: ${insErr?.message ?? "unknown"}`);
    }

    const runId = (runInserted as { id: string }).id;

    // Bedrock-Call (FEAT-114-Pfad). Fehler -> status='failed'.
    let bedrockResult: RunWinLossExtractResult | null = null;
    let bedrockError: string | null = null;
    try {
      const runner = deps.runWinLossExtract ?? runWinLossExtract;
      bedrockResult = await runner({
        dealId: entity.id,
        targetStatus,
      });
    } catch (e) {
      bedrockError = e instanceof Error ? e.message : "unknown";
    }

    if (bedrockResult) {
      await supabase
        .from("auto_winloss_runs")
        .update({
          status: "succeeded",
          bedrock_output: bedrockResult.markdown,
          bedrock_model: bedrockResult.model,
          bedrock_completed_at: bedrockResult.completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);

      await safeAudit(supabase, {
        actorId: triggerUserId,
        dealId: entity.id,
        event: "auto_winloss_triggered",
        targetStatus,
        runId,
      });

      return {
        action_index: actionIndex,
        type: action as unknown as ActionResult["type"],
        outcome: "success",
        audit_log_id: runId,
      };
    }

    await supabase
      .from("auto_winloss_runs")
      .update({
        status: "failed",
        error_message: (bedrockError ?? "unknown").slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return baseFailure(`bedrock: ${bedrockError ?? "unknown"}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return baseFailure(`unexpected: ${msg}`);
  }
}

export interface AutoWinLossExtractDeps {
  runWinLossExtract?: typeof runWinLossExtract;
  now?: () => Date;
}

export function classifyTargetStatus(
  dealRow: Record<string, unknown>
): "won" | "lost" | null {
  const status = (dealRow.status as string | undefined)?.toLowerCase();
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  return null;
}

async function findRecentRun(
  supabase: ActionExecutionContext["supabase"],
  dealId: string,
  targetStatus: "won" | "lost",
  now: Date,
  throttleMinutes: number
): Promise<boolean> {
  const cutoff = new Date(now.getTime() - throttleMinutes * 60_000).toISOString();
  const { data } = await supabase
    .from("auto_winloss_runs")
    .select("id")
    .eq("deal_id", dealId)
    .eq("target_status", targetStatus)
    .gte("triggered_at", cutoff)
    .order("triggered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function safeAudit(
  supabase: ActionExecutionContext["supabase"],
  args: {
    actorId: string | null;
    dealId: string;
    event:
      | "auto_winloss_triggered"
      | "auto_winloss_skipped_recent_run";
    targetStatus: "won" | "lost";
    runId?: string;
  }
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actor_id: args.actorId,
      action: args.event,
      entity_type: "deal",
      entity_id: args.dealId,
      changes: null,
      context: JSON.stringify({
        targetStatus: args.targetStatus,
        ...(args.runId ? { autoWinLossRunId: args.runId } : {}),
      }),
    });
  } catch {
    // best-effort, never throw
  }
}
