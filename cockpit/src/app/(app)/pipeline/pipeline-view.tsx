"use client";

import { useState, useTransition } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealSheet } from "./deal-sheet";
import { DealForm } from "./deal-form";
import { updateDeal, deleteDeal } from "./actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Deal, Pipeline, PipelineStage } from "./actions";

interface PipelineViewProps {
  pipeline: Pipeline;
  stages: PipelineStage[];
  deals: Deal[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
}

export function PipelineView({
  pipeline,
  stages,
  deals,
  contacts,
  companies,
}: PipelineViewProps) {
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editError, setEditError] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  const handleEditSubmit = (formData: FormData) => {
    if (!editDeal) return;
    setEditError("");
    startTransition(async () => {
      const result = await updateDeal(editDeal.id, formData);
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditDeal(null);
      }
    });
  };

  const handleDelete = () => {
    if (!editDeal) return;
    startTransition(async () => {
      const result = await deleteDeal(editDeal.id);
      if (!result.error) setEditDeal(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {pipeline.name}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {deals.length} Deals · {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(totalValue)} Gesamtwert
          </p>
        </div>
        <DealSheet
          stages={stages}
          pipelineId={pipeline.id}
          contacts={contacts}
          companies={companies}
        />
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        stages={stages}
        deals={deals}
        onDealClick={setEditDeal}
      />

      {/* Edit Deal Sheet (controlled) */}
      <Sheet open={!!editDeal} onOpenChange={(open) => { if (!open) { setEditDeal(null); setEditError(""); } }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Deal bearbeiten</SheetTitle>
          </SheetHeader>
          <div className="px-8 pb-8">
            {editDeal && (
              <>
                {editError && (
                  <p className="mb-3 text-sm text-destructive">{editError}</p>
                )}
                <DealForm
                  deal={editDeal}
                  stages={stages}
                  pipelineId={pipeline.id}
                  contacts={contacts}
                  companies={companies}
                  onSubmit={handleEditSubmit}
                  isPending={isPending}
                />
                <div className="mt-4 border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deal löschen
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
