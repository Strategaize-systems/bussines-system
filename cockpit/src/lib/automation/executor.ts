// V6.2 SLC-622 MT-5 — Action-Executor
//
// Orchestriert eine pending automation_runs-Row durch:
//   1. Lock pending → running (idempotent via WHERE-Clause)
//   2. Lade rule + entity-Snapshot
//   3. Re-Evaluate conditions (Defense-in-Depth gegen TOCTOU)
//   4. Recursion-Counter pruefen (V1 nur fuer update_field)
//   5. Action-Loop (Best-Effort: einzelne Failure stoppt nicht die folgenden)
//   6. Final-Update auf run.status
//   7. Cache-Update auf rules.last_run_at + last_run_status
//
// Fire-and-forget vom Dispatcher: void executeAutomationRun(runId).catch(...)

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Action,
  ActionResult,
  ActionType,
  AutomationRun,
  Condition,
  RunStatus,
} from "@/types/automation";
import { evaluateConditions } from "./condition-engine";
import { checkRecursionLimit } from "./recursion-guard";
import { lookupActorIdFromAuditLog } from "./assignee-resolver";
import { executeCreateTask } from "./actions/create_task";
import { executeCreateActivity } from "./actions/create_activity";
import { executeUpdateField } from "./actions/update_field";
import { executeSendEmailTemplate } from "./actions/send_email_template";
import type {
  ActionEntityContext,
  ActionExecutionContext,
} from "./actions/types";

const TERMINAL_STATUSES: RunStatus[] = [
  "success",
  "partial_failed",
  "failed",
  "skipped",
];

/**
 * Fuehrt einen einzelnen automation_runs-Eintrag aus.
 *
 * Idempotent: wenn der Run schon nicht-pending ist, returnt fruehzeitig.
 * Defensive: jede Action wird in try/catch gewrappt — eine fehlerhafte Action
 * blockt nicht die anderen Actions.
 */
export async function executeAutomationRun(runId: string): Promise<void> {
  const supabase = createAdminClient();

  // 1. Lock: pending → running. Idempotent — wenn der Run schon running
  // oder terminal ist, returnt UPDATE 0 rows und wir brechen ab.
  const { data: locked, error: lockErr } = await supabase
    .from("automation_runs")
    .update({ status: "running" })
    .eq("id", runId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (lockErr) {
    console.error(
      `[automation-executor] lock failed for run ${runId}:`,
      lockErr.message
    );
    return;
  }
  if (!locked) {
    // Schon laufend / terminal — kein Re-Run.
    return;
  }

  const run = locked as AutomationRun;

  try {
    // 2. Lade rule
    const { data: rule, error: ruleErr } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("id", run.rule_id)
      .maybeSingle();

    if (ruleErr || !rule) {
      await finalizeRun(supabase, runId, {
        status: "failed",
        error_message: `rule-not-found: ${run.rule_id}`,
        action_results: [],
      });
      return;
    }

    if (rule.status !== "active") {
      // Rule wurde zwischen Dispatch und Execute pausiert/disabled.
      await finalizeRun(supabase, runId, {
        status: "skipped",
        error_message: `rule-not-active: ${rule.status}`,
        action_results: [],
      });
      return;
    }

    // 3. Lade entity-Snapshot
    const entity = await loadEntity(
      supabase,
      run.trigger_entity_type,
      run.trigger_entity_id
    );
    if (!entity) {
      await finalizeRun(supabase, runId, {
        status: "failed",
        error_message: "entity-not-found-or-deleted",
        action_results: [],
      });
      return;
    }

    // 4. Re-Evaluate conditions (TOCTOU-Schutz)
    const conditionsMatch = evaluateConditions(
      (rule.conditions as Condition[]) ?? [],
      entity.data
    );
    if (!conditionsMatch) {
      await finalizeRun(supabase, runId, {
        status: "skipped",
        error_message: "conditions-no-longer-match",
        action_results: [],
      });
      return;
    }

    // 5. Trigger-User-Lookup (fuer assignee + audit-changes)
    const triggerUserId = await lookupActorIdFromAuditLog(
      supabase,
      run.trigger_event_audit_id
    );

    // 6. Action-Loop
    const actions = (rule.actions as Action[]) ?? [];
    const actionResults: ActionResult[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const baseContext: ActionExecutionContext = {
        supabase,
        rule: { id: rule.id, name: rule.name },
        entity,
        actionIndex: i,
        triggerEventAuditId: run.trigger_event_audit_id,
        triggerUserId,
      };

      // Recursion-Guard nur fuer update_field
      if (action.type === "update_field") {
        const guard = await checkRecursionLimit(
          supabase,
          entity.id,
          action.type as ActionType
        );
        if (!guard.allowed) {
          actionResults.push({
            action_index: i,
            type: "update_field",
            outcome: "skipped",
            error_message: `recursion-limit-exceeded (${guard.count}/${guard.limit})`,
          });
          continue;
        }
      }

      try {
        let result: ActionResult;
        if (action.type === "create_task") {
          result = await executeCreateTask(baseContext, action.params);
        } else if (action.type === "create_activity") {
          result = await executeCreateActivity(baseContext, action.params);
        } else if (action.type === "update_field") {
          result = await executeUpdateField(baseContext, action.params);
        } else if (action.type === "send_email_template") {
          result = await executeSendEmailTemplate(baseContext, action.params);
        } else {
          // exhaustive-check: TS sollte das fangen, aber defensiv:
          const unknown = action as { type?: string };
          result = {
            action_index: i,
            type: (unknown.type as ActionType) ?? "create_task",
            outcome: "failed",
            error_message: `unknown-action-type: ${unknown.type}`,
          };
        }
        actionResults.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        actionResults.push({
          action_index: i,
          type: action.type as ActionType,
          outcome: "failed",
          error_message: `action-throw: ${msg}`.slice(0, 500),
        });
      }
    }

    // 7. Run finalisieren
    const finalStatus = computeFinalStatus(actionResults);
    await finalizeRun(supabase, runId, {
      status: finalStatus,
      error_message: null,
      action_results: actionResults,
    });

    // 8. Rule-Cache aktualisieren (last_run_at, last_run_status)
    await supabase
      .from("automation_rules")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: finalStatus,
      })
      .eq("id", rule.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(
      `[automation-executor] unexpected error in run ${runId}:`,
      msg
    );
    await finalizeRun(supabase, runId, {
      status: "failed",
      error_message: `executor-unexpected: ${msg}`.slice(0, 500),
      action_results: [],
    });
  }
}

function computeFinalStatus(results: ActionResult[]): RunStatus {
  if (results.length === 0) return "skipped";
  const successes = results.filter((r) => r.outcome === "success").length;
  const failures = results.filter((r) => r.outcome === "failed").length;
  const skipped = results.filter((r) => r.outcome === "skipped").length;

  if (successes === results.length) return "success";
  if (failures === results.length) return "failed";
  if (successes === 0 && failures === 0 && skipped > 0) return "skipped";
  return "partial_failed";
}

async function finalizeRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  patch: {
    status: RunStatus;
    error_message: string | null;
    action_results: ActionResult[];
  }
): Promise<void> {
  const isTerminal = TERMINAL_STATUSES.includes(patch.status);
  await supabase
    .from("automation_runs")
    .update({
      status: patch.status,
      error_message: patch.error_message,
      action_results: patch.action_results,
      finished_at: isTerminal ? new Date().toISOString() : null,
    })
    .eq("id", runId);
}

async function loadEntity(
  supabase: ReturnType<typeof createAdminClient>,
  entityType: "deal" | "activity",
  entityId: string
): Promise<ActionEntityContext | null> {
  if (entityType === "deal") {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("id", entityId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      type: "deal",
      id: entityId,
      data: data as Record<string, unknown>,
      contactId: (data as { contact_id?: string | null }).contact_id ?? null,
      companyId: (data as { company_id?: string | null }).company_id ?? null,
      dealId: entityId,
    };
  }

  // activity
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", entityId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    type: "activity",
    id: entityId,
    data: data as Record<string, unknown>,
    contactId: (data as { contact_id?: string | null }).contact_id ?? null,
    companyId: (data as { company_id?: string | null }).company_id ?? null,
    dealId: (data as { deal_id?: string | null }).deal_id ?? null,
  };
}

/**
 * Cron-Pickup: alle stuck-Runs (pending oder running, > 60s alt) holen.
 * Wird vom /api/cron/automation-runner aufgerufen.
 */
export async function pickupStuckRuns(limit = 50): Promise<string[]> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 60_000).toISOString();

  const { data, error } = await supabase
    .from("automation_runs")
    .select("id")
    .in("status", ["pending", "running"])
    .lt("started_at", cutoff)
    .order("started_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => (r as { id: string }).id);
}
