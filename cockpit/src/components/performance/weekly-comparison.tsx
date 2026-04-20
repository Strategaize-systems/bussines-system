import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, TrendingUp } from "lucide-react";

type Props = {
  thisWeek: number;
  lastWeek: number;
  changePercent: number | null;
};

export function WeeklyComparison({ thisWeek, lastWeek, changePercent }: Props) {
  if (thisWeek === 0 && lastWeek === 0) return null;

  const isUp = changePercent !== null && changePercent > 0;
  const isDown = changePercent !== null && changePercent < 0;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const color = isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-slate-500";
  const bg = isUp ? "bg-emerald-50 border-emerald-200" : isDown ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-2">
        <TrendingUp className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-medium text-slate-700">
          Diese Woche: {thisWeek} Aktivitaeten
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-sm font-bold ${color}`}>
          {changePercent !== null ? `${changePercent >= 0 ? "+" : ""}${changePercent}%` : "—"}
        </span>
        <span className="text-xs text-slate-400">vs. letzte Woche ({lastWeek})</span>
      </div>
    </div>
  );
}
