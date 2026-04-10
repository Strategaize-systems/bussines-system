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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DealDetailSheet } from "../pipeline/deal-detail-sheet";
import { completeTaskFromMeinTag, completeDealActionFromMeinTag } from "./actions";
import type { TodayData, TodayItem, TodayItemType, CalendarSlot, ExceptionData, NextMeetingPrep } from "./actions";
import type { Deal, PipelineStage } from "../pipeline/actions";
import type { DailySummary } from "@/lib/ai/types";
import { AiLoadButton } from "@/components/ai/ai-load-button";
import { AiResultPanel } from "@/components/ai/ai-result-panel";

interface MeinTagClientProps {
  data: TodayData;
  stages: PipelineStage[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  pipelines: { id: string; name: string }[];
  calendarSlots: CalendarSlot[];
  exceptions: ExceptionData;
  nextMeeting: NextMeetingPrep;
}

const typeConfig: Record<TodayItemType, { icon: typeof ListTodo; bg: string }> = {
  overdue_task: { icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
  overdue_deal: { icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
  task: { icon: ListTodo, bg: "bg-blue-50 text-[#4454b8]" },
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

const quickActions = [
  { label: "Neuer Kontakt", icon: Users, color: "from-[#120774] to-[#4454b8]", href: "/contacts" },
  { label: "Neue Firma", icon: Building2, color: "from-[#00a84f] to-[#4dcb8b]", href: "/companies" },
  { label: "Multiplikator", icon: Handshake, color: "from-purple-500 to-purple-600", href: "/multiplikatoren" },
  { label: "Neues Lead", icon: Target, color: "from-orange-500 to-orange-600", href: "/pipeline/leads" },
  { label: "Neue Aufgabe", icon: ListTodo, color: "from-[#120774] to-[#4454b8]", href: "/aufgaben" },
  { label: "Neue E-Mail", icon: Mail, color: "from-sky-500 to-sky-600", href: "/emails" },
  { label: "Telefonat", icon: Phone, color: "from-emerald-500 to-emerald-600", href: "#" },
  { label: "Notiz", icon: StickyNote, color: "from-amber-500 to-amber-600", href: "#" },
];

const WORKDAY_MINUTES = 600; // 10h workday (8:00–18:00)

export function MeinTagClient({ data, stages, contacts, companies, pipelines, calendarSlots, exceptions, nextMeeting }: MeinTagClientProps) {
  const totalItems = data.stats.overdueCount + data.stats.todayCount + data.stats.upcomingCount;
  const completedItems = 0;
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [activeTab, setActiveTab] = useState<"alle" | "heute" | "überfällig" | "erledigt">("alle");

  // Calculate available time from real calendar events
  const scheduledMinutes = calendarSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
  const freeMinutes = Math.max(0, WORKDAY_MINUTES - scheduledMinutes);
  const freeHours = Math.floor(freeMinutes / 60);
  const freeRestMinutes = freeMinutes % 60;

  // Exception counts
  const exceptionCount = exceptions.stagnantDeals.length + exceptions.overdueTasks.length + exceptions.overdueDeals.length;

  const allItems = [...data.overdue, ...data.today, ...data.upcoming];
  const filteredItems = activeTab === "alle" ? allItems
    : activeTab === "überfällig" ? data.overdue
    : activeTab === "heute" ? data.today
    : [];

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
          {/* Schnellaktionen */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-full flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="text-lg">+</span>
                SCHNELLAKTIONEN
              </div>
              {showQuickActions ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {showQuickActions && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-8 gap-4">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                        <action.icon size={24} strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">
                        {action.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2-Column: Aufgaben + KI-Assistent (left) | Kalender (right, sticky) */}
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT COLUMN: Aufgaben + KI-Assistent */}
            <div className="col-span-8 space-y-6">
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
                </div>

                {/* Tabs */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                  {(["alle", "heute", "überfällig", "erledigt"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        activeTab === tab
                          ? "bg-[#4454b8] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Task List */}
                <div className="divide-y divide-slate-50">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <TaskItem key={item.id} item={item} onDealClick={setSelectedDealId} />
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                      <p className="text-sm text-slate-500">Keine Aufgaben in dieser Ansicht</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100">
                  <Link
                    href="/aufgaben"
                    className="text-sm font-semibold text-[#4454b8] hover:text-[#120774] flex items-center gap-1 transition-colors"
                  >
                    Aufgabe hinzufügen <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* KI-TAGES-SUMMARY */}
              <KIDailyPanel data={data} calendarSlots={calendarSlots} exceptions={exceptions} />
            </div>

            {/* RIGHT COLUMN (4 cols): Kalender + Meeting-Prep + Exceptions + Zeit */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
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

                {/* MEETING-PREP */}
                {nextMeeting && <MeetingPrepCard meeting={nextMeeting} />}

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

// ── KI Daily Summary Panel ────────────────────────────────

function KIDailyPanel({ data, calendarSlots, exceptions }: { data: TodayData; calendarSlots: CalendarSlot[]; exceptions: ExceptionData }) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaded = summary !== null;

  const loadSummary = async () => {
    setLoading(true);
    setError(null);

    // Assemble real context from existing data
    const allItems = [...data.overdue, ...data.today, ...data.upcoming];
    const context = {
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

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "daily-summary", context }),
      });

      if (res.status === 429) {
        setError("Rate Limit erreicht. Bitte in einer Minute erneut versuchen.");
        return;
      }

      if (!res.ok) {
        setError("KI-Service nicht verfügbar.");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setSummary(data.data);
      } else {
        setError(data.error || "Unbekannter Fehler.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
          <Sparkles size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          KI-Tageseinschätzung
        </h3>
        {!loaded && !loading && (
          <AiLoadButton
            onClick={loadSummary}
            loading={false}
            loaded={false}
            label="Tagesanalyse starten"
            className="ml-auto"
          />
        )}
        {loaded && (
          <AiLoadButton
            onClick={loadSummary}
            loading={loading}
            loaded={true}
            className="ml-auto"
          />
        )}
      </div>

      <div className="p-6">
        <AiResultPanel
          loading={loading}
          error={error}
          onRetry={loadSummary}
          loadingMessage="Analysiere deinen Tag..."
        >
          {!loaded && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#120774]/10 to-[#4454b8]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-[#4454b8]" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Lass die KI deinen Tag analysieren — Prioritäten, Meeting-Vorbereitung und Warnungen auf einen Blick.
              </p>
            </div>
          )}
          {summary && (
          <div className="space-y-4">
            {/* Greeting */}
            <p className="text-sm text-slate-700 leading-relaxed">{summary.greeting}</p>

            {/* Priorities */}
            {summary.priorities.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[#4454b8] uppercase tracking-wide mb-2">Prioritäten</p>
                <ul className="space-y-1.5">
                  {summary.priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-[#4454b8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meeting Prep */}
            {summary.meetingPrep.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">Meeting-Vorbereitung</p>
                <ul className="space-y-1">
                  {summary.meetingPrep.map((m, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <Calendar size={12} className="text-blue-400 shrink-0 mt-1" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {summary.warnings.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">Warnungen</p>
                <ul className="space-y-1">
                  {summary.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-1" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Focus */}
            {summary.suggestedFocus && (
              <div className="bg-gradient-to-r from-[#120774]/5 to-[#4454b8]/5 rounded-lg p-3 border border-[#4454b8]/10">
                <p className="text-[10px] font-bold text-[#4454b8] uppercase tracking-wide mb-1">Empfohlener Fokus</p>
                <p className="text-sm font-medium text-slate-800">{summary.suggestedFocus}</p>
              </div>
            )}
          </div>
        )}
        </AiResultPanel>
      </div>
    </div>
  );
}
