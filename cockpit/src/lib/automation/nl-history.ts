// V7.5 SLC-752 MT-8 — Listing-Query fuer NL-Sculpt-Attempts aus audit_log.
//
// Konsumiert von SLC-756 Inspection-Log-UI. Liefert die letzten N Sculpt-
// Versuche (success / reject / validation_fail / infra_fail) inkl. parsed
// metadata fuer die UI-Darstellung.
//
// Audit-Log-Shape (siehe sculptor.ts insertAttempt):
//   - action = "automation_rule.sculpt_attempt"
//   - actor_id = userId
//   - entity_type = "automation_rule"
//   - entity_id = sculpt_session_id (UUID konsistent ueber Re-Prompt-Loop)
//   - context = JSON.stringify(SculptAuditMetadata)

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SculptAuditMetadata } from "./sculptor";

export interface NlSculptHistoryRow {
  audit_log_id: string;
  actor_id: string;
  created_at: string;
  session_id: string;
  attempt_count: number;
  result_status: SculptAuditMetadata["result_status"];
  nl_input: string;
  transcript_source: SculptAuditMetadata["transcript_source"];
  sculptor_model_id: string | null;
  sculptor_cost_usd: number;
  /** Geparstes payload. Bei success/reject die Sculpt-Schema-Daten,
   *  bei validation_fail/infra_fail Diagnostik-Felder. */
  result_payload: unknown;
}

export interface ListNlSculptHistoryOptions {
  /** Max 200, default 50. */
  limit?: number;
  /**
   * Wenn gesetzt: nur Eintraege fuer diesen actor_id zurueckliefern (Member-Scope).
   * Wenn null/undef: alle Eintraege (Admin/Teamlead-Scope).
   */
  ownerScope?: string | null;
}

/**
 * Holt die letzten Sculpt-Attempts in DESC-Reihenfolge.
 *
 * Performance: SLC-756 wird einen partiellen Index auf
 * `audit_log(action, created_at DESC)` ergaenzen. Bis dahin scannt die
 * Query alle audit_log-Rows mit WHERE-Filter — bei ~10k Sculpt-Versuchen
 * pro Tag noch akzeptabel.
 */
export async function listNlSculptHistory(
  supabase: SupabaseClient,
  options: ListNlSculptHistoryOptions = {}
): Promise<NlSculptHistoryRow[]> {
  const limit = Math.min(Math.max(1, options.limit ?? 50), 200);
  let query = supabase
    .from("audit_log")
    .select("id, actor_id, created_at, entity_id, context")
    .eq("action", "automation_rule.sculpt_attempt")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.ownerScope) {
    query = query.eq("actor_id", options.ownerScope);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listNlSculptHistory: ${error.message}`);
  return (data ?? []).map(parseHistoryRow);
}

/**
 * Parse-Helper: extrahiert die strukturierten Felder aus audit_log.context
 * (= JSON.stringify(SculptAuditMetadata)). Best-effort: bei Drift in context
 * fuellen wir leere/Default-Werte statt die ganze Liste zu sprengen.
 */
export function parseHistoryRow(row: {
  id: string;
  actor_id: string;
  created_at: string;
  entity_id: string;
  context: string | null;
}): NlSculptHistoryRow {
  let metadata: Partial<SculptAuditMetadata> = {};
  if (row.context) {
    try {
      metadata = JSON.parse(row.context) as Partial<SculptAuditMetadata>;
    } catch {
      // Drift — leere metadata
    }
  }
  return {
    audit_log_id: row.id,
    actor_id: row.actor_id,
    created_at: row.created_at,
    session_id: metadata.sculpt_session_id ?? row.entity_id,
    attempt_count: metadata.attempt_count ?? 1,
    result_status: metadata.result_status ?? "validation_fail",
    nl_input: metadata.nl_input ?? "",
    transcript_source: metadata.transcript_source ?? "text",
    sculptor_model_id: metadata.sculptor_model_id ?? null,
    sculptor_cost_usd: typeof metadata.sculptor_cost_usd === "number" ? metadata.sculptor_cost_usd : 0,
    result_payload: metadata.result_payload ?? null,
  };
}
