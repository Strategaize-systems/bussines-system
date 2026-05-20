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
import {
  moveDealToStage,
  suggestLossReason,
  type RequirementValues,
} from "@/app/(app)/pipeline/actions";
import type { Deal, PipelineStage } from "@/app/(app)/pipeline/actions";
import { AlertTriangle, X } from "lucide-react";

// V8 SLC-813 — Pre-Move-Check + StageRequirementsModal-Wiring.
import {
  getMissingStageRequirements,
  type StageRequirementField,
  type StageRequirementSpec,
} from "@/lib/pipeline/stage-required-fields";
import {
  StageRequirementsModal,
  type KiLossSuggest,
  type StageRequirementsContact,
} from "@/components/pipeline/stage-requirements-modal";

interface KanbanBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  // V7.1 SLC-712a — Read-Only-Mode fuer Teamlead-Drilldown (kein DnD, keine Mutate-Buttons)
  readOnly?: boolean;
  // V8 SLC-813 — Kontakte fuer den Stage-Requirements-Modal Contact-Selector.
  contacts?: readonly StageRequirementsContact[];
}

interface ModalState {
  dealId: string;
  dealTitle: string;
  oldStageName: string;
  newStageId: string;
  newStageName: string;
  requirements: StageRequirementSpec;
  currentValues: Partial<Record<StageRequirementField, string | number | null>>;
  kiSuggest: KiLossSuggest | null;
  kiSuggestStatus: "loading" | "ready" | "unavailable";
}

export const KanbanBoard = forwardRef<HTMLDivElement, KanbanBoardProps>(function KanbanBoard({ stages, deals: initialDeals, onDealClick, readOnly = false, contacts = [] }, ref) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // V8 SLC-813 — StageRequirementsModal-State.
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
    if (!targetStageId || !originalDeal || targetStageId === originalDeal.stage_id) {
      return;
    }

    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    // V8 SLC-813 Pre-Move-Check: hat die Ziel-Stage Pflichtfeld-Anforderungen
    // UND fehlt eines davon im Deal? -> Modal oeffnen, NICHT direkt
    // moveDealToStage rufen (verhindert Toast-Error-Pfad).
    const { spec, missing } = getMissingStageRequirements(targetStage.name, {
      value: originalDeal.value,
      contact_id: originalDeal.contact_id,
      won_lost_reason: originalDeal.won_lost_reason,
    });

    if (spec && missing.length > 0) {
      void openRequirementsModal(originalDeal, targetStage, spec);
      return;
    }

    // Happy-Path: alle Pflichtfelder erfuellt, direkt verschieben.
    setValidationError(null);
    startTransition(async () => {
      const result = await moveDealToStage(
        deal.id,
        targetStageId!,
        targetStage.name
      );
      if (result.error) {
        setDeals(initialDeals);
        setValidationError(result.error);
      }
    });
  }

  async function openRequirementsModal(
    originalDeal: Deal,
    targetStage: PipelineStage,
    spec: StageRequirementSpec
  ) {
    const oldStageName =
      stages.find((s) => s.id === originalDeal.stage_id)?.name ?? "Unbekannt";

    // Modal sofort mit Pflichtfeldern oeffnen — UI ist responsiv, KI-Call laeuft
    // async im Hintergrund.
    const isLossStage = spec.fields.includes("won_lost_reason");
    const initialState: ModalState = {
      dealId: originalDeal.id,
      dealTitle: originalDeal.title,
      oldStageName,
      newStageId: targetStage.id,
      newStageName: targetStage.name,
      requirements: spec,
      currentValues: {
        value: originalDeal.value,
        contact_id: originalDeal.contact_id,
        won_lost_reason: originalDeal.won_lost_reason,
      },
      kiSuggest: null,
      kiSuggestStatus: isLossStage ? "loading" : "ready",
    };
    setModal(initialState);
    setModalError(null);

    // Optimistic-Drop wird zurueckgenommen — der Move passiert erst beim
    // Modal-Confirm, nicht beim Drop selbst.
    setDeals(initialDeals);

    if (!isLossStage) return;

    // KI-Suggest fuer Verlustgrund laden.
    try {
      const suggest = await suggestLossReason(originalDeal.id);
      setModal((prev) =>
        prev && prev.dealId === originalDeal.id
          ? {
              ...prev,
              kiSuggest: suggest,
              kiSuggestStatus: suggest ? "ready" : "unavailable",
            }
          : prev
      );
    } catch {
      setModal((prev) =>
        prev && prev.dealId === originalDeal.id
          ? { ...prev, kiSuggest: null, kiSuggestStatus: "unavailable" }
          : prev
      );
    }
  }

  async function handleModalConfirm(
    values: Partial<Record<StageRequirementField, string | number>>
  ) {
    if (!modal) return;
    setModalSubmitting(true);
    setModalError(null);
    try {
      const result = await moveDealToStage(
        modal.dealId,
        modal.newStageId,
        modal.newStageName,
        values as RequirementValues
      );
      if (result.error) {
        setModalError(result.error);
        setModalSubmitting(false);
        return;
      }
      // Success: Modal schliessen, optimistic state aktualisieren.
      setDeals((prev) =>
        prev.map((d) =>
          d.id === modal.dealId
            ? {
                ...d,
                stage_id: modal.newStageId,
                ...(values as Partial<Deal>),
              }
            : d
        )
      );
      setModal(null);
    } finally {
      setModalSubmitting(false);
    }
  }

  function handleModalCancel() {
    setModal(null);
    setModalError(null);
    setDeals(initialDeals);
  }

  // V7.1 SLC-712a — Read-Only-Mode rendert ohne DndContext (kein Drag-Drop, keine Server-Action-Trigger).
  if (readOnly) {
    return (
      <div ref={ref} className="flex gap-4 overflow-x-auto overflow-y-auto h-full p-4" style={{ scrollbarWidth: "thin" }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage.get(stage.id) || []}
            onDealClick={onDealClick}
            readOnly
          />
        ))}
      </div>
    );
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
      <div ref={ref} className="flex gap-4 overflow-x-auto overflow-y-auto h-full p-4" style={{ scrollbarWidth: "thin" }}>
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

      {modal && (
        <StageRequirementsModal
          open={modal !== null}
          dealTitle={modal.dealTitle}
          oldStageName={modal.oldStageName}
          newStageName={modal.newStageName}
          requirements={modal.requirements}
          currentValues={modal.currentValues}
          contacts={contacts}
          kiSuggest={modal.kiSuggest}
          kiSuggestStatus={modal.kiSuggestStatus}
          isSubmitting={modalSubmitting}
          errorMessage={modalError}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </DndContext>
  );
});
