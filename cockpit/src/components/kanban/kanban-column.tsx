"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import type { Deal } from "@/app/(app)/pipeline/actions";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
}

export function KanbanColumn({ stage, deals, onDealClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = useMemo(
    () => deals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    [deals]
  );

  return (
    <div className="flex w-56 shrink-0 flex-col">
      {/* Column Header */}
      <div
        className="mb-3 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm"
      >
        {/* Color accent bar */}
        <div
          className="h-1"
          style={{ backgroundColor: stage.color || "#6366f1" }}
        />
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 truncate flex-1">{stage.name}</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
              {deals.length}
            </span>
          </div>
          {totalValue > 0 && (
            <div className="mt-1 text-[11px] font-semibold text-slate-400 tabular-nums">
              {fmt.format(totalValue)}
            </div>
          )}
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
              stageColor={stage.color || "#6366f1"}
              onClick={() => onDealClick?.(deal)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
