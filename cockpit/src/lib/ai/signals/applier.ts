// =============================================================
// Signal Applier — Applies approved proposed changes (SLC-434, MT-1)
// =============================================================
//
// Reads proposed_changes JSONB from a queue item and executes
// the corresponding UPDATE on the target entity (deal/contact).
// Each signal type maps to a specific field update.
//
// V7 SLC-704 MT-6: Dieser Applier macht NUR UPDATEs (kein Insert in
// Kerntabellen). Bestehende owner_user_id-Werte werden durch die UPDATEs
// nicht ueberschrieben. Daher kein Owner-Wiring noetig.
//
// V8.15 SLC-913 MT-2 (ISSUE-117): kein interner createAdminClient() mehr —
// der Caller (approveInsightAction, User-Client + RLS-Klasse-C) reicht seinen
// Client durch. Das deal-UPDATE laeuft damit RLS-scoped (can_see_owner);
// fremde Deals sind fuer den Approver nicht mutierbar.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProposedChange, AIActionQueueItem } from "@/types/ai-queue";

// ── Public types ──────────────────────────────────────────────

export interface ApplyResult {
  success: boolean;
  applied: string;
  error?: string;
}

// ── Main entry point ──────────────────────────────────────────

/**
 * Applies the proposed change from a queue item to the target entity.
 * Returns a structured result indicating what was changed.
 */
export async function applyProposedChange(
  item: AIActionQueueItem,
  client: SupabaseClient,
): Promise<ApplyResult> {
  if (!item.proposed_changes || !item.target_entity_type || !item.target_entity_id) {
    return {
      success: false,
      applied: "no_change",
      error: "Missing proposed_changes, target_entity_type, or target_entity_id",
    };
  }

  const change = item.proposed_changes;
  const entityId = item.target_entity_id;

  switch (item.type) {
    case "status_change":
      return applyStageChange(client, entityId, change);

    case "value_change":
      return applyValueChange(client, entityId, change);

    case "tag_change":
      return applyTagChange(client, entityId, change);

    case "property_change":
      return applyPropertyChange(client, entityId, change);

    default:
      return {
        success: false,
        applied: "not_applicable",
        error: `Unsupported action type for apply: ${item.type}`,
      };
  }
}

// ── Stage change (stage_suggestion → deals.stage_id) ──────────

async function applyStageChange(
  client: SupabaseClient,
  dealId: string,
  change: ProposedChange,
): Promise<ApplyResult> {
  const proposedStageName = String(change.new);

  // Look up stage ID by name
  const { data: stage } = await client
    .from("pipeline_stages")
    .select("id, name")
    .ilike("name", proposedStageName)
    .maybeSingle();

  if (!stage) {
    return {
      success: false,
      applied: "stage_not_found",
      error: `Pipeline-Stage "${proposedStageName}" nicht gefunden`,
    };
  }

  const { error } = await client
    .from("deals")
    .update({
      stage_id: stage.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) {
    return { success: false, applied: "update_failed", error: error.message };
  }

  return {
    success: true,
    applied: `Phase geaendert: ${change.old ?? "?"} → ${stage.name}`,
  };
}

// ── Value change (value_update → deals.value) ─────────────────

async function applyValueChange(
  client: SupabaseClient,
  dealId: string,
  change: ProposedChange,
): Promise<ApplyResult> {
  const newValue = parseFloat(String(change.new));
  if (isNaN(newValue)) {
    return {
      success: false,
      applied: "invalid_value",
      error: `Ungueltige Zahl: "${change.new}"`,
    };
  }

  const { error } = await client
    .from("deals")
    .update({
      value: newValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) {
    return { success: false, applied: "update_failed", error: error.message };
  }

  return {
    success: true,
    applied: `Wert geaendert: ${change.old ?? "?"} → ${newValue} EUR`,
  };
}

// ── Tag change (tag_addition) ─────────────────────────────────
// Tags column does not exist yet on deals. Log as not_applicable
// until the schema is extended. The queue item remains as documentation.

async function applyTagChange(
  _client: SupabaseClient,
  _dealId: string,
  change: ProposedChange,
): Promise<ApplyResult> {
  return {
    success: false,
    applied: "not_applicable",
    error: `Tag "${change.new}" vorgeschlagen, aber tags-Spalte existiert noch nicht auf deals`,
  };
}

// ── Property change (priority_change) ─────────────────────────
// Priority column does not exist yet on deals. Same handling as tags.

async function applyPropertyChange(
  _client: SupabaseClient,
  _dealId: string,
  change: ProposedChange,
): Promise<ApplyResult> {
  return {
    success: false,
    applied: "not_applicable",
    error: `Property "${change.field}" vorgeschlagen, aber Spalte existiert noch nicht auf deals`,
  };
}
