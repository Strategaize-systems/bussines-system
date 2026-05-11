// SLC-663 — Deals-Listen-Seite mit Top-10 + Karten-Grid + Type-Ahead.
// Server-Component lädt initiale Daten basierend auf ?pipeline=...

import { createClient } from "@/lib/supabase/server";
import {
  getTopDeals,
  getActiveDeals,
  getClosedDeals,
} from "@/lib/deals/queries";
import { DealsClient } from "./deals-client";
import { PageHeader } from "@/components/ui/page-header";
import { Briefcase } from "lucide-react";

interface DealsListPageProps {
  searchParams: Promise<{ pipeline?: string }>;
}

export default async function DealsListPage({ searchParams }: DealsListPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: pipelinesData } = await supabase
    .from("pipelines")
    .select("id, name, sort_order")
    .order("sort_order");
  const pipelines = (pipelinesData ?? []) as Array<{
    id: string;
    name: string;
    sort_order: number;
  }>;

  if (pipelines.length === 0) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Alle Deals" subtitle="Workspace · Übersicht aller Deals" />
        <main className="px-8 py-8">
          <div className="max-w-[1800px] mx-auto bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
            <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              Keine Pipelines konfiguriert
            </p>
          </div>
        </main>
      </div>
    );
  }

  const selectedPipelineId =
    params.pipeline && pipelines.find((p) => p.id === params.pipeline)
      ? params.pipeline
      : pipelines[0].id;

  const [topDeals, activeDeals, wonDeals, lostDeals] = await Promise.all([
    getTopDeals({ pipelineId: selectedPipelineId, limit: 10 }),
    getActiveDeals(selectedPipelineId),
    getClosedDeals({
      pipelineId: selectedPipelineId,
      status: "won",
      windowDays: 90,
      offsetBatches: 0,
    }),
    getClosedDeals({
      pipelineId: selectedPipelineId,
      status: "lost",
      windowDays: 90,
      offsetBatches: 0,
    }),
  ]);

  const topIds = new Set(topDeals.map((d) => d.id));
  const gridDeals = activeDeals.filter((d) => !topIds.has(d.id));

  return (
    <DealsClient
      pipelines={pipelines}
      selectedPipelineId={selectedPipelineId}
      topDeals={topDeals}
      gridDeals={gridDeals}
      activeCount={activeDeals.length}
      wonDeals={wonDeals}
      lostDeals={lostDeals}
    />
  );
}
