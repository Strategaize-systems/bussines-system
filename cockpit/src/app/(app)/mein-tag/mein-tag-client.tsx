"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ListTodo,
  Kanban,
  ChevronRight,
  Clock,
  CheckCircle2,
  Sun,
  Check,
  Calendar,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function MeinTagClient({ data, stages, contacts, companies, pipelines }: MeinTagClientProps) {
  const totalItems = data.stats.overdueCount + data.stats.todayCount + data.stats.upcomingCount;
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Build a minimal Deal object for the DealDetailSheet
  const selectedDeal: Deal | null = selectedDealId
    ? {
        id: selectedDealId,
        pipeline_id: pipelines[0]?.id ?? "",
        stage_id: null,
        contact_id: null,
        company_id: null,
        title: "",
        value: null,
        expected_close_date: null,
        next_action: null,
        next_action_date: null,
        status: "active",
        opportunity_type: null,
        won_lost_reason: null,
        won_lost_details: null,
        closed_at: null,
        tags: [],
        created_at: "",
        updated_at: "",
      }
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#f2b705] to-[#ffd54f] p-2.5 text-white shadow-[0_4px_12px_rgba(242,183,5,0.3)]">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mein Tag</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Überfällig"
          count={data.stats.overdueCount}
          gradient="from-red-500 to-red-400"
          glow="rgba(239, 68, 68, 0.15)"
          icon={AlertTriangle}
          alert={data.stats.overdueCount > 0}
        />
        <SummaryCard
          label="Heute fällig"
          count={data.stats.todayCount}
          gradient="from-[#120774] to-[#4454b8]"
          glow="rgba(68, 84, 184, 0.15)"
          icon={CalendarClock}
        />
        <SummaryCard
          label="Nächste 2 Tage"
          count={data.stats.upcomingCount}
          gradient="from-[#00a84f] to-[#4dcb8b]"
          glow="rgba(0, 168, 79, 0.15)"
          icon={Clock}
        />
      </div>

      {/* Calendar Placeholder */}
      <div
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
      >
        <div className="h-1 bg-gradient-to-r from-[#4454b8] to-[#120774]" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#4454b8]" />
              <h3 className="text-sm font-bold text-slate-900">Termine heute</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cal.com — bald verfügbar</span>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
            <div className="mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#4454b8]/10 to-[#120774]/10 p-3 w-fit">
              <Video className="h-5 w-5 text-[#4454b8]" />
            </div>
            <p className="text-sm font-medium text-slate-500">Kalender-Integration kommt bald</p>
            <p className="text-xs text-slate-400 mt-1">Termine, Meetings und Verfügbarkeit direkt hier sehen</p>
          </div>
        </div>
      </div>

      {/* All Done State */}
      {totalItems === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"
          style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
        >
          <div className="mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] p-4 text-white w-fit">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Alles erledigt!</h3>
          <p className="text-sm text-slate-500 mt-1">Keine offenen Aufgaben oder Deal-Aktionen für die nächsten Tage.</p>
        </div>
      )}

      {/* Overdue Section */}
      {data.overdue.length > 0 && (
        <ItemSection
          title="Überfällig"
          items={data.overdue}
          accentGradient="from-red-500 to-red-400"
          onDealClick={setSelectedDealId}
        />
      )}

      {/* Today Section */}
      {data.today.length > 0 && (
        <ItemSection
          title="Heute"
          items={data.today}
          accentGradient="from-[#120774] to-[#4454b8]"
          onDealClick={setSelectedDealId}
        />
      )}

      {/* Upcoming Section */}
      {data.upcoming.length > 0 && (
        <ItemSection
          title="Nächste Tage"
          items={data.upcoming}
          accentGradient="from-[#00a84f] to-[#4dcb8b]"
          onDealClick={setSelectedDealId}
        />
      )}

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

function SummaryCard({
  label,
  count,
  gradient,
  glow,
  icon: Icon,
  alert,
}: {
  label: string;
  count: number;
  gradient: string;
  glow: string;
  icon: typeof AlertTriangle;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300",
        alert && "ring-2 ring-red-200"
      )}
      style={{ boxShadow: `0 1px 3px rgb(0 0 0 / 0.1), 0 8px 20px -4px ${glow}` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
          <p
            className={`text-3xl font-bold tabular-nums bg-gradient-to-r ${gradient} bg-clip-text`}
            style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            {count}
          </p>
        </div>
        <div
          className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 text-white`}
          style={{ boxShadow: `0 4px 12px ${glow}` }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ItemSection({
  title,
  items,
  accentGradient,
  onDealClick,
}: {
  title: string;
  items: TodayItem[];
  accentGradient: string;
  onDealClick: (dealId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
    >
      <div className={`h-1 bg-gradient-to-r ${accentGradient}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <span className="text-xs font-medium text-slate-400">{items.length} Einträge</span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onDealClick={onDealClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onDealClick }: { item: TodayItem; onDealClick: (dealId: string) => void }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);

  const isTask = item.type === "task" || item.type === "overdue_task";
  const isDeal = item.type === "deal_action" || item.type === "overdue_deal";
  const rawId = item.id.replace(/^(task-|deal-)/, "");

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const action = isTask ? completeTaskFromMeinTag : completeDealActionFromMeinTag;
      const result = await action(rawId);
      if (!result.error) setCompleted(true);
    });
  };

  const handleClick = () => {
    if (isDeal) {
      onDealClick(rawId);
    }
    // Tasks: navigate to /aufgaben (via Link fallback below)
  };

  if (completed) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-3 bg-green-50/60">
        <div className="rounded-lg p-2 shrink-0 bg-green-100 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <p className="text-[13px] font-medium text-green-700 line-through">{item.title}</p>
        <span className="text-[11px] text-green-600 ml-auto">Erledigt ✓</span>
      </div>
    );
  }

  const content = (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-3 transition-all cursor-pointer",
        item.isOverdue ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"
      )}
      onClick={isDeal ? handleClick : undefined}
    >
      {/* Complete Button */}
      <button
        onClick={handleComplete}
        disabled={isPending}
        className={cn(
          "rounded-lg p-2 shrink-0 transition-all",
          isPending
            ? "bg-slate-100 text-slate-400"
            : "hover:bg-green-100 hover:text-green-600",
          config.bg
        )}
        title="Als erledigt markieren"
      >
        {isPending ? (
          <Clock className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 group-hover:hidden" />
        )}
        {!isPending && <Check className="h-4 w-4 hidden group-hover:block text-green-600" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.dealTitle && isTask && (
            <span className="text-[11px] text-slate-400">{item.dealTitle}</span>
          )}
          {item.subtitle && isDeal && (
            <span className="text-[11px] text-slate-400">Deal: {item.subtitle}</span>
          )}
          {item.contactName && (
            <span className="text-[11px] text-slate-400">· {item.contactName}</span>
          )}
          {item.companyName && (
            <span className="text-[11px] text-slate-400">· {item.companyName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.priority && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", priorityColors[item.priority] ?? priorityColors.medium)}>
            {item.priority}
          </span>
        )}
        {item.dueDate && (
          <span className={cn(
            "text-[11px] font-medium whitespace-nowrap",
            item.isOverdue ? "text-red-600" : "text-slate-400"
          )}>
            {new Date(item.dueDate + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );

  // Tasks without deals link to /aufgaben, deals open popup (handled by onClick)
  if (isTask) {
    return <Link href="/aufgaben">{content}</Link>;
  }

  return content;
}
