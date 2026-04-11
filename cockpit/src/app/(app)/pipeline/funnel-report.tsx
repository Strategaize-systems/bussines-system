"use client";

import { useMemo } from "react";
import type { Deal, PipelineStage } from "./actions";
import { TrendingDown, Users, ArrowDown } from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface FunnelReportProps {
  deals: Deal[];
  stages: PipelineStage[];
}

interface FunnelStage {
  stage: PipelineStage;
  dealCount: number;
  totalValue: number;
  conversionFromPrevious: number | null; // null for first stage
  widthPercent: number;
}

export function FunnelReport({ deals, stages }: FunnelReportProps) {
  const funnelData = useMemo(() => {
    // Only active deals contribute to the funnel
    const activeDeals = deals.filter((d) => d.status === "active");

    // Sort stages by sort_order (should already be sorted, but ensure)
    const sortedStages = [...stages]
      .filter((s) => s.probability > 0 && s.probability < 100) // exclude Won/Lost
      .sort((a, b) => a.sort_order - b.sort_order);

    if (sortedStages.length === 0) return [];

    // Count deals per stage
    const stageCounts = sortedStages.map((stage) => {
      const stageDeals = activeDeals.filter((d) => d.stage_id === stage.id);
      return {
        stage,
        dealCount: stageDeals.length,
        totalValue: stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      };
    });

    // Find max count for width scaling
    const maxCount = Math.max(...stageCounts.map((s) => s.dealCount), 1);

    // Build funnel with conversion rates
    const funnel: FunnelStage[] = stageCounts.map((sc, i) => ({
      ...sc,
      conversionFromPrevious:
        i === 0 || stageCounts[i - 1].dealCount === 0
          ? null
          : Math.round((sc.dealCount / stageCounts[i - 1].dealCount) * 100),
      widthPercent: Math.max((sc.dealCount / maxCount) * 100, 8), // min 8% for visibility
    }));

    return funnel;
  }, [deals, stages]);

  // Summary stats
  const totalActive = deals.filter((d) => d.status === "active").length;
  const wonDeals = deals.filter((d) => d.status === "won");
  const lostDeals = deals.filter((d) => d.status === "lost");
  const overallConversion =
    totalActive + wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length /
            (totalActive + wonDeals.length + lostDeals.length)) *
            100
        )
      : 0;

  if (funnelData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Keine aktiven Stages mit Deals vorhanden.
      </div>
    );
  }

  // Stage color palette (gradient from blue to green following pipeline progression)
  const stageColors = [
    "from-indigo-600 to-indigo-500",
    "from-blue-600 to-blue-500",
    "from-cyan-600 to-cyan-500",
    "from-teal-600 to-teal-500",
    "from-emerald-600 to-emerald-500",
    "from-green-600 to-green-500",
    "from-lime-600 to-lime-500",
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
                <Users size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{totalActive}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Aktive Deals
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <TrendingDown size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{wonDeals.length}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Gewonnen
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <TrendingDown size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{overallConversion}%</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Gesamt-Conversion
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-6">
            Pipeline-Trichter
          </h3>
          <div className="space-y-1">
            {funnelData.map((item, i) => {
              const colorClass =
                stageColors[i % stageColors.length];

              return (
                <div key={item.stage.id}>
                  {/* Conversion arrow between stages */}
                  {item.conversionFromPrevious !== null && (
                    <div className="flex items-center gap-2 py-1.5 pl-4">
                      <ArrowDown size={14} className="text-slate-400" />
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          item.conversionFromPrevious >= 70
                            ? "text-emerald-600"
                            : item.conversionFromPrevious >= 40
                            ? "text-amber-600"
                            : "text-red-500"
                        }`}
                      >
                        {item.conversionFromPrevious}% Conversion
                      </span>
                    </div>
                  )}

                  {/* Stage bar */}
                  <div className="flex items-center gap-4">
                    {/* Stage name — fixed width */}
                    <div className="w-[160px] shrink-0 text-right">
                      <span className="text-sm font-semibold text-slate-700 truncate block">
                        {item.stage.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.stage.probability}% Wahrsch.
                      </span>
                    </div>

                    {/* Bar container */}
                    <div className="flex-1 flex items-center gap-3">
                      <div
                        className={`h-10 rounded-lg bg-gradient-to-r ${colorClass} flex items-center justify-end pr-3 transition-all duration-500 shadow-sm`}
                        style={{ width: `${item.widthPercent}%` }}
                      >
                        <span className="text-white text-sm font-bold tabular-nums whitespace-nowrap">
                          {item.dealCount}
                        </span>
                      </div>

                      {/* Value label */}
                      <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                        {fmt.format(item.totalValue)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Won/Lost summary at bottom */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">
                Gewonnen: {wonDeals.length}
              </span>
              <span className="text-xs text-emerald-600 ml-auto tabular-nums">
                {fmt.format(wonDeals.reduce((s, d) => s + (d.value ?? 0), 0))}
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-700">
                Verloren: {lostDeals.length}
              </span>
              <span className="text-xs text-red-600 ml-auto tabular-nums">
                {fmt.format(lostDeals.reduce((s, d) => s + (d.value ?? 0), 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
