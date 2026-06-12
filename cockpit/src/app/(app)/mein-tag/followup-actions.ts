"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AIActionQueueItem } from "@/types/ai-queue";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";

// V8.15 SLC-913 MT-2 (ISSUE-111 + ISSUE-112): kompletter User-Client-Switch.
// Alle ai_action_queue-Reads/-Writes, Entity-Lookups (deals/contacts/
// email_messages) und der tasks-Insert laufen ueber createClient() —
// RLS-Klasse-C (047c, polymorpher EXISTS + decided_by-Fallback + is_admin())
// scoped auf Ownership. Pattern analog V8.12 SLC-906 MT-4 insight-actions.ts
// (ISSUE-093). Vorher: createAdminClient() (BYPASSRLS) ohne owner-Filter =
// Cross-Owner-IDOR auf Followups + Task-Erzeugung aus fremden Rows.
//
// Hinweis: FollowupSuggestions (einziger Consumer) wird aktuell nirgends
// gerendert (toter UI-Pfad, von Unified Queue abgeloest) — gehaertet statt
// entfernt, damit eine Wiederbelebung nicht das ungesicherte Pattern
// reanimiert (Wiederbelebungs-Risiko per security-audit-fable5-standard).

// ------------------------------------------------------------------
// Get pending followup suggestions
// ------------------------------------------------------------------

export async function getPendingFollowups(): Promise<AIActionQueueItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_action_queue")
    .select("*")
    .eq("source", "followup_engine")
    .eq("status", "pending")
    .order("suggested_at", { ascending: true })
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []) as AIActionQueueItem[];
}

// ------------------------------------------------------------------
// Action 1: Freigeben — approve and create a real task
// ------------------------------------------------------------------

export async function approveFollowup(actionId: string) {
  await assertNotReadOnlyContext();
  const supabase = await createClient();

  // Get the user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  // Get the action details (RLS scoped: fremde Rows sind nicht sichtbar)
  const { data: action, error: fetchError } = await supabase
    .from("ai_action_queue")
    .select("*")
    .eq("id", actionId)
    .single();

  if (fetchError || !action) return { error: "Aktion nicht gefunden" };

  // Update action status to approved
  await supabase
    .from("ai_action_queue")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .eq("id", actionId);

  // Create a real task from the suggestion
  // Determine deal_id, contact_id, company_id based on entity_type
  let deal_id: string | null = null;
  let contact_id: string | null = null;
  let company_id: string | null = null;

  if (action.entity_type === "deal") {
    deal_id = action.entity_id;
    // Look up contact and company from the deal
    const { data: deal } = await supabase
      .from("deals")
      .select("contact_id, company_id")
      .eq("id", action.entity_id)
      .single();
    if (deal) {
      contact_id = deal.contact_id;
      company_id = deal.company_id;
    }
  } else if (action.entity_type === "contact") {
    contact_id = action.entity_id;
    // Look up company from contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("company_id")
      .eq("id", action.entity_id)
      .single();
    if (contact) {
      company_id = contact.company_id;
    }
  } else if (action.entity_type === "email_message") {
    // Look up contact and deal from the email
    const { data: email } = await supabase
      .from("email_messages")
      .select("contact_id, company_id, deal_id")
      .eq("id", action.entity_id)
      .single();
    if (email) {
      contact_id = email.contact_id;
      company_id = email.company_id;
      deal_id = email.deal_id;
    }
  }

  // Create task with due_date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split("T")[0];

  const { error: taskError } = await supabase.from("tasks").insert({
    title: `[KI] ${action.action_description}`,
    description: action.reasoning,
    type: "follow_up",
    status: "open",
    priority:
      action.priority === "dringend"
        ? "high"
        : action.priority === "niedrig"
          ? "low"
          : "medium",
    due_date: dueDate,
    deal_id,
    contact_id,
    company_id,
    created_by: user.id,
  });

  if (taskError)
    return {
      error: `Task konnte nicht erstellt werden: ${taskError.message}`,
    };

  revalidatePath("/mein-tag");
  revalidatePath("/aufgaben");
  return { error: "" };
}

// ------------------------------------------------------------------
// Action 2: Verschieben — postpone by updating suggested_at
// ------------------------------------------------------------------

export async function postponeFollowup(actionId: string, days: number = 3) {
  await assertNotReadOnlyContext();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);

  // Don't approve or reject — just push the suggested_at forward
  // This makes it re-appear later in the queue
  const { error } = await supabase
    .from("ai_action_queue")
    .update({
      suggested_at: newExpiry.toISOString(),
    })
    .eq("id", actionId);

  if (error) return { error: error.message };

  revalidatePath("/mein-tag");
  return { error: "" };
}

// ------------------------------------------------------------------
// Action 3: Abbrechen — reject and store feedback
// ------------------------------------------------------------------

export async function rejectFollowup(actionId: string, reason?: string) {
  await assertNotReadOnlyContext();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" };

  // Update action to rejected
  await supabase
    .from("ai_action_queue")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .eq("id", actionId);

  // Create feedback entry
  await supabase.from("ai_feedback").insert({
    action_queue_id: actionId,
    feedback_type: "rejected",
    reason: reason ?? "Vom Benutzer abgelehnt",
  });

  revalidatePath("/mein-tag");
  return { error: "" };
}
