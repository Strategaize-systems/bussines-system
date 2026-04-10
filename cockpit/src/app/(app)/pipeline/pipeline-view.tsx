"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealSheet } from "./deal-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import type { Deal, Pipeline, PipelineStage } from "./actions";
import { Search, Filter, TrendingUp, ClipboardList, Target, Percent, Plus, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 0,
});

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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showNewDeal, setShowNewDeal] = useState(false);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (d.status !== "active") return false;
      if (stageFilter !== "all" && d.stage_id !== stageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title?.toLowerCase().includes(q);
        const matchCompany = (d.companies as any)?.name?.toLowerCase().includes(q);
        const matchContact = d.contacts
          ? `${(d.contacts as any).first_name} ${(d.contacts as any).last_name}`.toLowerCase().includes(q)
          : false;
        if (!matchTitle && !matchCompany && !matchContact) return false;
      }
      return true;
    });
  }, [deals, searchQuery, stageFilter]);

  const activeDeals = deals.filter((d) => d.status === "active");
  const totalValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  const forecast = useMemo(() => {
    return activeDeals
      .filter((d) => d.value && d.stage_id)
      .reduce((sum, d) => {
        const stage = stages.find((s) => s.id === d.stage_id);
        const prob = stage ? stage.probability / 100 : 0;
        return sum + (d.value ?? 0) * prob;
      }, 0);
  }, [activeDeals, stages]);

  const avgChance = useMemo(() => {
    const withProb = activeDeals.filter((d) => d.stage_id);
    if (withProb.length === 0) return 0;
    const total = withProb.reduce((sum, d) => {
      const stage = stages.find((s) => s.id === d.stage_id);
      return sum + (stage?.probability ?? 0);
    }, 0);
    return Math.round(total / withProb.length);
  }, [activeDeals, stages]);

  const kanbanRef = useRef<HTMLDivElement>(null);

  const scrollKanban = useCallback((direction: "left" | "right") => {
    const el = kanbanRef.current;
    if (!el) return;
    const scrollAmount = 320; // roughly one column width
    el.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Pipeline"
        subtitle={`Sales Pipeline · Deals & Opportunities Management`}
      >
        <button
          onClick={() => setShowNewDeal(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Neuer Deal
        </button>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards — scrollable on smaller screens */}
          <div className="overflow-x-auto">
            <KPIGrid columns={4}>
              <KPICard
                label="Aktive Deals"
                value={activeDeals.length}
                icon={ClipboardList}
                gradient="blue"
              />
              <KPICard
                label="Pipeline Wert"
                value={fmt.format(totalValue)}
                icon={TrendingUp}
                gradient="green"
              />
              <KPICard
                label="Gewichtet"
                value={fmt.format(forecast)}
                icon={Target}
                gradient="yellow"
              />
              <KPICard
                label="Ø Chance"
                value={`${avgChance}%`}
                icon={Percent}
                gradient="emerald"
              />
            </KPIGrid>
          </div>

          {/* Search + Filter */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
                  <input
                    type="text"
                    placeholder="Deal, Firma oder Ansprechpartner suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
                  />
                </div>
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] cursor-pointer"
              >
                <option value="all">Alle Stages</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Filter icon */}
              <button className="p-2.5 rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <Filter size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Stage Info Bar with functional scroll buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <LayoutList size={16} className="text-slate-400" />
              <span className="font-bold">{stages.length} Stages</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollKanban("left")}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-400">Scrollen</span>
              <button
                onClick={() => scrollKanban("right")}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          <KanbanBoard
            ref={kanbanRef}
            stages={stages}
            deals={filteredDeals}
            onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
          />
        </div>
      </main>

      {/* New Deal Sheet */}
      {showNewDeal && (
        <DealSheet
          stages={stages}
          pipelineId={pipeline.id}
          contacts={contacts}
          companies={companies}
          referrals={referrals}
          defaultOpen
          onOpenChange={(open) => { if (!open) setShowNewDeal(false); }}
        />
      )}
    </div>
  );
}
