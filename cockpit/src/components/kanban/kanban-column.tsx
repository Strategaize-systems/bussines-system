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
    <div className="flex w-56 shrink-0 flex-col">
      {/* Column Header */}
      <div className="mb-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full shadow-sm"
            style={{
              backgroundColor: stage.color || "#6366f1",
              boxShadow: `0 0 6px ${stage.color || "#6366f1"}40`,
            }}
          />
          <span className="text-xs font-bold text-slate-700 truncate flex-1">{stage.name}</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
            {deals.length}
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl p-1.5 transition-all duration-200 ${
          isOver
            ? "bg-blue-50/80 ring-2 ring-blue-300/50"
            : "bg-transparent"
        }`}
        style={{ minHeight: 80 }}
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
