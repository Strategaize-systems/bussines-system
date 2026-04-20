import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type GoalSummary = {
  type: string;
  progressPercent: number;
  currentValue: number;
  targetValue: number;
};

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

function getTextColor(percent: number): string {
  if (percent >= 90) return "text-emerald-600";
  if (percent >= 70) return "text-amber-600";
  return "text-red-600";
}

const typeLabels: Record<string, string> = {
  revenue: "Umsatz",
  deal_count: "Deals",
  win_rate: "Quote",
};

function formatCompact(value: number, type: string): string {
  if (type === "revenue") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
    return `${Math.round(value)}`;
  }
  if (type === "win_rate") return `${Math.round(value)}%`;
  return `${Math.round(value)}`;
}

type Props = {
  goals: GoalSummary[];
};

export function GoalsWidget({ goals }: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
          <Target size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Ziele</h3>
      </div>

      <div className="p-4 space-y-3">
        {goals.map((g, i) => {
          const clamped = Math.min(100, Math.max(0, g.progressPercent));
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  {typeLabels[g.type] ?? g.type}
                </span>
                <span className={cn("text-xs font-bold", getTextColor(g.progressPercent))}>
                  {g.progressPercent}%
                </span>
              </div>
              <div className={cn("h-2 w-full rounded-full", getBarTrack(g.progressPercent))}>
                <div
                  className={cn("h-2 rounded-full transition-all", getBarColor(g.progressPercent))}
                  style={{ width: `${clamped}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400">
                {formatCompact(g.currentValue, g.type)}/{formatCompact(g.targetValue, g.type)}
              </div>
            </div>
          );
        })}

        <Link
          href="/performance"
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors pt-1"
        >
          Meine Performance
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
