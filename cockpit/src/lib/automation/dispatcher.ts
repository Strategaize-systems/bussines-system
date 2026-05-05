// V6.2 SLC-621 MT-6 — Trigger-Dispatcher
//
// Wird von allen Trigger-Source-Pfaden (Server Actions + Crons) aufgerufen
// nachdem ein audit_log-Eintrag geschrieben wurde. Selektiert aktive
// matching Rules, evaluiert Conditions, INSERTs automation_runs mit
// Anti-Loop-UNIQUE.
//
// Action-Execution selbst ist in SLC-622 (executor.ts) - siehe TODO unten.

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AutomationRule,
  Condition,
  TriggerEvent,
} from "@/types/automation";
import { evaluateConditions } from "./condition-engine";
import { executeAutomationRun } from "./executor";

export interface DispatchTriggerArgs {
  event: TriggerEvent;
  entityType: "deal" | "activity";
  entityId: string;
  /**
   * audit_log.id der den Trigger ausgeloest hat.
   * Wenn nicht gesetzt, wird entityId als Fallback-Token verwendet
   * (siehe Anti-Loop-Doku in MIG-029).
   */
  triggerEventAuditId?: string | null;
  /**
   * Entity-Snapshot fuer Condition-Evaluation (z.B. {value: 1000, stage_id: "..."}).
   * Bei stage_changed kann zusaetzlich {stage_id: {before, after}} mitkommen.
   */
  entitySnapshot?: Record<string, unknown>;
}

/**
 * Trigger-Dispatcher: nicht-blockierend (returnt schnell), Fire-and-forget
 * fuer Action-Execution.
 *
 * Performance-Target: < 100ms in Hot-Path (1 SELECT + N INSERTs).
 *
 * Idempotenz via Anti-Loop-UNIQUE auf
 * (rule_id, trigger_entity_id, trigger_event_audit_id).
 */
export async function dispatchAutomationTrigger(
  args: DispatchTriggerArgs
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 1. SELECT alle aktiven matching Rules (Index idx_automation_rules_active)
    const { data: rulesRaw, error: selErr } = await supabase
      .from("automation_rules")
      .select(
        "id, name, trigger_event, trigger_config, conditions, actions, status"
      )
      .eq("trigger_event", args.event)
      .eq("status", "active");

    if (selErr) {
      // Audit-Style Defensive: nicht throwen, Workflow darf Server-Action nicht killen
      console.error("[automation-dispatcher] rule-select failed:", selErr.message);
      return;
    }

    const rules = (rulesRaw ?? []) as Array<
      Pick<
        AutomationRule,
        "id" | "name" | "trigger_event" | "trigger_config" | "conditions" | "actions" | "status"
      >
    >;
    if (rules.length === 0) return;

    // 2. App-Level-Condition-Match + INSERT pro matching Rule
    const entitySnapshot = args.entitySnapshot ?? {};
    const antiLoopToken = args.triggerEventAuditId ?? args.entityId;

    for (const rule of rules) {
      // Trigger-Config Match (z.B. stage_id-Filter bei stage_changed)
      if (!triggerConfigMatches(rule.trigger_config, entitySnapshot, args.event)) {
        continue;
      }

      // Condition-Match
      const conditionsMatch = evaluateConditions(
        rule.conditions as Condition[],
        entitySnapshot
      );
      if (!conditionsMatch) continue;

      // INSERT automation_runs (status='pending') mit ON CONFLICT
      const { data: insertedRun, error: insErr } = await supabase
        .from("automation_runs")
        .insert({
          rule_id: rule.id,
          trigger_event: args.event,
          trigger_entity_type: args.entityType,
          trigger_entity_id: args.entityId,
          trigger_event_audit_id: antiLoopToken,
          conditions_match: true,
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      // ON CONFLICT (rule_id, trigger_entity_id, trigger_event_audit_id) DO NOTHING
      // Postgres UNIQUE-Constraint-Verletzung kommt als error code 23505 -
      // dann ist insertedRun null und wir skippen die Execution.
      if (insErr) {
        if (insErr.code !== "23505") {
          console.error(
            "[automation-dispatcher] run-insert failed:",
            insErr.message
          );
        }
        continue;
      }

      // V6.2 SLC-622 MT-7: Sync-Execution als Fire-and-forget. Cron-Endpoint
      // /api/cron/automation-runner ist Defense-in-Depth fuer App-Crash.
      if (insertedRun?.id) {
        void executeAutomationRun(insertedRun.id).catch((err) => {
          console.error(
            `[automation-dispatcher] sync-execution failed for run ${insertedRun.id}:`,
            err instanceof Error ? err.message : String(err)
          );
        });
      }
    }
  } catch (err) {
    // Nie throwen - Workflow-Fehler darf Server-Action nicht blockieren
    console.error("[automation-dispatcher] unexpected error:", err);
  }
}

/**
 * Pruef ob trigger_config fuer den Event matcht.
 * V1: stage_changed checkt stage_id, deal.created checkt pipeline_id,
 * activity.created checkt activity_types.
 */
function triggerConfigMatches(
  config: unknown,
  snapshot: Record<string, unknown>,
  event: TriggerEvent
): boolean {
  if (!config || typeof config !== "object") return true; // leere config = match all
  const c = config as Record<string, unknown>;

  if (event === "deal.stage_changed") {
    if (c.stage_id) {
      // snapshot.stage_id kann String oder {before, after} sein
      const stageAfter =
        typeof snapshot.stage_id === "object" && snapshot.stage_id !== null
          ? (snapshot.stage_id as { after?: string }).after
          : snapshot.stage_id;
      if (stageAfter !== c.stage_id) return false;
    }
    if (c.pipeline_id && snapshot.pipeline_id !== c.pipeline_id) return false;
    return true;
  }

  if (event === "deal.created") {
    if (c.pipeline_id && snapshot.pipeline_id !== c.pipeline_id) return false;
    return true;
  }

  if (event === "activity.created") {
    if (Array.isArray(c.activity_types) && c.activity_types.length > 0) {
      const t = snapshot.type ?? snapshot.activity_type;
      if (typeof t !== "string") return false;
      if (!(c.activity_types as string[]).includes(t)) return false;
    }
    return true;
  }

  return true;
}
