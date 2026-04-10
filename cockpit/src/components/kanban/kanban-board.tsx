"use client";

import { useState, useTransition, forwardRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { moveDealToStage } from "@/app/(app)/pipeline/actions";
import type { Deal, PipelineStage } from "@/app/(app)/pipeline/actions";
import { AlertTriangle, X } from "lucide-react";

interface KanbanBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
}

export const KanbanBoard = forwardRef<HTMLDivElement, KanbanBoardProps>(function KanbanBoard({ stages, deals: initialDeals, onDealClick }, ref) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  // Group deals by stage
  const dealsByStage = new Map<string, Deal[]>();
  for (const stage of stages) {
    dealsByStage.set(stage.id, []);
  }
  for (const deal of deals) {
    if (deal.stage_id) {
      const list = dealsByStage.get(deal.stage_id);
      if (list) list.push(deal);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeDeal = deals.find((d) => d.id === active.id);
    if (!activeDeal) return;

    // Determine target stage: either the over element is a stage (droppable)
    // or it's another deal card (we move to that card's stage)
    let targetStageId: string | null = null;

    // Check if over is a stage
    const isStage = stages.some((s) => s.id === over.id);
    if (isStage) {
      targetStageId = over.id as string;
    } else {
      // over is a deal card — find its stage
      const overDeal = deals.find((d) => d.id === over.id);
      if (overDeal) targetStageId = overDeal.stage_id;
    }

    if (targetStageId && targetStageId !== activeDeal.stage_id) {
      // Optimistic update: move deal to new stage locally
      setDeals((prev) =>
        prev.map((d) =>
          d.id === activeDeal.id ? { ...d, stage_id: targetStageId } : d
        )
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      // Drag cancelled — revert optimistic state
      setDeals(initialDeals);
      return;
    }

    const deal = deals.find((d) => d.id === active.id);
    if (!deal) return;

    // Find which stage the deal ended up in
    let targetStageId: string | null = null;
    const isStage = stages.some((s) => s.id === over.id);
    if (isStage) {
      targetStageId = over.id as string;
    } else {
      const overDeal = deals.find((d) => d.id === over.id);
      if (overDeal) targetStageId = overDeal.stage_id;
    }

    // Check if stage actually changed from the initial state
    const originalDeal = initialDeals.find((d) => d.id === deal.id);
    if (targetStageId && originalDeal && targetStageId !== originalDeal.stage_id) {
      const targetStage = stages.find((s) => s.id === targetStageId);
      if (targetStage) {
        setValidationError(null);
        startTransition(async () => {
          const result = await moveDealToStage(deal.id, targetStageId!, targetStage.name);
          if (result.error) {
            // Revert optimistic update on validation failure
            setDeals(initialDeals);
            setValidationError(result.error);
          }
        });
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Validation Error Banner */}
      {validationError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="flex-1 text-sm font-medium text-red-800">{validationError}</p>
          <button onClick={() => setValidationError(null)} className="shrink-0 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 pr-4 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage.get(stage.id) || []}
            onDealClick={onDealClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <KanbanCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
});
