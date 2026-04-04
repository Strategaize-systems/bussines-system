"use client";

import { useState, useMemo } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealSheet } from "./deal-sheet";
import { DealDetailSheet } from "./deal-detail-sheet";
import type { Deal, Pipeline, PipelineStage } from "./actions";
import { Filter, TrendingUp } from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const statusOptions = [
  { value: "all", label: "Alle Status" },
  { value: "active", label: "Aktiv" },
  { value: "won", label: "Gewonnen" },
  { value: "lost", label: "Verloren" },
];

const opportunityTypeOptions = [
  { value: "all", label: "Alle Typen" },
  { value: "empfehlung", label: "Empfehlung" },
  { value: "direktansprache", label: "Direktansprache" },
  { value: "inbound", label: "Inbound" },
  { value: "netzwerk", label: "Netzwerk" },
  { value: "event", label: "Event" },
  { value: "bestandskunde", label: "Bestandskunde" },
];

interface PipelineViewProps {
  pipeline: Pipeline;
  stages: PipelineStage[];
  deals: Deal[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  referrals?: { id: string; label: string }[];
}

export function PipelineView({
  pipeline,
  stages,
  deals,
  contacts,
  companies,
  referrals,
}: PipelineViewProps) {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.opportunity_type !== typeFilter) return false;
      return true;
    });
  }, [deals, statusFilter, typeFilter]);

  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  // Weighted forecast: stage probability × deal value
  const forecast = useMemo(() => {
    return filteredDeals
      .filter((d) => d.status === "active" && d.value && d.stage_id)
      .reduce((sum, d) => {
        const stage = stages.find((s) => s.id === d.stage_id);
        const prob = stage ? stage.probability / 100 : 0;
        return sum + (d.value ?? 0) * prob;
      }, 0);
  }, [filteredDeals, stages]);

  const hasFilters = statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {pipeline.name}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {filteredDeals.length} Deals · {fmt.format(totalValue)} Gesamtwert
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Forecast */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <TrendingUp className="h-4 w-4 text-[#00a84f]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Forecast</p>
              <p className="text-sm font-bold text-[#00a84f]">{fmt.format(forecast)}</p>
            </div>
          </div>
          <DealSheet
            stages={stages}
            pipelineId={pipeline.id}
            contacts={contacts}
            companies={companies}
            referrals={referrals}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          Filter:
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-premium text-xs"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="select-premium text-xs"
        >
          {opportunityTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}
            className="text-xs font-medium text-[#4454b8] hover:underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        stages={stages}
        deals={filteredDeals}
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
