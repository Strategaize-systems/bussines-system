// V6.2 SLC-622 MT-4 — Recursion-Guard (DEC-138 + Risk-Mitigation)
//
// Limit: max 3 update_field-Action-Executions pro (entity_id, 60s).
// Verhindert Endlos-Schleifen wenn eine Regel "wenn deal.stage_changed dann
// update_field stage_id" mit einer zweiten Regel kollidiert.
//
// Andere Action-Types (create_task, send_email_template, create_activity)
// erzeugen NEUE Activities mit anderem trigger_event_audit_id und sind durch
// die Anti-Loop-UNIQUE auf automation_runs (rule_id, entity_id, audit_id)
// abgesichert. Recursion-Guard ist V1 nur fuer update_field aktiv.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionType } from "@/types/automation";

export const MAX_UPDATE_FIELD_PER_ENTITY_PER_60S = 3;
const WINDOW_MS = 60_000;

export interface RecursionCheckResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Pruefen ob fuer diese (entityId, actionType)-Kombination das
 * Recursion-Limit erreicht ist.
 *
 * Logik fuer V1:
 * - Nur update_field unterliegt dem Limit.
 * - Zaehlt vergangene `automation_runs` mit `trigger_entity_id == entityId`,
 *   `started_at > now() - 60s` und `action_results` enthaelt mindestens
 *   ein Element mit `type='update_field'` und `outcome='success'`.
 * - Bei >= 3 success-Counts: allowed=false, der Executor schreibt
 *   action_result.outcome='skipped' + error_message='recursion-limit-exceeded'.
 */
export async function checkRecursionLimit(
  supabase: SupabaseClient,
  entityId: string,
  actionType: ActionType
): Promise<RecursionCheckResult> {
  if (actionType !== "update_field") {
    return { allowed: true, count: 0, limit: Number.POSITIVE_INFINITY };
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("automation_runs")
    .select("action_results")
    .eq("trigger_entity_id", entityId)
    .gte("started_at", since)
    .contains("action_results", [
      { type: "update_field", outcome: "success" },
    ]);

  if (error) {
    // Defensive: Fehler beim Counting blockt nicht (sicher = erlauben),
    // damit Recursion-Guard nicht selbst zum Single-Point-of-Failure wird.
    console.error("[recursion-guard] count failed:", error.message);
    return {
      allowed: true,
      count: 0,
      limit: MAX_UPDATE_FIELD_PER_ENTITY_PER_60S,
    };
  }

  const count = (data ?? []).length;
  return {
    allowed: count < MAX_UPDATE_FIELD_PER_ENTITY_PER_60S,
    count,
    limit: MAX_UPDATE_FIELD_PER_ENTITY_PER_60S,
  };
}
