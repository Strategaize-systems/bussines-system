"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import type { Deal } from "@/app/(app)/pipeline/actions";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
}

export function KanbanColumn({ stage, deals, onDealClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column Header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: stage.color || "#6366f1" }}
        />
        <span className="text-sm font-medium">{stage.name}</span>
        <span className="text-xs text-muted-foreground">({deals.length})</span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-transparent"
        }`}
        style={{ minHeight: 100 }}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick?.(deal)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
