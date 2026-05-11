"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PipelineTable } from "./pipeline-table";
import { FunnelReport } from "./funnel-report";
import { WinLossReport } from "./win-loss-report";
import { DealSheet } from "./deal-sheet";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import type { Deal, Pipeline, PipelineStage } from "./actions";
import { TrendingUp, ClipboardList, Target, Percent, Plus, ChevronLeft, ChevronRight, LayoutList, Kanban, List, BarChart3, PieChart } from "lucide-react";
import { TypeAheadSearch } from "@/app/(app)/deals/type-ahead-search";
import { ViewToggle, type ViewToggleMode } from "@/components/ui/view-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type PipelineViewMode = "kanban" | "list" | "funnel" | "winloss";

const PIPELINE_VIEW_MODES: ReadonlyArray<ViewToggleMode<PipelineViewMode>> = [
  { value: "kanban", icon: Kanban, label: "Kanban-Ansicht" },
  { value: "list", icon: List, label: "Listen-Ansicht" },
  { value: "funnel", icon: BarChart3, label: "Funnel-Report" },
  { value: "winloss", icon: PieChart, label: "Win/Loss-Analyse" },
];

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface PipelineViewProps {
  pipeline: Pipeline;
  pipelines: Pipeline[];
  stages: PipelineStage[];
  deals: Deal[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  referrals?: { id: string; label: string }[];
  currentSlug: string;
  // V6.2 SLC-625 — optionaler Campaign-Filter (DEC-139)
  campaigns?: Array<{ id: string; name: string }>;
  selectedCampaignId?: string | null;
}

// Known slugs for built-in pipelines (static routes)
const KNOWN_SLUGS: Record<string, string> = {
  "Multiplikatoren": "multiplikatoren",
  "Unternehmer-Chancen": "unternehmer",
  "Lead-Management": "leads",
};

// For custom pipelines, use their ID as slug (handled by [slug] dynamic route)
function getPipelineSlug(p: Pipeline): string {
  return KNOWN_SLUGS[p.name] ?? p.id;
}

export function PipelineView({
  pipeline,
  pipelines,
  stages,
  deals,
  contacts,
  companies,
  referrals,
  currentSlug,
  campaigns = [],
  selectedCampaignId = null,
}: PipelineViewProps) {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState("all");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [viewMode, setViewMode] = useState<PipelineViewMode>("kanban");

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (d.status !== "active") return false;
      if (stageFilter !== "all" && d.stage_id !== stageFilter) return false;
      return true;
    });
  }, [deals, stageFilter]);

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
    const scrollAmount = 320;
    el.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
  }, []);

  return (
    <div style={{ width: 'calc(100vw - 16rem)', height: '100vh' }} className="flex flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader title="Pipeline" subtitle="Sales Pipeline · Deals & Opportunities Management" />
      </div>

      {/* Fixed upper section — Tabs + KPIs + Search */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-4 space-y-4 z-10">
        <div className="max-w-[1200px] space-y-4">
          {/* Pipeline Tabs + Neuer Deal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pipelines.map((p) => {
                const slug = getPipelineSlug(p);
                const isActive = slug === currentSlug;
                return (
                  <Link
                    key={p.id}
                    href={`/pipeline/${slug}`}
                    className={cn(
                      "px-5 py-2 rounded-xl text-sm font-bold transition-all border-2",
                      isActive
                        ? "bg-gradient-to-r from-brand-primary-dark to-brand-primary text-white border-transparent shadow-lg shadow-brand-primary/20"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/30 hover:text-slate-800 hover:shadow-sm"
                    )}
                  >
                    {p.name}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <ViewToggle modes={PIPELINE_VIEW_MODES} active={viewMode} onSelect={setViewMode} />

              <button
                onClick={() => setShowNewDeal(true)}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-brand-primary-dark to-brand-primary text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={16} strokeWidth={2.5} />
                Neuer Deal
              </button>
            </div>
          </div>

          {/* KPI Cards — compact inline layout */}
          <KPIGrid columns={4}>
            <KPICard label="Aktive Deals" value={activeDeals.length} icon={ClipboardList} gradient="blue" compact />
            <KPICard label="Pipeline Wert" value={fmt.format(totalValue)} icon={TrendingUp} gradient="green" compact />
            <KPICard label="Gewichtet" value={fmt.format(forecast)} icon={Target} gradient="yellow" compact />
            <KPICard label="Ø Chance" value={`${avgChance}%`} icon={Percent} gradient="emerald" compact />
          </KPIGrid>

          {/* Search + Filter */}
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <TypeAheadSearch />
              </div>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-primary cursor-pointer shrink-0"
              >
                <option value="all">Alle Stages</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {/* V6.2 SLC-625 — Campaign-Filter (DEC-139) */}
              {campaigns.length > 0 && (
                <select
                  value={selectedCampaignId ?? "all"}
                  onChange={(e) => {
                    const v = e.target.value;
                    const params = new URLSearchParams(window.location.search);
                    if (v === "all") params.delete("campaign");
                    else params.set("campaign", v);
                    const qs = params.toString();
                    router.push(`${window.location.pathname}${qs ? `?${qs}` : ""}`);
                  }}
                  className="px-3 py-2 rounded-lg border-2 border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-primary cursor-pointer shrink-0 max-w-[200px]"
                  title="Auf Kampagne filtern"
                >
                  <option value="all">Alle Kampagnen</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content area — fills remaining height */}
      <div className="flex-1 min-h-0 flex flex-col px-8 py-3 bg-slate-50 overflow-hidden">
        {viewMode === "kanban" ? (
          <>
            {/* Stage Info Bar with scroll controls */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <LayoutList size={16} className="text-slate-400" />
                <span className="font-bold">{stages.length} Stages</span>
                <span className="text-xs text-slate-400">← Scrollen Sie horizontal →</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollKanban("left")}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => scrollKanban("right")}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Kanban Board container */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
              <KanbanBoard
                ref={kanbanRef}
                stages={stages}
                deals={filteredDeals}
                onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
              />
            </div>
          </>
        ) : viewMode === "list" ? (
          <>
            {/* List Info Bar */}
            <div className="flex items-center gap-3 text-sm text-slate-600 mb-3 shrink-0">
              <List size={16} className="text-slate-400" />
              <span className="font-bold">{filteredDeals.length} Deals</span>
              <span className="text-xs text-slate-400">Sortierbar per Klick auf Spaltenköpfe</span>
            </div>

            {/* Table container */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
              <PipelineTable
                deals={filteredDeals}
                stages={stages}
                onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
              />
            </div>
          </>
        ) : viewMode === "funnel" ? (
          /* Funnel Report */
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
            <FunnelReport deals={deals} stages={stages} />
          </div>
        ) : (
          /* Win/Loss Report */
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
            <WinLossReport deals={deals} />
          </div>
        )}
      </div>

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
