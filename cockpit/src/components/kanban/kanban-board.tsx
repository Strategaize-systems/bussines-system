"use client";

import { useState, useTransition } from "react";
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

interface KanbanBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
}

export function KanbanBoard({ stages, deals: initialDeals, onDealClick }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
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
        startTransition(async () => {
          await moveDealToStage(deal.id, targetStageId!, targetStage.name);
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
      <div className="flex gap-4 overflow-x-auto pb-4">
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
}
