// V6.2 SLC-623 MT-1 — Trockenlauf-Modul (DEC-132)
//
// Read-only-Lookup: simuliert was die Rule in den letzten N Tagen getriggert
// haette, ohne Side-Effects. Source-Query je nach trigger_event:
//   - deal.stage_changed → audit_log (entity_type='deal', action='stage_change')
//   - deal.created       → deals (created_at-Filter)
//   - activity.created   → activities (created_at-Filter)
//
// Conditions werden App-Side via condition-engine (SLC-621) evaluiert.
// Result-Limit 100 fuer UI; Source-Query LIMIT 5000.

import type {
  Action,
  ActionType,
  AutomationRule,
  Condition,
} from "@/types/automation";
import { evaluateConditions } from "./condition-engine";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionPreview {
  type: ActionType;
  summary: string;
}

export interface DryRunHit {
  entity_type: "deal" | "activity";
  entity_id: string;
  entity_label: string;
  entity_url: string;
  matched_at: string;
  would_run_actions: ActionPreview[];
}

export interface DryRunResult {
  total_matched: number;
  hits: DryRunHit[];
  truncated: boolean;
  source_count: number;
}

const SOURCE_LIMIT = 5000;
const RESULT_LIMIT = 100;

function previewAction(action: Action): ActionPreview {
  switch (action.type) {
    case "create_task":
      return {
        type: "create_task",
        summary: `Aufgabe anlegen: "${action.params.title}"`,
      };
    case "send_email_template":
      return {
        type: "send_email_template",
        summary: `E-Mail-Template versenden (${action.params.mode === "draft" ? "Entwurf" : "direkt"})`,
      };
    case "create_activity":
      return {
        type: "create_activity",
        summary: `Activity (${action.params.type}) anlegen: "${action.params.title}"`,
      };
    case "update_field":
      return {
        type: "update_field",
        summary: `${action.params.entity}.${action.params.field} = ${JSON.stringify(action.params.value)}`,
      };
    default:
      return { type: (action as Action).type, summary: "(unbekannte Action)" };
  }
}

function buildHit(
  entityType: "deal" | "activity",
  entityId: string,
  entityLabel: string,
  matchedAt: string,
  actions: Action[]
): DryRunHit {
  return {
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    entity_url:
      entityType === "deal" ? `/deals/${entityId}` : `/contacts?activity=${entityId}`,
    matched_at: matchedAt,
    would_run_actions: actions.map(previewAction),
  };
}

/**
 * Read-only Trockenlauf einer Rule gegen historische Daten.
 *
 * Wirft NIE — bei DB-Fehler returnt leere Result mit total=0.
 */
export async function dryRunRule(
  rule: AutomationRule,
  daysBack = 30
): Promise<DryRunResult> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const conditions = (rule.conditions as Condition[]) ?? [];
  const actions = (rule.actions as Action[]) ?? [];

  const hits: DryRunHit[] = [];
  let sourceCount = 0;
  let totalMatched = 0;

  if (rule.trigger_event === "deal.stage_changed") {
    // Source: audit_log mit action='stage_change'
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, entity_id, changes, created_at, context")
      .eq("entity_type", "deal")
      .eq("action", "stage_change")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT);

    if (error || !data) return emptyResult();
    sourceCount = data.length;

    // Aggregierte Deal-IDs einmalig laden fuer entity-Snapshot
    const dealIds = Array.from(new Set(data.map((r) => r.entity_id as string)));
    const dealMap = await loadDeals(supabase, dealIds);

    for (const row of data) {
      const dealId = row.entity_id as string;
      const deal = dealMap.get(dealId);
      if (!deal) continue;

      const changes = (row.changes ?? {}) as {
        before?: { stage?: string };
        after?: { stage?: string };
      };
      // Snapshot fuer Conditions: deal-Row + stage_id-after aus changes
      const snapshot: Record<string, unknown> = {
        ...(deal as Record<string, unknown>),
        stage_id: deal.stage_id,
      };

      // trigger_config-Match (Pipeline-/Stage-Filter)
      if (!triggerConfigMatchesStageChange(rule.trigger_config, deal, changes))
        continue;

      // Conditions
      if (!evaluateConditions(conditions, snapshot)) continue;

      totalMatched++;
      if (hits.length < RESULT_LIMIT) {
        hits.push(
          buildHit(
            "deal",
            dealId,
            `Deal: ${deal.title ?? dealId.slice(0, 8)}`,
            row.created_at as string,
            actions
          )
        );
      }
    }
  } else if (rule.trigger_event === "deal.created") {
    const { data, error } = await supabase
      .from("deals")
      .select("id, title, value, pipeline_id, stage_id, contact_id, company_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT);

    if (error || !data) return emptyResult();
    sourceCount = data.length;

    const tConfig = (rule.trigger_config ?? {}) as { pipeline_id?: string };

    for (const deal of data) {
      if (tConfig.pipeline_id && deal.pipeline_id !== tConfig.pipeline_id)
        continue;
      if (!evaluateConditions(conditions, deal as Record<string, unknown>))
        continue;

      totalMatched++;
      if (hits.length < RESULT_LIMIT) {
        hits.push(
          buildHit(
            "deal",
            deal.id as string,
            `Deal: ${deal.title ?? (deal.id as string).slice(0, 8)}`,
            deal.created_at as string,
            actions
          )
        );
      }
    }
  } else if (rule.trigger_event === "activity.created") {
    const { data, error } = await supabase
      .from("activities")
      .select("id, type, title, deal_id, contact_id, company_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT);

    if (error || !data) return emptyResult();
    sourceCount = data.length;

    const tConfig = (rule.trigger_config ?? {}) as {
      activity_types?: string[];
    };

    for (const activity of data) {
      if (
        Array.isArray(tConfig.activity_types) &&
        tConfig.activity_types.length > 0 &&
        !tConfig.activity_types.includes(activity.type as string)
      )
        continue;

      const snapshot = {
        ...(activity as Record<string, unknown>),
        activity_type: activity.type,
      };
      if (!evaluateConditions(conditions, snapshot)) continue;

      totalMatched++;
      if (hits.length < RESULT_LIMIT) {
        hits.push(
          buildHit(
            "activity",
            activity.id as string,
            `${formatActivityTypeLabel(activity.type as string)}: ${activity.title ?? "(ohne Titel)"}`,
            activity.created_at as string,
            actions
          )
        );
      }
    }
  }

  return {
    total_matched: totalMatched,
    hits,
    truncated: totalMatched > RESULT_LIMIT,
    source_count: sourceCount,
  };
}

function emptyResult(): DryRunResult {
  return { total_matched: 0, hits: [], truncated: false, source_count: 0 };
}

function triggerConfigMatchesStageChange(
  config: unknown,
  deal: { stage_id?: string | null; pipeline_id?: string | null },
  changes: { after?: { stage?: string } }
): boolean {
  if (!config || typeof config !== "object") return true;
  const c = config as { stage_id?: string; pipeline_id?: string };

  // Stage-Filter wirkt auf den deal.stage_id post-change.
  // Falls audit_log only "stage_name" speichert, vergleichen wir stage_id
  // gegen post-change deal.stage_id (liest aktuellen Wert).
  if (c.stage_id && deal.stage_id !== c.stage_id) {
    // changes.after.stage ist haeufig der Name, nicht UUID — nur Fallback
    if (changes.after?.stage !== c.stage_id) return false;
  }
  if (c.pipeline_id && deal.pipeline_id !== c.pipeline_id) return false;
  return true;
}

async function loadDeals(
  supabase: ReturnType<typeof createAdminClient>,
  dealIds: string[]
): Promise<
  Map<
    string,
    {
      id: string;
      title: string | null;
      value: number | null;
      pipeline_id: string | null;
      stage_id: string | null;
      contact_id: string | null;
      company_id: string | null;
    }
  >
> {
  const map = new Map<string, never>() as Map<string, never>;
  if (dealIds.length === 0) return map as never;

  const { data } = await supabase
    .from("deals")
    .select(
      "id, title, value, pipeline_id, stage_id, contact_id, company_id"
    )
    .in("id", dealIds);

  const result = new Map();
  for (const d of data ?? []) result.set((d as { id: string }).id, d);
  return result as never;
}

function formatActivityTypeLabel(type: string): string {
  switch (type) {
    case "task":
      return "Aufgabe";
    case "call":
      return "Anruf";
    case "email":
      return "E-Mail";
    case "meeting":
      return "Meeting";
    case "note":
      return "Notiz";
    default:
      return type;
  }
}
