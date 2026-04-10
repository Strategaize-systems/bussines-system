"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ListTodo,
  Kanban,
  ChevronRight,
  Clock,
  CheckCircle2,
  Check,
  Calendar,
  CalendarClock,
  Users,
  Building2,
  Handshake,
  Target,
  Mail,
  Phone,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Mic,
  Search,
  Send,
  MessageSquare,
  MapPin,
  TrendingDown,
  Loader2,
  FileText,
  History,
  Eye,
  ArrowRightLeft,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DealDetailSheet } from "../pipeline/deal-detail-sheet";
import { completeTaskFromMeinTag, completeDealActionFromMeinTag } from "./actions";
import type { TodayData, TodayItem, TodayItemType, CalendarSlot, ExceptionData, NextMeetingPrep, TopDeal } from "./actions";
import type { Deal, PipelineStage } from "../pipeline/actions";
import { TaskSheet } from "../aufgaben/task-sheet";
import { EmailSheet } from "../emails/email-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { EventSheet } from "@/components/calendar/event-sheet";
import { KIWorkspace } from "./ki-workspace";

interface MeinTagClientProps {
  data: TodayData;
  stages: PipelineStage[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  pipelines: { id: string; name: string }[];
  calendarSlots: CalendarSlot[];
  exceptions: ExceptionData;
  nextMeeting: NextMeetingPrep;
  topDeals: TopDeal[];
}

const typeConfig: Record<TodayItemType, { icon: typeof ListTodo; bg: string }> = {
  overdue_task: { icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
  overdue_follow_up: { icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
  overdue_deal: { icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
  task: { icon: ListTodo, bg: "bg-blue-50 text-[#4454b8]" },
  follow_up: { icon: CalendarClock, bg: "bg-purple-50 text-purple-600" },
  deal_action: { icon: Kanban, bg: "bg-emerald-50 text-[#00a84f]" },
};

const priorityColors: Record<string, { bg: string; label: string }> = {
  high: { bg: "bg-red-100 text-red-700 border-red-200", label: "Hoch" },
  medium: { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Mittel" },
  low: { bg: "bg-green-100 text-green-700 border-green-200", label: "Niedrig" },
};

const statusStyles: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  in_arbeit: "bg-amber-100 text-amber-700 border-amber-200",
};

// Entity creation actions (right column, above calendar)
const entityActions = [
  { label: "Neuer Kontakt", icon: Users, color: "from-[#120774] to-[#4454b8]", href: "/contacts" },
  { label: "Neue Firma", icon: Building2, color: "from-[#00a84f] to-[#4dcb8b]", href: "/companies" },
  { label: "Multiplikator", icon: Handshake, color: "from-purple-500 to-purple-600", href: "/multiplikatoren" },
];

const WORKDAY_MINUTES = 600; // 10h workday (8:00–18:00)

export function MeinTagClient({ data, stages, contacts, companies, deals, pipelines, calendarSlots, exceptions, nextMeeting, topDeals }: MeinTagClientProps) {
  const totalItems = data.stats.overdueCount + data.stats.todayCount + data.stats.upcomingCount;
  const completedItems = 0;
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Calculate available time from real calendar events
  const scheduledMinutes = calendarSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
  const freeMinutes = Math.max(0, WORKDAY_MINUTES - scheduledMinutes);
  const freeHours = Math.floor(freeMinutes / 60);
  const freeRestMinutes = freeMinutes % 60;

  // Exception counts
  const exceptionCount = exceptions.stagnantDeals.length + exceptions.overdueTasks.length + exceptions.overdueDeals.length;

  const allItems = [...data.overdue, ...data.today, ...data.upcoming];

  // Smart sort: overdue first (oldest), then by priority (high>medium>low), then by date
  const priorityScore: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const smartSorted = [...allItems].sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    const pa = priorityScore[a.priority ?? "medium"] ?? 1;
    const pb = priorityScore[b.priority ?? "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  });

  // Top-5 for compact display, rest accessible via "Alle anzeigen"
  const TOP_LIMIT = 5;
  const topItems = smartSorted.slice(0, TOP_LIMIT);
  const hasMore = smartSorted.length > TOP_LIMIT;
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? smartSorted : topItems;

  const selectedDeal: Deal | null = selectedDealId
    ? {
        id: selectedDealId, pipeline_id: pipelines[0]?.id ?? "", stage_id: null,
        contact_id: null, company_id: null, title: "", value: null,
        expected_close_date: null, next_action: null, next_action_date: null,
        status: "active", opportunity_type: null, won_lost_reason: null,
        won_lost_details: null, closed_at: null, tags: [], created_at: "", updated_at: "",
      }
    : null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Mein Tag"
        subtitle={new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) + " · Dein Operations-Cockpit"}
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={14} />
          {completedItems}/{totalItems} Erledigt
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
          <Clock size={14} />
          {freeHours}h {freeRestMinutes > 0 ? `${freeRestMinutes}m` : ""} frei
        </span>
        {exceptionCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-700">
            <AlertTriangle size={14} />
            {exceptionCount} Hinweis{exceptionCount !== 1 ? "e" : ""}
          </span>
        )}
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* 3-Column Layout */}
          <div className="grid grid-cols-12 gap-5">
            {/* LEFT COLUMN (5): Work Actions + Aufgaben + KI-Workspace */}
            <div className="col-span-5 space-y-4">

              {/* Work Quick Actions */}
              <div className="flex items-center justify-center gap-3">
                <TaskSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  trigger={<QuickActionButton icon={ListTodo} label="Aufgabe" color="from-[#120774] to-[#4454b8]" />}
                />
                <EmailSheet
                  trigger={<QuickActionButton icon={Mail} label="E-Mail" color="from-sky-500 to-sky-600" />}
                />
                <MeetingSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  trigger={<QuickActionButton icon={Users} label="Meeting" color="from-emerald-500 to-emerald-600" />}
                />
                <EventSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  trigger={<QuickActionButton icon={Calendar} label="Termin" color="from-purple-500 to-purple-600" />}
                />
                <TaskSheet
                  contacts={contacts}
                  companies={companies}
                  deals={deals}
                  defaultTitle="Anruf: "
                  trigger={<QuickActionButton icon={Phone} label="Anruf" color="from-orange-500 to-orange-600" />}
                />
              </div>

              {/* AUFGABEN */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                {/* Section Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Aufgaben
                  </h3>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 rounded-full px-2 py-0.5">
                    {totalItems} Offen
                  </span>
                  <Link
                    href="/focus"
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#120774] to-[#4454b8] text-white text-[11px] font-bold hover:shadow-md transition-all"
                  >
                    <Target size={12} />
                    Jetzt abarbeiten
                  </Link>
                </div>

                {/* Task List — Top 5 smart sorted */}
                <div className="divide-y divide-slate-50">
                  {displayItems.length > 0 ? (
                    displayItems.map((item) => (
                      <TaskItem key={item.id} item={item} onDealClick={setSelectedDealId} />
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                      <p className="text-sm text-slate-500">Keine offenen Aufgaben</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                  {hasMore && !showAll ? (
                    <button
                      onClick={() => setShowAll(true)}
                      className="text-sm font-semibold text-[#4454b8] hover:text-[#120774] transition-colors"
                    >
                      Alle {smartSorted.length} Aufgaben anzeigen
                    </button>
                  ) : hasMore && showAll ? (
                    <button
                      onClick={() => setShowAll(false)}
                      className="text-sm font-semibold text-[#4454b8] hover:text-[#120774] transition-colors"
                    >
                      Nur Top-5 anzeigen
                    </button>
                  ) : (
                    <Link
                      href="/aufgaben"
                      className="text-sm font-semibold text-[#4454b8] hover:text-[#120774] flex items-center gap-1 transition-colors"
                    >
                      Alle Aufgaben <ChevronRight size={14} />
                    </Link>
                  )}
                  <Link
                    href="/aufgaben"
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Verwaltung
                  </Link>
                </div>
              </div>

              {/* KI-WORKSPACE */}
              <KIWorkspace data={data} calendarSlots={calendarSlots} exceptions={exceptions} contacts={contacts} companies={companies} deals={deals} />
            </div>

            {/* MIDDLE COLUMN (3): Top Deals */}
            <div className="col-span-3 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Link href="/pipeline/unternehmer" className="flex flex-col items-center gap-1.5 group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
                    <Briefcase size={18} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">Deals</span>
                </Link>
              </div>

              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] flex items-center justify-center">
                    <Briefcase size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Top Deals</h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 rounded-full px-1.5 py-0.5 ml-auto">
                    {topDeals.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {topDeals.length > 0 ? (
                    topDeals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50/50 transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-900 truncate">{deal.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {deal.value != null && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {deal.value.toLocaleString("de-DE")} €
                            </span>
                          )}
                          {deal.stage && (
                            <span className="text-[10px] text-slate-400 truncate">
                              · {deal.stage}
                            </span>
                          )}
                        </div>
                        {deal.companyName && (
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Building2 size={9} /> {deal.companyName}
                          </p>
                        )}
                        {deal.nextAction && (
                          <p className="text-[10px] text-amber-600 mt-0.5 truncate">
                            → {deal.nextAction}
                          </p>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <Briefcase size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Keine aktiven Deals</p>
                    </div>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-slate-100">
                  <Link
                    href="/pipeline/unternehmer"
                    className="text-xs font-semibold text-[#00a84f] hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    Alle Deals <ChevronRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Meeting-Prep in middle column */}
              {nextMeeting && <MeetingPrepCard meeting={nextMeeting} />}
            </div>

            {/* RIGHT COLUMN (4): Kalender + Exceptions + Zeit */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
                {/* Entity Quick Actions (above calendar) */}
                <div className="flex items-center justify-center gap-3">
                  {entityActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform`}>
                        <action.icon size={18} strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">
                        {action.label}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* KALENDER */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] flex items-center justify-center">
                      <Calendar size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Kalender</h3>
                      <p className="text-[11px] text-slate-500">
                        {new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}.
                      </p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-slate-400">{calendarSlots.length} Termine</span>
                  </div>

                  <div className="p-4 space-y-2">
                    {calendarSlots.length > 0 ? (
                      calendarSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`${slot.color} rounded-xl p-3 text-white`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold opacity-90">{slot.time}</span>
                            <span className="text-[9px] font-bold bg-white/20 rounded px-1.5 py-0.5">
                              {slot.type}
                            </span>
                          </div>
                          <div className="text-sm font-bold">{slot.title}</div>
                          {slot.sub && (
                            <div className="text-[11px] opacity-80 mt-0.5">{slot.sub}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">Keine Termine heute</p>
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-slate-100">
                    <Link
                      href="/termine"
                      className="text-sm font-semibold text-[#00a84f] hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      Alle Termine <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* EXCEPTION-HINWEISE */}
                {exceptionCount > 0 && <ExceptionPanel exceptions={exceptions} />}

                {/* VERFÜGBARE ZEIT */}
                <div className={cn(
                  "rounded-2xl border-2 shadow-lg p-5",
                  freeMinutes > 120
                    ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
                    : freeMinutes > 0
                      ? "bg-gradient-to-br from-amber-50 to-white border-amber-200"
                      : "bg-gradient-to-br from-red-50 to-white border-red-200"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className={freeMinutes > 120 ? "text-emerald-600" : freeMinutes > 0 ? "text-amber-600" : "text-red-600"} />
                    <span className={cn("text-xs font-bold uppercase tracking-wide", freeMinutes > 120 ? "text-emerald-700" : freeMinutes > 0 ? "text-amber-700" : "text-red-700")}>
                      Verfügbare Zeit
                    </span>
                  </div>
                  <div className={cn("text-3xl font-bold", freeMinutes > 120 ? "text-emerald-700" : freeMinutes > 0 ? "text-amber-700" : "text-red-700")}>
                    {freeHours}h {freeRestMinutes > 0 ? `${freeRestMinutes}m` : ""}
                  </div>
                  <div className={cn("text-xs mt-1", freeMinutes > 120 ? "text-emerald-600" : freeMinutes > 0 ? "text-amber-600" : "text-red-600")}>
                    {scheduledMinutes} Minuten verplant von {WORKDAY_MINUTES} Minuten
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", freeMinutes > 120 ? "bg-emerald-500" : freeMinutes > 0 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${Math.min(100, (scheduledMinutes / WORKDAY_MINUTES) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Deal Detail Popup */}
      <DealDetailSheet
        deal={selectedDeal}
        stages={stages}
        pipelineId={pipelines[0]?.id ?? ""}
        contacts={contacts}
        companies={companies}
        open={!!selectedDealId}
        onClose={() => setSelectedDealId(null)}
      />
    </div>
  );
}

function TaskItem({ item, onDealClick }: { item: TodayItem; onDealClick: (dealId: string) => void }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const isTask = item.type === "task" || item.type === "overdue_task";
  const isDeal = item.type === "deal_action" || item.type === "overdue_deal";
  const rawId = item.id.replace(/^(task-|deal-)/, "");
  const prio = priorityColors[item.priority || "medium"] || priorityColors.medium;

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const action = isTask ? completeTaskFromMeinTag : completeDealActionFromMeinTag;
      const result = await action(rawId);
      if (!result.error) setCompleted(true);
    });
  };

  if (completed) {
    return (
      <div className="flex items-center gap-4 px-6 py-4 bg-emerald-50/50">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={14} className="text-emerald-600" />
        </div>
        <span className="text-sm text-emerald-700 font-medium line-through">{item.title}</span>
        <span className="ml-auto text-[11px] text-emerald-600 font-bold">Erledigt</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer",
        item.isOverdue && "bg-red-50/30"
      )}
      onClick={() => isDeal ? onDealClick(rawId) : undefined}
    >
      {/* Complete circle */}
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="w-8 h-8 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center shrink-0 transition-colors"
      >
        {isPending && <Clock size={12} className="text-slate-400 animate-spin" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${prio.bg}`}>
            🏁 {prio.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
            item.isOverdue ? "bg-red-100 text-red-700 border-red-200" : statusStyles.open
          }`}>
            {item.isOverdue ? "Überfällig" : "Offen"}
          </span>
          {item.dueDate && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock size={10} />
              {new Date(item.dueDate + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
          {item.companyName && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Building2 size={10} />
              {item.companyName}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </div>
  );
}

// ── Meeting-Prep Card ─────────────────────────────────────

function MeetingPrepCard({ meeting }: { meeting: NonNullable<NextMeetingPrep> }) {
  const meetingTime = new Date(meeting.scheduledAt);
  const timeStr = meetingTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-blue-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <FileText size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Meeting-Vorbereitung</h3>
          <p className="text-[11px] text-blue-600">Nächstes Meeting um {timeStr}</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{meeting.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{meeting.durationMinutes} Min. · {timeStr} Uhr</p>
        </div>
        {meeting.location && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.participants && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={12} />
            <span>{meeting.participants}</span>
          </div>
        )}
        {meeting.dealTitle && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">Verknüpfter Deal</p>
            <p className="text-sm font-bold text-slate-900">{meeting.dealTitle}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              {meeting.dealStage && <span>Phase: {meeting.dealStage}</span>}
              {meeting.dealValue != null && <span>Wert: {meeting.dealValue.toLocaleString("de-DE")} €</span>}
            </div>
          </div>
        )}
        {meeting.contactName && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users size={12} className="text-slate-400" />
            <span>{meeting.contactName}</span>
            {meeting.companyName && <span className="text-slate-400">· {meeting.companyName}</span>}
          </div>
        )}
        {meeting.agenda && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Agenda</p>
            <p className="text-xs text-slate-600 whitespace-pre-line">{meeting.agenda}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exception Panel ───────────────────────────────────────

function ExceptionPanel({ exceptions }: { exceptions: ExceptionData }) {
  const { stagnantDeals, overdueTasks, overdueDeals } = exceptions;

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-red-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
          <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Handlungsbedarf</h3>
      </div>
      <div className="p-4 space-y-3">
        {stagnantDeals.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <TrendingDown size={10} />
              Stagnierende Deals ({stagnantDeals.length})
            </p>
            <div className="space-y-1.5">
              {stagnantDeals.slice(0, 3).map((deal) => (
                <Link
                  key={deal.id}
                  href="/pipeline/unternehmer"
                  className="block bg-red-50 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800">{deal.title}</p>
                  <p className="text-[10px] text-red-600">
                    {deal.daysSinceUpdate} Tage ohne Update
                    {deal.companyName && ` · ${deal.companyName}`}
                    {deal.value != null && ` · ${deal.value.toLocaleString("de-DE")} €`}
                  </p>
                </Link>
              ))}
              {stagnantDeals.length > 3 && (
                <p className="text-[10px] text-red-500 pl-3">+{stagnantDeals.length - 3} weitere</p>
              )}
            </div>
          </div>
        )}
        {(overdueTasks.length > 0 || overdueDeals.length > 0) && (
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Clock size={10} />
              Überfällig ({overdueTasks.length + overdueDeals.length})
            </p>
            <div className="space-y-1.5">
              {overdueTasks.slice(0, 3).map((task) => (
                <Link
                  key={task.id}
                  href="/aufgaben"
                  className="block bg-amber-50 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800">{task.title}</p>
                  <p className="text-[10px] text-amber-600">
                    Fällig: {new Date(task.dueDate + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    {task.companyName && ` · ${task.companyName}`}
                  </p>
                </Link>
              ))}
              {overdueDeals.slice(0, 2).map((deal) => (
                <Link
                  key={deal.id}
                  href="/pipeline/unternehmer"
                  className="block bg-amber-50 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800">{deal.nextAction}</p>
                  <p className="text-[10px] text-amber-600">
                    Deal: {deal.title} · Fällig: {new Date(deal.nextActionDate + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick Action Button (for Sheet triggers) ────────────────────

function QuickActionButton({ icon: Icon, label, color }: { icon: typeof ListTodo; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// KIWorkspace is now in ./ki-workspace.tsx
// Old YesterdayPanel, UnseenEventsPanel, and KIDailyPanel code removed.

