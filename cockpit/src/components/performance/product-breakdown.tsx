import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalWithProgress } from "@/app/actions/goals";
import { cn } from "@/lib/utils";

function formatValue(value: number, type: string): string {
  if (type === "revenue") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
    return `${Math.round(value)}`;
  }
  return `${Math.round(value)}`;
}

function getBarColor(percent: number): string {
  if (percent >= 90) return "bg-emerald-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function getBarTrack(percent: number): string {
  if (percent >= 90) return "bg-emerald-100";
  if (percent >= 70) return "bg-amber-100";
  return "bg-red-100";
}

type Props = {
  goals: GoalWithProgress[];
};

export function ProductBreakdown({ goals }: Props) {
  const productGoals = goals.filter((g) => g.product_id !== null);

  if (productGoals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pro Produkt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {productGoals.map((goal) => {
          const p = goal.progress;
          const unit = goal.type === "revenue" ? "EUR" : "Deals";
          const clamped = Math.min(100, p.progressPercent);

          return (
            <div key={goal.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {goal.product_name ?? "Produkt"}
                </span>
                <span className="text-slate-500">
                  {formatValue(p.currentValue, goal.type)}/{formatValue(p.targetValue, goal.type)} {unit}
                  <span className={cn(
                    "ml-2 font-semibold",
                    p.progressPercent >= 90
                      ? "text-emerald-600"
                      : p.progressPercent >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                  )}>
                    {p.progressPercent}%
                  </span>
                </span>
              </div>
              <div className={cn("h-2 w-full rounded-full", getBarTrack(p.progressPercent))}>
                <div
                  className={cn("h-2 rounded-full transition-all duration-500", getBarColor(p.progressPercent))}
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
