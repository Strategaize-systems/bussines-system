// =============================================================
// AI Action Queue — CRUD service layer (FEAT-407, FEAT-408)
// =============================================================
//
// Server-side operations for the ai_action_queue table.
// All functions use the admin client (service role) for
// unrestricted access — call only from server actions / API routes.

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AIActionQueueItem,
  AIActionStatus,
  AIActionType,
  AIActionSource,
  AIActionEntityType,
  AITargetEntityType,
  ProposedChange,
} from "@/types/ai-queue";

// -------------------------------------------------------------
// Priority sort helper
// -------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = {
  dringend: 1,
  normal: 2,
  niedrig: 3,
};

// -------------------------------------------------------------
// 1. createAction
// -------------------------------------------------------------

export async function createAction(input: {
  type: AIActionType;
  action_description: string;
  reasoning?: string;
  entity_type: AIActionEntityType;
  entity_id: string;
  context_json?: Record<string, unknown>;
  priority?: "dringend" | "normal" | "niedrig";
  source: AIActionSource;
  dedup_key?: string;
  expires_at?: string;
  // V4.3 Insight Governance — optional fields for signal-based entries
  target_entity_type?: AITargetEntityType;
  target_entity_id?: string;
  proposed_changes?: ProposedChange;
  confidence?: number;
}): Promise<AIActionQueueItem> {
  const supabase = createAdminClient();

  // Dedup check: if a pending action with the same dedup_key exists, return it
  if (input.dedup_key) {
    const { data: existing } = await supabase
      .from("ai_action_queue")
      .select("*")
      .eq("dedup_key", input.dedup_key)
      .eq("status", "pending")
      .limit(1)
      .single();

    if (existing) {
      return existing as AIActionQueueItem;
    }
  }

  const { data, error } = await supabase
    .from("ai_action_queue")
    .insert({
      type: input.type,
      action_description: input.action_description,
      reasoning: input.reasoning ?? null,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      context_json: input.context_json ?? null,
      priority: input.priority ?? "normal",
      source: input.source,
      dedup_key: input.dedup_key ?? null,
      expires_at: input.expires_at ?? null,
      // V4.3 fields
      target_entity_type: input.target_entity_type ?? null,
      target_entity_id: input.target_entity_id ?? null,
      proposed_changes: input.proposed_changes ?? null,
      confidence: input.confidence ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`[ActionQueue] createAction failed: ${error.message}`);
  }

  return data as AIActionQueueItem;
}

// -------------------------------------------------------------
// 2. getPendingActions
// -------------------------------------------------------------

export async function getPendingActions(options?: {
  limit?: number;
  entity_type?: AIActionEntityType;
  source?: AIActionSource;
}): Promise<AIActionQueueItem[]> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? 50;

  let query = supabase
    .from("ai_action_queue")
    .select("*")
    .eq("status", "pending" as AIActionStatus)
    .order("suggested_at", { ascending: true })
    .limit(limit);

  if (options?.entity_type) {
    query = query.eq("entity_type", options.entity_type);
  }

  if (options?.source) {
    query = query.eq("source", options.source);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[ActionQueue] getPendingActions failed: ${error.message}`);
  }

  const items = (data ?? []) as AIActionQueueItem[];

  // Sort by priority (dringend first) then by suggested_at (already sorted by DB)
  items.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 2;
    const pb = PRIORITY_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    return 0; // suggested_at order already applied by DB
  });

  return items;
}

// -------------------------------------------------------------
// 3. approveAction
// -------------------------------------------------------------

export async function approveAction(
  id: string,
  userId: string
): Promise<AIActionQueueItem> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_action_queue")
    .update({
      status: "approved" as AIActionStatus,
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`[ActionQueue] approveAction failed: ${error.message}`);
  }

  return data as AIActionQueueItem;
}

// -------------------------------------------------------------
// 4. rejectAction
// -------------------------------------------------------------

export async function rejectAction(
  id: string,
  userId: string,
  reason?: string
): Promise<AIActionQueueItem> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_action_queue")
    .update({
      status: "rejected" as AIActionStatus,
      decided_at: new Date().toISOString(),
      decided_by: userId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`[ActionQueue] rejectAction failed: ${error.message}`);
  }

  // Create ai_feedback entry for learning
  const { error: feedbackError } = await supabase
    .from("ai_feedback")
    .insert({
      action_queue_id: id,
      feedback_type: "rejected",
      reason: reason ?? null,
    });

  if (feedbackError) {
    console.error(
      "[ActionQueue] Failed to create ai_feedback:",
      feedbackError.message
    );
  }

  return data as AIActionQueueItem;
}

// -------------------------------------------------------------
// 5. getActionsForEntity
// -------------------------------------------------------------

export async function getActionsForEntity(
  entityType: AIActionEntityType,
  entityId: string
): Promise<AIActionQueueItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_action_queue")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("suggested_at", { ascending: false });

  if (error) {
    throw new Error(
      `[ActionQueue] getActionsForEntity failed: ${error.message}`
    );
  }

  return (data ?? []) as AIActionQueueItem[];
}

// -------------------------------------------------------------
// 6. expireOldActions
// -------------------------------------------------------------

export async function expireOldActions(): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("ai_action_queue")
    .update({ status: "expired" as AIActionStatus })
    .eq("status", "pending" as AIActionStatus)
    .lt("expires_at", now)
    .select("id");

  if (error) {
    throw new Error(`[ActionQueue] expireOldActions failed: ${error.message}`);
  }

  return data?.length ?? 0;
}
