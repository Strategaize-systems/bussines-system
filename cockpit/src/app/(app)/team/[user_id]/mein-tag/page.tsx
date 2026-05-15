// V7.1 SLC-712b — Mein-Tag-Drilldown via MeinTagClient-Reuse.
//
// Ersetzt die V7-SLC-706 MT-3 reduzierte Summary-Sicht. Laedt alle
// Mein-Tag-Daten mit target-user-scoped Filter und uebergibt sie an
// die volle MeinTagClient-Component mit readOnly + viewAsUserId +
// targetUserDisplayName Props.
//
// Schema-Notes (V7 MIG-033 Phase 3 — owner_user_id nur in 8 Kerntabellen):
//   - tasks: Owner = `assigned_to`
//   - calendar_events: Owner = `created_by`
//   - meetings: nicht direkt owner — geladen via deal-owner-Match
//   - deals: hat owner_user_id (V7 Kerntabelle)
//
// Architektur-Hinweis: ReadOnlyContext wird im Drilldown-Layout via
// runWithReadOnlyContext + ReadOnlyContextProvider gewrappt.
// Server Actions mit assertNotReadOnlyContext() blockt Mutate-Versuche
// als Defense-in-Depth (DEC-189).

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeinTagContext, type TodayData, type TodayItem, type CalendarSlot, type NextMeetingPrep, type TopDeal, type GatekeeperSummary } from "@/app/(app)/mein-tag/actions";
import { MeinTagClient } from "@/app/(app)/mein-tag/mein-tag-client";

interface PageProps {
  params: Promise<{ user_id: string }>;
}

// V7.1 SLC-712b — Type-Helper kopiert aus mein-tag/actions.ts.
// Calendar-Event-Type-Color/Label-Mapping wird auch in der Self-Action
// definiert. Hier dupliziert um Self-Action unveraendert zu lassen
// (Self regression-frei garantiert).
const typeColors: Record<string, string> = {
  call: "bg-emerald-500",
  meeting: "bg-blue-500",
  consultation: "bg-purple-500",
  internal: "bg-amber-500",
  other: "bg-slate-500",
};

const typeLabels: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  consultation: "Beratung",
  internal: "Intern",
  other: "Termin",
};

export default async function DrilldownMeinTagPage({ params }: PageProps) {
  const { user_id: targetUserId } = await params;
  const supabase = await createClient();

  // Target-User-Profile fuer Display-Name (Drilldown-Banner ist schon im Layout)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!profile) notFound();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const upcoming = new Date(now);
  upcoming.setDate(upcoming.getDate() + 2);
  const upcomingEnd = upcoming.toISOString().split("T")[0];
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const nowIso = now.toISOString();

  // ── Today-Items (TodayData-kompatible Shape) ────────────────────────
  const [tasksResult, dealActionsResult, contextResult, calendarResult, nextMeetingResult, topDealsResult, gatekeeperEmailsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, contacts(first_name, last_name), companies(name), deals(id, title)")
      .eq("assigned_to", targetUserId)
      .in("status", ["open", "waiting"])
      .not("due_date", "is", null)
      .lte("due_date", upcomingEnd)
      .order("due_date", { ascending: true }),
    supabase
      .from("deals")
      .select("id, title, next_action, next_action_date, contacts(first_name, last_name), companies(name)")
      .eq("owner_user_id", targetUserId)
      .eq("status", "active")
      .not("next_action", "is", null)
      .not("next_action_date", "is", null)
      .lte("next_action_date", upcomingEnd)
      .order("next_action_date", { ascending: true }),
    getMeinTagContext(), // Lookup-Daten (stages, contacts, companies, deals, pipelines) sind global
    supabase
      .from("calendar_events")
      .select("*, contacts(first_name, last_name), companies(name), deals(title)")
      .eq("created_by", targetUserId)
      .gte("start_time", todayStart)
      .lt("start_time", todayEnd)
      .order("start_time", { ascending: true }),
    supabase
      .from("meetings")
      .select(`
        id, title, scheduled_at, duration_minutes, location, agenda, participants,
        deal_id, contact_id,
        deals!inner(id, title, value, owner_user_id, pipeline_stages(name)),
        contacts(id, first_name, last_name),
        companies(name)
      `)
      .eq("status", "planned")
      .eq("deals.owner_user_id", targetUserId)
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("deals")
      .select("id, title, value, next_action, next_action_date, pipeline_stages(name), companies(name)")
      .eq("owner_user_id", targetUserId)
      .eq("status", "active")
      .order("value", { ascending: false, nullsFirst: false })
      .limit(5),
    // Gatekeeper-Summary: im Drilldown bewusst auf 0 (RLS sieht keine
    // Cross-User-Mail-Klassifikation, Teamlead-View zeigt nichts).
    // Promise mit dummy count=0 fuer Shape-Konsistenz.
    Promise.resolve({ count: 0 }),
  ]);

  // ── Map tasks + deal-actions zu TodayItem[] ─────────────────────────
  const items: TodayItem[] = [];

  for (const task of (tasksResult.data ?? [])) {
    const isOverdue = (task.due_date as string) < today;
    // Supabase typed-embed: Single-Relationen kommen als Array — wir nehmen [0].
    const contact = (task.contacts as unknown as { first_name: string; last_name: string }[] | null)?.[0] ?? null;
    const company = (task.companies as unknown as { name: string }[] | null)?.[0] ?? null;
    const deal = (task.deals as unknown as { title: string }[] | null)?.[0] ?? null;
    const isFollowUp = task.type === "follow_up";

    items.push({
      id: `task-${task.id}`,
      type: isOverdue
        ? isFollowUp ? "overdue_follow_up" : "overdue_task"
        : isFollowUp ? "follow_up" : "task",
      title: task.title,
      subtitle: task.description,
      dueDate: task.due_date,
      priority: task.priority,
      isOverdue,
      linkHref: "/aufgaben",
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyName: company?.name ?? null,
      dealTitle: deal?.title ?? null,
      taskType: task.type ?? "manual",
    });
  }

  for (const d of (dealActionsResult.data ?? [])) {
    const dealActionDate = d.next_action_date as string;
    const isOverdue = dealActionDate < today;
    const contact = (d.contacts as unknown as { first_name: string; last_name: string }[] | null)?.[0] ?? null;
    const company = (d.companies as unknown as { name: string }[] | null)?.[0] ?? null;

    items.push({
      id: `deal-${d.id}`,
      type: isOverdue ? "overdue_deal" : "deal_action",
      title: d.next_action as string,
      subtitle: d.title,
      dueDate: dealActionDate,
      priority: null,
      isOverdue,
      linkHref: `/pipeline/unternehmer`,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyName: company?.name ?? null,
      dealTitle: d.title,
    });
  }

  const overdue = items.filter((i) => i.isOverdue);
  const todayItems = items.filter((i) => !i.isOverdue && i.dueDate === today);
  const upcomingItems = items.filter((i) => !i.isOverdue && i.dueDate !== today);

  const data: TodayData = {
    overdue,
    today: todayItems,
    upcoming: upcomingItems,
    stats: {
      overdueCount: overdue.length,
      todayCount: todayItems.length,
      upcomingCount: upcomingItems.length,
    },
  };

  // ── Map calendar_events zu CalendarSlot[] ───────────────────────────
  const calendarSlots: CalendarSlot[] = (calendarResult.data ?? []).map((e) => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    const contact = (e.contacts as unknown as { first_name: string; last_name: string }[] | null)?.[0] ?? null;
    const company = (e.companies as unknown as { name: string }[] | null)?.[0] ?? null;
    const deal = (e.deals as unknown as { title: string }[] | null)?.[0] ?? null;
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

  // ── Next-Meeting (NextMeetingPrep | null) ───────────────────────────
  let nextMeeting: NextMeetingPrep = null;
  if (nextMeetingResult.data) {
    const m = nextMeetingResult.data;
    const dealsArr = m.deals as unknown as { id: string; title: string; value: number | null; pipeline_stages?: { name: string }[] | null }[] | null;
    const deal = dealsArr?.[0] ?? null;
    const dealStageName = deal?.pipeline_stages?.[0]?.name ?? null;
    const contact = (m.contacts as unknown as { id: string; first_name: string; last_name: string }[] | null)?.[0] ?? null;
    const company = (m.companies as unknown as { name: string }[] | null)?.[0] ?? null;
    const meetingStart = new Date(m.scheduled_at);
    nextMeeting = {
      id: m.id,
      title: m.title,
      scheduledAt: m.scheduled_at,
      timeStr: meetingStart.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: m.duration_minutes,
      location: m.location,
      agenda: m.agenda,
      participants: m.participants,
      dealTitle: deal?.title ?? null,
      dealId: deal?.id ?? null,
      dealValue: deal?.value ?? null,
      dealStage: dealStageName,
      contactId: contact?.id ?? m.contact_id ?? null,
      contactName: contact ? `${contact.first_name} ${contact.last_name}` : null,
      companyName: company?.name ?? null,
    };
  }

  // ── Top-Deals ───────────────────────────────────────────────────────
  const topDeals: TopDeal[] = (topDealsResult.data ?? []).map((d) => {
    const stage = (d.pipeline_stages as unknown as { name: string }[] | null)?.[0] ?? null;
    const company = (d.companies as unknown as { name: string }[] | null)?.[0] ?? null;
    return {
      id: d.id,
      title: d.title,
      value: d.value,
      stage: stage?.name ?? null,
      // V7.1 SLC-712b: probability + weightedValue + contactName sind in
      // Drilldown nicht relevant fuer Top-Deals-Display, defaulten auf 0/null.
      probability: 0,
      weightedValue: 0,
      contactName: null,
      companyName: company?.name ?? null,
      nextAction: d.next_action,
      nextActionDate: d.next_action_date,
    };
  });

  // ── Gatekeeper-Summary (im Drilldown bewusst alle 0) ───────────────
  // RLS sieht keine Cross-User-Mail-Klassifikation, Teamlead-View zeigt
  // keine Member-Mail-Inbox-Daten. Alle Felder defaulten auf 0.
  void gatekeeperEmailsResult; // suppress unused-warning
  const gatekeeperSummary: GatekeeperSummary = {
    total: 0,
    unclassified: 0,
    dringend: 0,
    normal: 0,
    niedrig: 0,
    irrelevant: 0,
    pendingActions: 0,
  };

  const dateLabel = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MeinTagClient
      userId={targetUserId}
      data={data}
      stages={contextResult.stages}
      contacts={contextResult.contacts}
      companies={contextResult.companies}
      deals={contextResult.deals}
      pipelines={contextResult.pipelines}
      calendarSlots={calendarSlots}
      nextMeeting={nextMeeting}
      topDeals={topDeals}
      gatekeeperSummary={gatekeeperSummary}
      dateLabel={dateLabel}
      readOnly
      viewAsUserId={targetUserId}
      targetUserDisplayName={profile.display_name ?? "Mitarbeiter"}
    />
  );
}
