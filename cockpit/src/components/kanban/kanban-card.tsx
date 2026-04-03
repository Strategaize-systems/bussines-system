"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar } from "lucide-react";
import type { Deal } from "@/app/(app)/pipeline/actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const opportunityTypeLabels: Record<string, string> = {
  empfehlung: "Empfehlung",
  direktansprache: "Direkt",
  inbound: "Inbound",
  netzwerk: "Netzwerk",
  event: "Event",
  bestandskunde: "Bestand",
};

interface KanbanCardProps {
  deal: Deal;
  stageColor?: string;
  onClick?: () => void;
}

export function KanbanCard({ deal, stageColor, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    onClick?.();
  };

  const initials = deal.contacts
    ? `${deal.contacts.first_name[0]}${deal.contacts.last_name[0]}`
    : deal.companies
    ? deal.companies.name[0]
    : "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${
        isDragging ? "ring-2 ring-[#4454b8]/40" : ""
      }`}
      onClick={handleClick}
    >
      {/* Color accent top bar */}
      <div
        className="h-[3px]"
        style={{ backgroundColor: stageColor || "#6366f1" }}
      />

      <div className="p-3 space-y-2">
        {/* Title + Type */}
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold text-[13px] leading-tight text-slate-800">{deal.title}</div>
          {deal.opportunity_type && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
              {opportunityTypeLabels[deal.opportunity_type] ?? deal.opportunity_type}
            </Badge>
          )}
        </div>

        {/* Value */}
        {deal.value != null && (
          <div className="text-xs font-bold gradient-text-success">
            {fmt.format(deal.value)}
          </div>
        )}

        {/* Contact/Company with Avatar */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: stageColor || "#6366f1" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {deal.contacts && (
              <div className="text-xs font-medium text-slate-700 truncate">
                {deal.contacts.first_name} {deal.contacts.last_name}
              </div>
            )}
            {deal.companies && (
              <div className="text-[11px] text-slate-400 truncate">
                {deal.companies.name}
              </div>
            )}
          </div>
        </div>

        {/* Next Action */}
        {deal.next_action && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 rounded-lg px-2 py-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.next_action}</span>
          </div>
        )}

        {/* Tags */}
        {deal.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
