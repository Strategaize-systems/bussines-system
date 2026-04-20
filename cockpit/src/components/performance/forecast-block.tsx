import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalWithProgress } from "@/app/actions/goals";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

function formatEur(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M EUR`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k EUR`;
  return `${Math.round(value)} EUR`;
}

type Props = {
  goals: GoalWithProgress[];
};

export function ForecastBlock({ goals }: Props) {
  // Show forecast for the primary revenue goal (first one found)
  const revenueGoal = goals.find((g) => g.type === "revenue" && !g.product_id);
  const dealGoal = goals.find((g) => g.type === "deal_count" && !g.product_id);

  if (!revenueGoal && !dealGoal) return null;

  const primary = revenueGoal ?? dealGoal!;
  const p = primary.progress;
  const isRevenue = primary.type === "revenue";

  if (!p.hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prognose</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Nicht genug Daten fuer eine belastbare Prognose. Mindestens ein paar abgeschlossene Deals oder aktive Pipeline-Deals werden benoetigt.
          </p>
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon = p.delta > 0 ? ArrowDown : p.delta < 0 ? ArrowUp : Minus;
  const deltaColor = p.delta <= 0 ? "text-emerald-600" : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prognose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Pipeline-gewichtet</p>
            <p className="text-lg font-semibold text-slate-900">
              {isRevenue ? formatEur(p.pipelineForecast) : `${Math.round(p.pipelineForecast)} Deals`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Historisch</p>
            <p className="text-lg font-semibold text-slate-900">
              {isRevenue ? formatEur(p.historicForecast) : `${Math.round(p.historicForecast)} Deals`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Kombiniert</p>
            <p className="text-lg font-semibold text-slate-900">
              {isRevenue ? formatEur(p.combinedForecast) : `${Math.round(p.combinedForecast)} Deals`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3">
          <DeltaIcon className={`h-4 w-4 ${deltaColor}`} />
          <span className={`text-sm font-medium ${deltaColor}`}>
            {p.delta > 0
              ? `Dir fehlen noch ${isRevenue ? formatEur(p.delta) : `${Math.ceil(p.delta)} Deals`}`
              : p.delta < 0
                ? `Du liegst ${isRevenue ? formatEur(Math.abs(p.delta)) : `${Math.abs(Math.round(p.delta))} Deals`} ueber dem Ziel`
                : "Genau im Plan"}
          </span>
          {p.dealsNeeded !== null && p.dealsNeeded > 0 && (
            <span className="text-xs text-slate-500 ml-auto">
              (noch {p.dealsNeeded} Deals noetig)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
