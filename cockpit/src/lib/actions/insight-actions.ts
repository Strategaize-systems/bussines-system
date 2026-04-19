"use server";

// =============================================================
// Insight Actions — Approve/Reject/Batch for Signal Queue Items
// (SLC-434, MT-2..4)
// =============================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { applyProposedChange } from "@/lib/ai/signals/applier";
import type { AIActionQueueItem } from "@/types/ai-queue";

// ── Types ─────────────────────────────────────────────────────

interface InsightActionResult {
  success: boolean;
  error?: string;
  applied?: string;
}

interface BatchResult {
  total: number;
  approved: number;
  failed: number;
  errors: string[];
}

// ── Loader: Get pending insight items (SLC-435, MT-2) ────────

/**
 * Loads all pending insight queue items (signal-based) for display
 * in the Unified Queue UI on Mein Tag.
 */
export async function getPendingInsights(): Promise<AIActionQueueItem[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ai_action_queue")
    .select("*")
    .in("source", ["signal_meeting", "signal_email", "signal_manual"])
    .eq("status", "pending")
    .order("suggested_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[insights] Failed to load pending insights:", error.message);
    return [];
  }

  return (data ?? []) as AIActionQueueItem[];
}

// ── Helper: Get current user ID ───────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── MT-2: approveInsightAction ────────────────────────────────

/**
 * Approves an insight queue item:
 * 1. Sets status=approved, decided_at, decided_by
 * 2. Applies the proposed change to the target entity
 * 3. Sets execution_result
 * 4. Creates audit activity (type=ai_applied)
 * 5. Revalidates affected paths
 */
export async function approveInsightAction(
  id: string,
): Promise<InsightActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const admin = createAdminClient();

  // 1. Load queue item
  const { data: item, error: loadError } = await admin
    .from("ai_action_queue")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (loadError || !item) {
    return {
      success: false,
      error: loadError?.message ?? "Queue-Item nicht gefunden oder bereits bearbeitet",
    };
  }

  const queueItem = item as AIActionQueueItem;

  // 2. Apply the proposed change
  const applyResult = await applyProposedChange(queueItem);

  // 3. Update queue item status
  const executionResult = applyResult.success
    ? `applied: ${applyResult.applied}`
    : `failed: ${applyResult.error ?? applyResult.applied}`;

  await admin
    .from("ai_action_queue")
    .update({
      status: applyResult.success ? "approved" : "pending",
      decided_at: applyResult.success ? new Date().toISOString() : null,
      decided_by: applyResult.success ? userId : null,
      execution_result: executionResult,
    })
    .eq("id", id);

  // 4. Create audit activity if applied successfully
  if (applyResult.success && queueItem.target_entity_id) {
    await admin.from("activities").insert({
      deal_id: queueItem.target_entity_type === "deal"
        ? queueItem.target_entity_id
        : null,
      contact_id: queueItem.target_entity_type === "contact"
        ? queueItem.target_entity_id
        : null,
      type: "ai_applied",
      title: `KI-Vorschlag angewendet: ${applyResult.applied}`,
      description: queueItem.reasoning ?? undefined,
      ai_generated: true,
      source_type: "signal",
      source_id: id,
    });
  }

  // 5. Revalidate paths
  revalidatePath("/mein-tag");
  if (queueItem.target_entity_id) {
    revalidatePath(`/deals/${queueItem.target_entity_id}`);
  }

  return {
    success: applyResult.success,
    applied: applyResult.applied,
    error: applyResult.error,
  };
}

// ── MT-3: rejectInsightAction ─────────────────────────────────

/**
 * Rejects an insight queue item:
 * 1. Sets status=rejected, decided_at, decided_by
 * 2. Stores optional rejection reason in execution_result
 * 3. Creates ai_feedback entry for learning
 */
export async function rejectInsightAction(
  id: string,
  reason?: string,
): Promise<InsightActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const admin = createAdminClient();

  // 1. Update queue item status
  const { data: item, error: updateError } = await admin
    .from("ai_action_queue")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: userId,
      execution_result: reason ? `rejected: ${reason}` : "rejected",
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updateError || !item) {
    return {
      success: false,
      error: updateError?.message ?? "Queue-Item nicht gefunden oder bereits bearbeitet",
    };
  }

  // 2. Create feedback entry for learning
  await admin.from("ai_feedback").insert({
    action_queue_id: id,
    feedback_type: "rejected",
    reason: reason ?? null,
  });

  // 3. Revalidate
  revalidatePath("/mein-tag");

  return { success: true };
}

// ── MT-4: batchApproveInsightActions ──────────────────────────

/**
 * Approves multiple insight queue items.
 * Processes sequentially to maintain consistency.
 */
export async function batchApproveInsightActions(
  ids: string[],
): Promise<BatchResult> {
  const result: BatchResult = {
    total: ids.length,
    approved: 0,
    failed: 0,
    errors: [],
  };

  for (const id of ids) {
    const r = await approveInsightAction(id);
    if (r.success) {
      result.approved++;
    } else {
      result.failed++;
      result.errors.push(`${id}: ${r.error ?? "Unbekannter Fehler"}`);
    }
  }

  return result;
}
