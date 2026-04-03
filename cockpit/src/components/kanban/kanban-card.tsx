"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Calendar } from "lucide-react";
import type { Deal } from "@/app/(app)/pipeline/actions";

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
  onClick?: () => void;
}

export function KanbanCard({ deal, onClick }: KanbanCardProps) {
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
    // Only fire onClick if no drag occurred (pointer stayed within activation distance)
    if (isDragging) return;
    onClick?.();
  };

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: isDragging ? "#4454b8" : "transparent",
      }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all duration-200 border-l-2 hover:-translate-y-0.5"
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold text-[13px] leading-tight text-slate-800">{deal.title}</div>
          {deal.opportunity_type && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {opportunityTypeLabels[deal.opportunity_type] ?? deal.opportunity_type}
            </Badge>
          )}
        </div>

        {deal.value != null && (
          <div className="text-xs font-bold gradient-text-success">
            {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(deal.value)}
          </div>
        )}

        <div className="space-y-1">
          {deal.contacts && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{deal.contacts.first_name} {deal.contacts.last_name}</span>
            </div>
          )}
          {deal.companies && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{deal.companies.name}</span>
            </div>
          )}
        </div>

        {deal.next_action && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="truncate">{deal.next_action}</span>
          </div>
        )}

        {deal.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
