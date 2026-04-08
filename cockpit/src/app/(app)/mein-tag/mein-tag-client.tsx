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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DealDetailSheet } from "../pipeline/deal-detail-sheet";
import { completeTaskFromMeinTag, completeDealActionFromMeinTag } from "./actions";
import type { TodayData, TodayItem, TodayItemType } from "./actions";
import type { Deal, PipelineStage } from "../pipeline/actions";

interface MeinTagClientProps {
  data: TodayData;
  stages: PipelineStage[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  pipelines: { id: string; name: string }[];
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

const calendarSlots = [
  { time: "09:00 - 09:30", title: "Team Standup", sub: "5 Personen", color: "bg-blue-500", type: "Meeting" },
  { time: "10:00 - 10:30", title: "Call: Max Mustermann", sub: "Max Mustermann", color: "bg-emerald-500", type: "Call" },
  { time: "11:00 - 12:30", title: "Fokus-Zeit: Angebote", sub: "", color: "bg-orange-500", type: "Block" },
  { time: "12:30 - 13:30", title: "Mittagspause", sub: "", color: "bg-purple-500", type: "External" },
  { time: "14:00 - 15:00", title: "Demo: Innovation Labs", sub: "3 Personen", color: "bg-blue-500", type: "Meeting" },
  { time: "16:00 - 17:00", title: "Strategiegespräch", sub: "2 Personen", color: "bg-teal-500", type: "Meeting" },
];

export function MeinTagClient({ data, stages, contacts, companies, pipelines }: MeinTagClientProps) {
  const totalItems = data.stats.overdueCount + data.stats.todayCount + data.stats.upcomingCount;
  const completedItems = 0;
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [activeTab, setActiveTab] = useState<"alle" | "heute" | "überfällig" | "erledigt">("alle");

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
          4h 30min frei
        </span>
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

              {/* KI-ASSISTENT */}
              <KIAssistent />
            </div>

            {/* KALENDER (4 cols) */}
            <div className="col-span-4">
              <div className="sticky top-32 space-y-4">
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
                  </div>

                  <div className="p-4 space-y-2">
                    {calendarSlots.map((slot, i) => (
                      <div
                        key={i}
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
                    ))}
                  </div>
                </div>

                {/* Verfügbare Zeit */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-emerald-200 shadow-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Verfügbare Zeit</span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-700">4h 30m</div>
                  <div className="text-xs text-emerald-600 mt-1">330 Minuten verplant von 600 Minuten</div>
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

function KIAssistent() {
  const [query, setQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const exampleQueries = [
    "Wieviel Zeit hab ich nächsten Donnerstag?",
    "Wo passt ein 30min Meeting rein?",
    "Verschieb Aufgabe X auf Freitag",
    "Was steht diese Woche noch an?",
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
          <MessageSquare size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          KI-Assistent
        </h3>
        <span className="text-xs font-medium text-slate-400">
          Frag mich etwas über deinen Tag
        </span>
      </div>

      {/* Chat / Empty State */}
      <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#120774]/10 to-[#4454b8]/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-[#4454b8]" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Stell eine Frage zu deinem Tag, deinen Aufgaben oder deiner Zeitplanung. Ich kann Termine prüfen, Aufgaben umplanen und Vorschläge machen.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="px-3 py-1.5 rounded-full bg-slate-50 text-xs font-medium text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-all cursor-pointer"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Bar (at bottom, like a chat) */}
      <div className="px-4 py-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
              strokeWidth={2.5}
            />
            <input
              type="text"
              placeholder="Frag mich etwas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  // Future: send query to KI
                  setQuery("");
                }
              }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all bg-white"
            />
          </div>

          {/* Voice */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={cn(
              "p-2.5 rounded-xl border-2 transition-all shrink-0",
              isRecording
                ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            <Mic size={16} strokeWidth={2.5} />
          </button>

          {/* Send / KI */}
          <button
            className="p-2.5 rounded-xl bg-gradient-to-r from-[#120774] to-[#4454b8] text-white shadow-md hover:shadow-lg transition-all shrink-0"
          >
            {query.trim() ? (
              <Send size={16} strokeWidth={2.5} />
            ) : (
              <Sparkles size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
