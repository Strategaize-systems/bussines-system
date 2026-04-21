import type { GoalWithProgress } from "@/app/actions/goals";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";

function formatValue(value: number, isRevenue: boolean): string {
  if (!isRevenue) return `${Math.round(value)}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

type Props = {
  goals: GoalWithProgress[];
};

export function ForecastBlock({ goals }: Props) {
  const revenueGoal = goals.find((g) => g.type === "revenue" && !g.product_id);
  const dealGoal = goals.find((g) => g.type === "deal_count" && !g.product_id);

  if (!revenueGoal && !dealGoal) return null;

  const primary = revenueGoal ?? dealGoal!;
  const p = primary.progress;
  const isRevenue = primary.type === "revenue";
  const unit = isRevenue ? "EUR" : "Deals";

  if (!p.hasEnoughData) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Prognose</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Nicht genug Daten
        </p>
      </div>
    );
  }

  const DeltaIcon = p.delta > 0 ? ArrowDown : p.delta < 0 ? ArrowUp : Minus;
  const deltaColor = p.delta <= 0 ? "text-emerald-600" : "text-red-600";
  const deltaBg = p.delta <= 0 ? "bg-emerald-50" : "bg-red-50";

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
          <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Prognose</p>
          <p className="text-xs text-slate-500">Kombiniert</p>
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-900">
        {formatValue(p.combinedForecast, isRevenue)}
        <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
      </p>

      <div className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${deltaBg}`}>
        <DeltaIcon className={`h-3 w-3 ${deltaColor}`} />
        <span className={`text-xs font-semibold ${deltaColor}`}>
          {p.delta > 0
            ? `−${formatValue(p.delta, isRevenue)}`
            : p.delta < 0
              ? `+${formatValue(Math.abs(p.delta), isRevenue)}`
              : "Im Plan"}
        </span>
      </div>

      {p.dealsNeeded !== null && p.dealsNeeded > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Noch {p.dealsNeeded} Deals noetig
        </p>
      )}
    </div>
  );
}
