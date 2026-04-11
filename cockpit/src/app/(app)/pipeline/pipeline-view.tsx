"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealSheet } from "./deal-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import type { Deal, Pipeline, PipelineStage } from "./actions";
import { Filter, TrendingUp, ClipboardList, Target, Percent, Plus, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { PipelineSearchBar } from "@/components/pipeline/pipeline-search-bar";
import type { PipelineSearchFilter } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

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
}

const SLUG_MAP: Record<string, string> = {
  "Multiplikatoren": "multiplikatoren",
  "Unternehmer-Chancen": "unternehmer",
  "Lead-Management": "leads",
};

export function PipelineView({
  pipeline,
  pipelines,
  stages,
  deals,
  contacts,
  companies,
  referrals,
  currentSlug,
}: PipelineViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [aiFilter, setAiFilter] = useState<PipelineSearchFilter | null>(null);

  const stageNames = useMemo(() => stages.map((s) => s.name), [stages]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const targetStatus = aiFilter?.status || "active";
      if (d.status !== targetStatus) return false;
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
      if (aiFilter) {
        if (aiFilter.stage) {
          const matchStage = stages.find(
            (s) => s.name.toLowerCase() === aiFilter.stage!.toLowerCase()
          );
          if (matchStage && d.stage_id !== matchStage.id) return false;
        }
        if (aiFilter.minValue != null && (d.value ?? 0) < aiFilter.minValue) return false;
        if (aiFilter.maxValue != null && (d.value ?? 0) > aiFilter.maxValue) return false;
        if (aiFilter.contactName) {
          const name = d.contacts
            ? `${(d.contacts as any).first_name} ${(d.contacts as any).last_name}`.toLowerCase()
            : "";
          if (!name.includes(aiFilter.contactName.toLowerCase())) return false;
        }
        if (aiFilter.companyName) {
          const company = ((d.companies as any)?.name ?? "").toLowerCase();
          if (!company.includes(aiFilter.companyName.toLowerCase())) return false;
        }
        if (aiFilter.titleSearch) {
          if (!d.title?.toLowerCase().includes(aiFilter.titleSearch.toLowerCase())) return false;
        }
        if (aiFilter.hasNextAction === true && !d.next_action) return false;
        if (aiFilter.hasNextAction === false && d.next_action) return false;
        if (aiFilter.isStagnant === true) {
          const daysSince = d.updated_at
            ? Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)
            : 999;
          if (daysSince < 7) return false;
        }
      }
      return true;
    });
  }, [deals, searchQuery, stageFilter, aiFilter, stages]);

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
    <div className="min-h-screen flex flex-col">
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

      <main className="px-8 py-6 flex-1 flex flex-col">
        <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col space-y-5">

          {/* Pipeline Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {pipelines.map((p) => {
              const slug = SLUG_MAP[p.name] ?? p.name.toLowerCase();
              const isActive = slug === currentSlug;
              return (
                <Link
                  key={p.id}
                  href={`/pipeline/${slug}`}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  {p.name}
                </Link>
              );
            })}
          </div>

          {/* KPI Cards — constrained width */}
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

          {/* Search + Filter */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <PipelineSearchBar
                  pipelineName={pipeline.name}
                  stageNames={stageNames}
                  onFilter={(filter) => setAiFilter(filter)}
                  onReset={() => { setAiFilter(null); setSearchQuery(""); }}
                  onTextSearch={setSearchQuery}
                  textQuery={searchQuery}
                />
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] cursor-pointer shrink-0"
              >
                <option value="all">Alle Stages</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage Info Bar with scroll controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <LayoutList size={16} className="text-slate-400" />
              <span className="font-bold">{stages.length} Stages</span>
              <span className="text-xs text-slate-400">← Scrollen Sie horizontal →</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollKanban("left")}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollKanban("right")}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Kanban Board — contained, scrollable area */}
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
            <KanbanBoard
              ref={kanbanRef}
              stages={stages}
              deals={filteredDeals}
              onDealClick={(deal) => router.push(`/deals/${deal.id}`)}
            />
          </div>
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
