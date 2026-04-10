"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FocusItem = {
  id: string;
  sourceType: "task" | "deal_action";
  sourceId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string | null;
  isOverdue: boolean;
  taskType: string | null;
  dealId: string | null;
  dealTitle: string | null;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
};

/**
 * Get a prioritized focus queue.
 * Sort: 1. Overdue by age, 2. Due today by priority, 3. Follow-ups by date
 */
export async function getFocusQueue(limit: number = 10): Promise<FocusItem[]> {
  const supabase = await createClient();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const upcoming = new Date(now);
  upcoming.setDate(upcoming.getDate() + 3);
  const upcomingEnd = upcoming.toISOString().split("T")[0];

  const [tasksResult, dealActionsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, contacts(id, first_name, last_name), companies(id, name), deals(id, title)")
      .in("status", ["open", "waiting"])
      .not("due_date", "is", null)
      .lte("due_date", upcomingEnd)
      .order("due_date", { ascending: true })
      .limit(limit),

    supabase
      .from("deals")
      .select("id, title, next_action, next_action_date, contacts(id, first_name, last_name), companies(id, name)")
      .eq("status", "active")
      .not("next_action", "is", null)
      .not("next_action_date", "is", null)
      .lte("next_action_date", upcomingEnd)
      .order("next_action_date", { ascending: true })
      .limit(limit),
  ]);

  const items: FocusItem[] = [];

  for (const task of tasksResult.data || []) {
    const contact = task.contacts as any;
    const company = task.companies as any;
    const deal = task.deals as any;

    items.push({
      id: `task-${task.id}`,
      sourceType: "task",
      sourceId: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      priority: task.priority,
      isOverdue: task.due_date! < today,
      taskType: task.type ?? "manual",
      dealId: deal?.id ?? null,
      dealTitle: deal?.title ?? null,
      contactId: contact?.id ?? null,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
    });
  }

  for (const deal of dealActionsResult.data || []) {
    const contact = deal.contacts as any;
    const company = deal.companies as any;

    items.push({
      id: `deal-${deal.id}`,
      sourceType: "deal_action",
      sourceId: deal.id,
      title: deal.next_action!,
      description: deal.title,
      dueDate: deal.next_action_date,
      priority: null,
      isOverdue: deal.next_action_date! < today,
      taskType: null,
      dealId: deal.id,
      dealTitle: deal.title,
      contactId: contact?.id ?? null,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
    });
  }

  // Sort: overdue first (oldest first), then today (high priority first), then upcoming
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.isOverdue && b.isOverdue) {
      return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    }
    const pa = priorityOrder[a.priority ?? "medium"] ?? 1;
    const pb = priorityOrder[b.priority ?? "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  });

  return items.slice(0, limit);
}

export async function completeTaskFromFocus(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/focus");
  revalidatePath("/mein-tag");
  revalidatePath("/aufgaben");
  return { error: "" };
}

export async function completeDealActionFromFocus(dealId: string) {
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("title, next_action, contact_id, company_id")
    .eq("id", dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({ next_action: null, next_action_date: null, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: error.message };

  if (deal) {
    await supabase.from("activities").insert({
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      deal_id: dealId,
      type: "note",
      title: `Aktion erledigt: "${deal.next_action}" (${deal.title})`,
    });
  }

  revalidatePath("/focus");
  revalidatePath("/mein-tag");
  revalidatePath("/pipeline");
  return { error: "" };
}
