"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, User, Calendar, AlertTriangle, Clock, MoreVertical } from "lucide-react";
import type { Deal } from "@/app/(app)/pipeline/actions";

const fmtCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const opportunityTypeLabels: Record<string, { label: string; color: string }> = {
  empfehlung: { label: "Empfehlung", color: "bg-purple-100 text-purple-700 border-purple-200" },
  direktansprache: { label: "Direkt", color: "bg-blue-100 text-blue-700 border-blue-200" },
  inbound: { label: "Inbound", color: "bg-green-100 text-green-700 border-green-200" },
  netzwerk: { label: "Netzwerk", color: "bg-amber-100 text-amber-700 border-amber-200" },
  event: { label: "Event", color: "bg-pink-100 text-pink-700 border-pink-200" },
  bestandskunde: { label: "Bestand", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface KanbanCardProps {
  deal: Deal;
  stageColor?: string;
  stageProbability?: number;
  onClick?: () => void;
}

function getDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export function KanbanCard({ deal, stageColor, stageProbability = 0, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const daysInStage = getDaysInStage(deal.updated_at);
  const isRotting = daysInStage >= 7;
  const isCritical = daysInStage >= 14;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    onClick?.();
  };

  const typeInfo = deal.opportunity_type ? opportunityTypeLabels[deal.opportunity_type] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${
        isDragging ? "ring-2 ring-[#4454b8]/40 border-2 border-slate-200" : ""
      } ${
        isCritical ? "border-2 border-red-300 ring-1 ring-red-100" : isRotting ? "border-2 border-amber-300 ring-1 ring-amber-100" : "border-2 border-slate-200"
      }`}
      onClick={handleClick}
    >
      {/* Color accent top bar */}
      <div
        className="h-1"
        style={{ backgroundColor: stageColor || "#6366f1" }}
      />

      <div className="p-3.5 space-y-2.5">
        {/* Title + Menu */}
        <div className="flex items-start justify-between gap-1">
          <div className="font-bold text-sm leading-tight text-slate-900">{deal.title}</div>
          <button className="p-0.5 rounded text-slate-300 hover:text-slate-500 shrink-0 -mr-1">
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Company + Contact */}
        {(deal.companies || deal.contacts) && (
          <div className="space-y-1">
            {deal.companies && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{deal.companies.name}</span>
              </div>
            )}
            {deal.contacts && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{deal.contacts.first_name} {deal.contacts.last_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Opportunity Type Badge */}
        {typeInfo && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
        )}

        {/* Deal-Wert */}
        {deal.value != null && (
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Deal-Wert</div>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              {fmtCompact.format(deal.value)}
            </div>
          </div>
        )}

        {/* Wahrscheinlichkeit */}
        {stageProbability > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-slate-400">Wahrscheinlichkeit</span>
              <span className="text-[10px] font-bold text-slate-600">{stageProbability}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stageProbability}%`,
                  backgroundColor: stageColor || "#6366f1",
                }}
              />
            </div>
          </div>
        )}

        {/* Close Date */}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>Close: {new Date(deal.expected_close_date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric" })}</span>
          </div>
        )}

        {/* Next Action */}
        {deal.next_action && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#4454b8] bg-[#4454b8]/5 rounded-lg px-2.5 py-1.5 border border-[#4454b8]/10">
            <span className="shrink-0">→</span>
            <span className="truncate">{deal.next_action}</span>
          </div>
        )}

        {/* Rotting Indicator */}
        {isRotting && (
          <div className={`flex items-center gap-1.5 text-[10px] font-bold rounded-lg px-2.5 py-1.5 ${
            isCritical ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"
          }`}>
            {isCritical ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Clock className="h-3 w-3 shrink-0" />}
            <span>Stagniert {daysInStage} Tage</span>
          </div>
        )}
      </div>
    </div>
  );
}
