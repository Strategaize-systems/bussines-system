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

  const [stagesResult, contactsResult, companiesResult, pipelinesResult, dealsResult] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("sort_order"),
    supabase.from("contacts").select("id, first_name, last_name").order("last_name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("pipelines").select("id, name").order("sort_order"),
    supabase.from("deals").select("id, title").order("title"),
  ]);

  return {
    stages: stagesResult.data ?? [],
    contacts: contactsResult.data ?? [],
    companies: companiesResult.data ?? [],
    pipelines: pipelinesResult.data ?? [],
    deals: dealsResult.data ?? [],
  };
}

// ── Calendar events for today ────────────────────────────────

export type CalendarSlot = {
  id: string;
  time: string;
  title: string;
  sub: string;
  color: string;
  type: string;
  durationMinutes: number;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  meetingId: string | null;
};

const typeColors: Record<string, string> = {
  meeting: "bg-blue-500",
  call: "bg-emerald-500",
  block: "bg-orange-500",
  personal: "bg-purple-500",
  other: "bg-slate-500",
};

const typeLabels: Record<string, string> = {
  meeting: "Meeting",
  call: "Call",
  block: "Block",
  personal: "Privat",
  other: "Termin",
};

export async function getCalendarEventsForToday(): Promise<CalendarSlot[]> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*, contacts(first_name, last_name), companies(name), deals(title)")
    .gte("start_time", todayStart)
    .lt("start_time", todayEnd)
    .order("start_time", { ascending: true });

  if (!events || events.length === 0) return [];

  return events.map((e: any) => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    const contact = e.contacts as any;
    const company = e.companies as any;
    const deal = e.deals as any;

    const sub = [
      contact ? `${contact.first_name} ${contact.last_name}` : null,
      company?.name,
      deal?.title,
    ].filter(Boolean).join(" · ");

    return {
      id: e.id,
      time: `${start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
      title: e.title,
      sub,
      color: typeColors[e.type] || typeColors.other,
      type: typeLabels[e.type] || typeLabels.other,
      durationMinutes: duration,
      dealId: e.deal_id,
      contactId: e.contact_id,
      companyId: e.company_id,
      meetingId: e.meeting_id,
    };
  });
}

// ── Exception data: stagnant deals + overdue items ──────────

export type ExceptionData = {
  stagnantDeals: {
    id: string;
    title: string;
    daysSinceUpdate: number;
    value: number | null;
    stage: string | null;
    companyName: string | null;
  }[];
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string;
    priority: string | null;
    companyName: string | null;
  }[];
  overdueDeals: {
    id: string;
    title: string;
    nextActionDate: string;
    nextAction: string;
    companyName: string | null;
  }[];
};

export async function getExceptionData(): Promise<ExceptionData> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [stagnantResult, overdueTasksResult, overdueDealsResult] = await Promise.all([
    // Deals without update for >14 days
    supabase
      .from("deals")
      .select("id, title, value, updated_at, companies(name), pipeline_stages(name)")
      .eq("status", "active")
      .lt("updated_at", fourteenDaysAgo)
      .order("updated_at", { ascending: true })
      .limit(10),

    // Overdue tasks
    supabase
      .from("tasks")
      .select("id, title, due_date, priority, companies(name)")
      .in("status", ["open", "waiting"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),

    // Overdue deal actions
    supabase
      .from("deals")
      .select("id, title, next_action, next_action_date, companies(name)")
      .eq("status", "active")
      .not("next_action_date", "is", null)
      .lt("next_action_date", today)
      .order("next_action_date", { ascending: true })
      .limit(10),
  ]);

  return {
    stagnantDeals: (stagnantResult.data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      daysSinceUpdate: Math.floor((now.getTime() - new Date(d.updated_at).getTime()) / (24 * 60 * 60 * 1000)),
      value: d.value,
      stage: (d.pipeline_stages as any)?.name ?? null,
      companyName: (d.companies as any)?.name ?? null,
    })),
    overdueTasks: (overdueTasksResult.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
      companyName: (t.companies as any)?.name ?? null,
    })),
    overdueDeals: (overdueDealsResult.data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      nextActionDate: d.next_action_date,
      nextAction: d.next_action,
      companyName: (d.companies as any)?.name ?? null,
    })),
  };
}

// ── Next meeting with context ───────────────────────────────

export type NextMeetingPrep = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  agenda: string | null;
  participants: string | null;
  dealTitle: string | null;
  dealId: string | null;
  dealValue: number | null;
  dealStage: string | null;
  contactName: string | null;
  companyName: string | null;
} | null;

export async function getNextMeetingWithContext(): Promise<NextMeetingPrep> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: meeting } = await supabase
    .from("meetings")
    .select(`
      id, title, scheduled_at, duration_minutes, location, agenda, participants,
      deal_id,
      deals(id, title, value, pipeline_stages(name)),
      contacts(first_name, last_name),
      companies(name)
    `)
    .eq("status", "planned")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!meeting) return null;

  const deal = meeting.deals as any;
  const contact = meeting.contacts as any;
  const company = meeting.companies as any;

  return {
    id: meeting.id,
    title: meeting.title,
    scheduledAt: meeting.scheduled_at,
    durationMinutes: meeting.duration_minutes,
    location: meeting.location,
    agenda: meeting.agenda,
    participants: meeting.participants,
    dealTitle: deal?.title ?? null,
    dealId: deal?.id ?? null,
    dealValue: deal?.value ?? null,
    dealStage: deal?.pipeline_stages?.name ?? null,
    contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
    companyName: company?.name ?? null,
  };
}

// ── Daily summary context assembly ──────────────────────────

export async function getDailySummaryContext() {
  const [todayData, calendarSlots, exceptions, nextMeeting] = await Promise.all([
    getTodayItems(),
    getCalendarEventsForToday(),
    getExceptionData(),
    getNextMeetingWithContext(),
  ]);

  const allItems = [...todayData.overdue, ...todayData.today, ...todayData.upcoming];

  return {
    todaysTasks: allItems.map((item) => ({
      title: item.title,
      priority: item.priority ?? undefined,
      dueDate: item.dueDate ?? undefined,
    })),
    upcomingMeetings: calendarSlots
      .filter((s) => s.type === "Meeting" || s.type === "Call")
      .map((s) => ({
        title: s.title,
        time: s.time,
        attendees: s.sub ? [s.sub] : undefined,
        dealName: undefined,
      })),
    stagnantDeals: exceptions.stagnantDeals.map((d) => ({
      name: d.title,
      daysSinceLastActivity: d.daysSinceUpdate,
      value: d.value ?? undefined,
      stage: d.stage ?? undefined,
    })),
    overdueItems: [
      ...exceptions.overdueTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        type: "task" as const,
      })),
      ...exceptions.overdueDeals.map((d) => ({
        title: `${d.nextAction} (${d.title})`,
        dueDate: d.nextActionDate,
        type: "deal_action" as const,
      })),
    ],
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
