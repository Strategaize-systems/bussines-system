import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import type { GoalWithProgress } from "@/app/actions/goals";
import { TrendingUp, Hash, Percent } from "lucide-react";

const typeLabels: Record<string, string> = {
  revenue: "Umsatz",
  deal_count: "Abschluesse",
  win_rate: "Win-Rate",
};

const typeIcons: Record<string, typeof TrendingUp> = {
  revenue: TrendingUp,
  deal_count: Hash,
  win_rate: Percent,
};

function formatValue(value: number, type: string): string {
  if (type === "revenue") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
    return `${Math.round(value)}`;
  }
  if (type === "win_rate") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}

function formatUnit(type: string): string {
  if (type === "revenue") return "EUR";
  if (type === "win_rate") return "";
  return "Deals";
}

export function GoalCard({ goal }: { goal: GoalWithProgress }) {
  const { progress } = goal;
  const Icon = typeIcons[goal.type] ?? TrendingUp;
  const unit = formatUnit(goal.type);
  const productLabel = goal.product_name ? goal.product_name : "Gesamt";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {typeLabels[goal.type] ?? goal.type}
                </p>
                <p className="text-xs text-slate-500">{productLabel}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-2xl font-bold text-slate-900">
                {formatValue(progress.currentValue, goal.type)}
                {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
              </p>
              <p className="text-xs text-slate-500">
                Ziel: {formatValue(progress.targetValue, goal.type)} {unit}
              </p>
            </div>
          </div>
          <ProgressRing percent={progress.progressPercent} />
        </div>
        {!progress.hasEnoughData && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1">
            Nicht genug Daten fuer belastbare Prognose
          </p>
        )}
      </CardContent>
    </Card>
  );
}
