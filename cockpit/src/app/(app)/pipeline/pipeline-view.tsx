"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealSheet } from "./deal-sheet";
import { DealDetailSheet } from "./deal-detail-sheet";
import type { Deal, Pipeline, PipelineStage } from "./actions";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

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
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {pipeline.name}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {deals.length} Deals · {fmt.format(totalValue)} Gesamtwert
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
        onDealClick={setSelectedDeal}
      />

      {/* Deal Detail Modal */}
      <DealDetailSheet
        deal={selectedDeal}
        stages={stages}
        pipelineId={pipeline.id}
        contacts={contacts}
        companies={companies}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </div>
  );
}
