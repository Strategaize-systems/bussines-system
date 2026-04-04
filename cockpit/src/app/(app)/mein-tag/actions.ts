"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TodayItemType = "task" | "deal_action" | "overdue_task" | "overdue_deal";

export type TodayItem = {
  id: string;
  type: TodayItemType;
  title: string;
  subtitle: string | null;
  dueDate: string | null;
  priority: string | null;
  isOverdue: boolean;
  linkHref: string;
  contactName: string | null;
  companyName: string | null;
  dealTitle: string | null;
};

export type TodayData = {
  overdue: TodayItem[];
  today: TodayItem[];
  upcoming: TodayItem[];
  stats: {
    overdueCount: number;
    todayCount: number;
    upcomingCount: number;
  };
};

export async function getTodayItems(): Promise<TodayData> {
  const supabase = await createClient();

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Tomorrow for "upcoming" window (next 2 days)
  const upcoming = new Date(now);
  upcoming.setDate(upcoming.getDate() + 2);
  const upcomingEnd = upcoming.toISOString().split("T")[0];

  const [tasksResult, dealActionsResult] = await Promise.all([
    // Open tasks with due dates (overdue + today + upcoming)
    supabase
      .from("tasks")
      .select("*, contacts(first_name, last_name), companies(name), deals(id, title)")
      .in("status", ["open", "waiting"])
      .not("due_date", "is", null)
      .lte("due_date", upcomingEnd)
      .order("due_date", { ascending: true }),

    // Active deals with next_action_date (overdue + today + upcoming)
    supabase
      .from("deals")
      .select("id, title, next_action, next_action_date, contacts(first_name, last_name), companies(name)")
      .eq("status", "active")
      .not("next_action", "is", null)
      .not("next_action_date", "is", null)
      .lte("next_action_date", upcomingEnd)
      .order("next_action_date", { ascending: true }),
  ]);

  const items: TodayItem[] = [];

  // Map tasks
  for (const task of tasksResult.data || []) {
    const isOverdue = task.due_date! < today;
    const contact = task.contacts as any;
    const company = task.companies as any;
    const deal = task.deals as any;

    items.push({
      id: `task-${task.id}`,
      type: isOverdue ? "overdue_task" : "task",
      title: task.title,
      subtitle: task.description,
      dueDate: task.due_date,
      priority: task.priority,
      isOverdue,
      linkHref: "/aufgaben",
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyName: company?.name ?? null,
      dealTitle: deal?.title ?? null,
    });
  }

  // Map deal actions
  for (const deal of dealActionsResult.data || []) {
    const isOverdue = deal.next_action_date! < today;
    const contact = deal.contacts as any;
    const company = deal.companies as any;

    items.push({
      id: `deal-${deal.id}`,
      type: isOverdue ? "overdue_deal" : "deal_action",
      title: deal.next_action!,
      subtitle: deal.title,
      dueDate: deal.next_action_date,
      priority: null,
      isOverdue,
      linkHref: `/pipeline/unternehmer`,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyName: company?.name ?? null,
      dealTitle: deal.title,
    });
  }

  // Categorize
  const overdue = items.filter((i) => i.isOverdue);
  const todayItems = items.filter((i) => !i.isOverdue && i.dueDate === today);
  const upcomingItems = items.filter((i) => !i.isOverdue && i.dueDate !== today);

  return {
    overdue,
    today: todayItems,
    upcoming: upcomingItems,
    stats: {
      overdueCount: overdue.length,
      todayCount: todayItems.length,
      upcomingCount: upcomingItems.length,
    },
  };
}

// ── Actions for completing items from "Mein Tag" ────────────

export async function completeTaskFromMeinTag(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/mein-tag");
  revalidatePath("/aufgaben");
  revalidatePath("/dashboard");
  return { error: "" };
}

export async function completeDealActionFromMeinTag(dealId: string) {
  const supabase = await createClient();

  // Get current deal info for activity log
  const { data: deal } = await supabase
    .from("deals")
    .select("title, next_action, contact_id, company_id")
    .eq("id", dealId)
    .single();

  // Clear next_action (done for today)
  const { error } = await supabase
    .from("deals")
    .update({
      next_action: null,
      next_action_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) return { error: error.message };

  // Log as activity
  if (deal) {
    await supabase.from("activities").insert({
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      deal_id: dealId,
      type: "note",
      title: `Aktion erledigt: "${deal.next_action}" (${deal.title})`,
    });
  }

  revalidatePath("/mein-tag");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { error: "" };
}

// Data needed for DealDetailSheet on Mein Tag page
export async function getMeinTagContext() {
  const supabase = await createClient();

  const [stagesResult, contactsResult, companiesResult, pipelinesResult] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("sort_order"),
    supabase.from("contacts").select("id, first_name, last_name").order("last_name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("pipelines").select("id, name").order("sort_order"),
  ]);

  return {
    stages: stagesResult.data ?? [],
    contacts: contactsResult.data ?? [],
    companies: companiesResult.data ?? [],
    pipelines: pipelinesResult.data ?? [],
  };
}

// Lightweight stats-only query for Dashboard reminder
export async function getOverdueCount(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [overdueTasks, overdueDeals] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "waiting"])
      .lt("due_date", today),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("next_action_date", "is", null)
      .lt("next_action_date", today),
  ]);

  return (overdueTasks.count ?? 0) + (overdueDeals.count ?? 0);
}
