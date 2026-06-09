"use server";

// =============================================================
// Insight Actions — Approve/Reject/Batch for Signal Queue Items
// (SLC-434, MT-2..4)
// =============================================================

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { applyProposedChange } from "@/lib/ai/signals/applier";
import type { AIActionQueueItem } from "@/types/ai-queue";

// V8.12 SLC-906 MT-4 (ISSUE-093): User-Client-Switch fuer alle ai_action_queue
// + ai_feedback Operations. RLS Klasse-C polymorph (5-Wege-EXISTS via
// entity_type=deal|email_message|contact|company|proposal + decided_by-Fallback
// + is_admin()) greift fuer Member-Eigene + Admin. activities.insert ebenfalls
// via User-Client (owner_user_id=userId align mit auth.uid()).
//
// Deviation vs Slice-Spec-Text "assertRole(['admin'])": Spec-Wording wuerde
// Members vom Approve/Reject auf mein-tag aussperren — aber mein-tag ist
// Member-facing (page.tsx erlaubt alle Rollen). RLS-Klasse-C wurde explizit
// polymorph designed um Member-eigene-Insights zu erlauben. ISSUE-093
// Next-Action "Option A preferred" sagt ebenfalls User-Client-Switch.

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
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
  await assertNotReadOnlyContext();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht authentifiziert" };
  }
  const userId = user.id;

  // 1. Load queue item
  const { data: item, error: loadError } = await supabase
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

  await supabase
    .from("ai_action_queue")
    .update({
      status: applyResult.success ? "approved" : "pending",
      decided_at: applyResult.success ? new Date().toISOString() : null,
      decided_by: applyResult.success ? userId : null,
      execution_result: executionResult,
    })
    .eq("id", id);

  // 4. Create audit activity if applied successfully
  // V7 SLC-704 MT-6: owner_user_id = approver user (User-Approval-Pfad, DEC-182).
  if (applyResult.success && queueItem.target_entity_id) {
    await supabase.from("activities").insert({
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
      owner_user_id: userId,
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
  await assertNotReadOnlyContext();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht authentifiziert" };
  }
  const userId = user.id;

  // 1. Update queue item status
  const { data: item, error: updateError } = await supabase
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
  await supabase.from("ai_feedback").insert({
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
