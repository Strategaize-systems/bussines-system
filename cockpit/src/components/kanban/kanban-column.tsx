"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import type { Deal } from "@/app/(app)/pipeline/actions";
import type { PipelineStage } from "@/app/(app)/pipeline/actions";

const fmtCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
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
    <div className="flex w-64 shrink-0 flex-col">
      {/* Column Header — sticky at top of scroll container */}
      <div className="mb-3 rounded-xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm sticky top-0 z-10">
        {/* Color accent bar */}
        <div
          className="h-1.5"
          style={{ backgroundColor: stage.color || "#6366f1" }}
        />
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            {/* Stage Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
              style={{ backgroundColor: stage.color || "#6366f1" }}
            >
              {stage.name.charAt(0)}
            </div>
            {/* Stage Name */}
            <span className="text-sm font-bold text-slate-800 truncate flex-1">
              {stage.name}
            </span>
          </div>
          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            {/* Deal count with dot */}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stage.color || "#6366f1" }}
              />
              {deals.length} Deal{deals.length !== 1 ? "s" : ""}
            </span>
            {/* Total value */}
            {totalValue > 0 && (
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                {fmtCompact.format(totalValue)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 rounded-xl p-1.5 transition-all duration-200 ${
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
              stageProbability={stage.probability}
              onClick={() => onDealClick?.(deal)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
