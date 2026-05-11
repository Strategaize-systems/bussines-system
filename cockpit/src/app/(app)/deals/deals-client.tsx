"use client";

// SLC-663 MT-5 — Deals-Client: Pipeline-Switcher + 5 Blöcke synchron.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase, ChevronDown, Star, TrendingUp } from "lucide-react";
import { DealCard } from "./deal-card";
import { TypeAheadSearch } from "./type-ahead-search";
import { loadMoreClosedDeals } from "./actions";
import type { DealCardData } from "@/lib/deals/queries";

const LAST_PIPELINE_KEY = "cockpit:deals:last-pipeline";

interface DealsClientProps {
  pipelines: Array<{ id: string; name: string; sort_order: number }>;
  selectedPipelineId: string;
  topDeals: DealCardData[];
  gridDeals: DealCardData[];
  activeCount: number;
  wonDeals: DealCardData[];
  lostDeals: DealCardData[];
}

export function DealsClient({
  pipelines,
  selectedPipelineId,
  topDeals,
  gridDeals,
  activeCount,
  wonDeals: initialWonDeals,
  lostDeals: initialLostDeals,
}: DealsClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlPipeline = new URLSearchParams(window.location.search).get("pipeline");
    if (urlPipeline) {
      window.localStorage.setItem(LAST_PIPELINE_KEY, urlPipeline);
      return;
    }
    const last = window.localStorage.getItem(LAST_PIPELINE_KEY);
    if (last && pipelines.find((p) => p.id === last) && last !== selectedPipelineId) {
      router.replace(`/deals?pipeline=${last}`);
    }
  }, [selectedPipelineId, pipelines, router]);

  function selectPipeline(id: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_PIPELINE_KEY, id);
    }
    startTransition(() => {
      router.push(`/deals?pipeline=${id}`);
    });
  }

  function goToDeal(id: string) {
    router.push(`/deals/${id}`);
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Alle Deals" subtitle="Workspace · Übersicht aller Deals">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
          <Briefcase size={14} />
          {activeCount} Aktiv
        </span>
      </PageHeader>

      <main className="px-4 md:px-8 py-6 md:py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Block 1 — Type-Ahead */}
          <TypeAheadSearch />

          {/* Block 2 — Pipeline-Switcher */}
          <PipelineSwitcher
            pipelines={pipelines}
            selectedId={selectedPipelineId}
            onSelect={selectPipeline}
          />

          {/* Block 3 — Top-10 */}
          {topDeals.length > 0 && (
            <section data-testid="deals-top10-section">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  <Star size={12} />
                  Top 10
                </span>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Aussichtsreichste Deals
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {topDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onClick={() => goToDeal(deal.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Block 4 — Karten-Grid (restliche aktive Deals) */}
          {gridDeals.length > 0 && (
            <section data-testid="deals-grid-section">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Weitere aktive Deals
                </h3>
                <span className="text-xs text-slate-500">({gridDeals.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {gridDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} onClick={() => goToDeal(deal.id)} />
                ))}
              </div>
            </section>
          )}

          {topDeals.length === 0 && gridDeals.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
              <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">
                Keine aktiven Deals in dieser Pipeline
              </p>
            </div>
          )}

          {/* Block 5a — Gewonnen */}
          <ClosedSection
            label="Gewonnen"
            status="won"
            initialDeals={initialWonDeals}
            pipelineId={selectedPipelineId}
            accent="emerald"
            onDealClick={goToDeal}
          />

          {/* Block 5b — Verloren */}
          <ClosedSection
            label="Verloren"
            status="lost"
            initialDeals={initialLostDeals}
            pipelineId={selectedPipelineId}
            accent="red"
            onDealClick={goToDeal}
          />
        </div>
      </main>
    </div>
  );
}

function PipelineSwitcher({
  pipelines,
  selectedId,
  onSelect,
}: {
  pipelines: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div data-testid="deals-pipeline-switcher">
      {/* Desktop: Tabs */}
      <div className="hidden md:flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {pipelines.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              data-testid={`deals-pipeline-tab-${p.id}`}
              className={
                active
                  ? "px-4 py-2 rounded-md text-sm font-semibold bg-[#4454b8] text-white shadow-sm"
                  : "px-4 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-50"
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Mobile: Dropdown */}
      <div className="md:hidden relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          data-testid="deals-pipeline-select"
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8]"
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

function ClosedSection({
  label,
  status,
  initialDeals,
  pipelineId,
  accent,
  onDealClick,
}: {
  label: string;
  status: "won" | "lost";
  initialDeals: DealCardData[];
  pipelineId: string;
  accent: "emerald" | "red";
  onDealClick: (id: string) => void;
}) {
  const [deals, setDeals] = useState<DealCardData[]>(initialDeals);
  const [offset, setOffset] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setDeals(initialDeals);
    setOffset(1);
    setExhausted(false);
  }, [initialDeals, pipelineId]);

  async function loadMore() {
    setLoading(true);
    try {
      const more = await loadMoreClosedDeals(pipelineId, status, offset);
      if (more.length === 0) {
        setExhausted(true);
      } else {
        setDeals((cur) => [...cur, ...more]);
        setOffset((o) => o + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  const badgeClasses =
    accent === "emerald"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-red-100 text-red-700 border-red-200";

  return (
    <details
      data-testid={`deals-${status}-section`}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <summary className="cursor-pointer px-5 py-4 flex items-center gap-3 list-none hover:bg-slate-50">
        <ChevronDown
          size={14}
          className="text-slate-400 transition-transform group-open:rotate-180"
        />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          {label}
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClasses}`}
        >
          {deals.length}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          {deals.length === 0 ? "keine in 90 Tagen" : "letzte 90 Tage"}
        </span>
      </summary>

      <div className="border-t border-slate-100 p-5">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Keine {label.toLowerCase()}en Deals im aktuellen Fenster.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
            ))}
          </div>
        )}

        {!exhausted && deals.length > 0 && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              data-testid={`deals-${status}-load-more`}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Lade…" : "Mehr anzeigen"}
            </button>
          </div>
        )}
        {exhausted && (
          <div className="mt-4 text-center text-xs text-slate-400">
            Keine älteren Deals mehr.
          </div>
        )}
      </div>
    </details>
  );
}
