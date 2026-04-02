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
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <div
          className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm"
          style={{ backgroundColor: stage.color || "#6366f1" }}
        />
        <span className="text-sm font-semibold">{stage.name}</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {deals.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 rounded-xl p-2 transition-all duration-200 ${
          isOver
            ? "bg-blue-50 ring-2 ring-blue-300"
            : "bg-slate-50/50"
        }`}
        style={{ minHeight: 120 }}
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
