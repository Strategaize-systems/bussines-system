// SLC-706 MT-3 — Drilldown Mein-Tag Read-Only-Variant
//
// Bewusst NICHT der volle MeinTagClient mit Quick-Actions/Edit-Buttons,
// sondern eine fokussierte Summary-Sicht auf den Tag des Target-Members:
//   - Offene Tasks (mit Fokus auf overdue)
//   - Aktive Deals mit faelliger next_action
//   - Top-Deals nach Pipeline-Sum
//   - Heutige Kalender-Events (Read-Only)
// Alle Queries filtern explizit auf owner_user_id = target_user_id.
//
// Mutate-Buttons werden bewusst NICHT gerendert. Auch wenn ein User via
// DevTools eine Mutate-Server-Action callen wuerde: SLC-704 hat
// assertNotReadOnlyContext() in jeder Mutate-Action verbaut, der Layout-
// Wrapper aus MT-1 propagiert den Context.

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ user_id: string }>;
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string;
  type: string | null;
};

type DealRow = {
  id: string;
  title: string;
  value: number | string | null;
  next_action: string | null;
  next_action_date: string | null;
  status: string;
};

type CalendarRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: string;
};

function formatEuro(value: number | string | null): string {
  const num = Number(value ?? 0);
  return num.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default async function DrilldownMeinTagPage({ params }: PageProps) {
  const { user_id: targetUserId } = await params;
  const supabase = await createClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const upcoming = new Date(today);
  upcoming.setDate(upcoming.getDate() + 7);
  const upcomingStr = upcoming.toISOString().slice(0, 10);

  // Schema-Notes:
  //   tasks: hat KEIN owner_user_id (V7 owner_user_id nur in 8 Kerntabellen,
  //     siehe MIG-033 Phase 3). Owner = `assigned_to`.
  //   calendar_events: hat KEIN owner_user_id. Owner = `created_by`.
  //   deals: hat owner_user_id (V7 Kerntabelle).
  const [openTasksRes, activeDealsRes, topDealsRes, calendarRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, due_date, priority, status, type")
      .eq("assigned_to", targetUserId)
      .in("status", ["open", "waiting"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("deals")
      .select("id, title, value, next_action, next_action_date, status")
      .eq("owner_user_id", targetUserId)
      .eq("status", "active")
      .not("next_action_date", "is", null)
      .lte("next_action_date", upcomingStr)
      .order("next_action_date", { ascending: true })
      .limit(20),
    supabase
      .from("deals")
      .select("id, title, value, next_action, next_action_date, status")
      .eq("owner_user_id", targetUserId)
      .eq("status", "active")
      .order("value", { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, type")
      .eq("created_by", targetUserId)
      .gte("start_time", dayStart)
      .lt("start_time", dayEnd)
      .order("start_time", { ascending: true }),
  ]);

  const openTasks: TaskRow[] = (openTasksRes.data ?? []) as TaskRow[];
  const activeDeals: DealRow[] = (activeDealsRes.data ?? []) as DealRow[];
  const topDeals: DealRow[] = (topDealsRes.data ?? []) as DealRow[];
  const calendar: CalendarRow[] = (calendarRes.data ?? []) as CalendarRow[];

  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < todayStr);
  const todayTasks = openTasks.filter((t) => t.due_date === todayStr);
  const upcomingTasks = openTasks.filter((t) => t.due_date && t.due_date > todayStr);

  return (
    <>
      <PageHeader
        title="Mein Tag (Drilldown)"
        subtitle="Read-Only-Sicht auf den Tag dieses Mitarbeiters"
      />
      <main className="space-y-6 px-8 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Ueberfaellig" value={overdueTasks.length.toString()} accent="rose" />
          <KpiCard label="Heute faellig" value={todayTasks.length.toString()} accent="blue" />
          <KpiCard label="Naechste 7 Tage" value={upcomingTasks.length.toString()} accent="slate" />
          <KpiCard label="Termine heute" value={calendar.length.toString()} accent="slate" />
        </div>

        <Section title="Faellige Deal-Aktionen (7 Tage)" empty={activeDeals.length === 0}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {activeDeals.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{d.next_action ?? "—"}</div>
                  <div className="truncate text-xs text-slate-500">{d.title} · {formatEuro(d.value)}</div>
                </div>
                <div className="shrink-0 text-xs text-slate-600">{formatDate(d.next_action_date)}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Top-Deals (Pipeline-Wert)" empty={topDeals.length === 0}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {topDeals.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="truncate text-sm font-medium text-slate-900">{d.title}</div>
                <div className="shrink-0 text-sm font-semibold text-slate-700">{formatEuro(d.value)}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Offene Tasks" empty={openTasks.length === 0}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {openTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{t.title}</div>
                  {t.description && (
                    <div className="truncate text-xs text-slate-500">{t.description}</div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-slate-600">{formatDate(t.due_date)}</div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Heutige Termine" empty={calendar.length === 0}>
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {calendar.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{c.title}</div>
                  <div className="text-xs text-slate-500">{c.type}</div>
                </div>
                <div className="shrink-0 text-xs text-slate-600">
                  {formatTime(c.start_time)}–{formatTime(c.end_time)}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "rose" | "blue" | "slate";
}) {
  const accentClass =
    accent === "rose"
      ? "text-rose-700"
      : accent === "blue"
        ? "text-blue-700"
        : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
      {empty ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Keine Eintraege
        </div>
      ) : (
        children
      )}
    </section>
  );
}
