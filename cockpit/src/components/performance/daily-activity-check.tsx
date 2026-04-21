import { Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityKpiStatus } from "@/types/activity-kpis";
import Link from "next/link";

export function getBarColor(actual: number, target: number, isWarning: boolean): string {
  if (isWarning) {
    return actual > target ? "bg-red-500" : "bg-emerald-500";
  }
  const pct = target > 0 ? (actual / target) * 100 : 0;
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function getBarTrack(actual: number, target: number, isWarning: boolean): string {
  if (isWarning) {
    return actual > target ? "bg-red-100" : "bg-emerald-100";
  }
  const pct = target > 0 ? (actual / target) * 100 : 0;
  if (pct >= 90) return "bg-emerald-100";
  if (pct >= 50) return "bg-amber-100";
  return "bg-red-100";
}

export function getTextColor(actual: number, target: number, isWarning: boolean): string {
  if (isWarning) {
    return actual > target ? "text-red-600" : "text-emerald-600";
  }
  const pct = target > 0 ? (actual / target) * 100 : 0;
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

type Props = {
  kpis: ActivityKpiStatus[];
};

export function DailyActivityCheck({ kpis }: Props) {
  if (kpis.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg relative overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
        <div className="p-4 pb-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] shadow-sm">
              <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            Tages-Check
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-500">
            Keine Tages-KPIs definiert.{" "}
            <Link
              href="/performance/goals"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Tages-KPIs definieren →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg relative overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#120774] to-[#4454b8]" />
      <div className="p-4 pb-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] shadow-sm">
            <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          Tages-Check
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Daily KPIs */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Heute</p>
          <div className="space-y-3">
            {kpis.map((kpi) => {
              const isWarning = kpi.kpiKey === "deals_stagnant";
              const pct = isWarning
                ? (kpi.dailyTarget > 0 ? Math.min(100, (kpi.todayActual / kpi.dailyTarget) * 100) : kpi.todayActual > 0 ? 100 : 0)
                : (kpi.dailyTarget > 0 ? Math.min(100, (kpi.todayActual / kpi.dailyTarget) * 100) : 0);

              return (
                <div key={kpi.kpiKey} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      {isWarning && kpi.todayActual > kpi.dailyTarget && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {kpi.label}
                    </span>
                    <span className={cn("text-sm font-bold", getTextColor(kpi.todayActual, kpi.dailyTarget, isWarning))}>
                      {kpi.todayActual}/{kpi.dailyTarget}
                    </span>
                  </div>
                  <div className={cn("h-2 w-full rounded-full", getBarTrack(kpi.todayActual, kpi.dailyTarget, isWarning))}>
                    <div
                      className={cn("h-2 rounded-full transition-all duration-500", getBarColor(kpi.todayActual, kpi.dailyTarget, isWarning))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly KPIs */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Diese Woche</p>
          <div className="space-y-3">
            {kpis.map((kpi) => {
              const isWarning = kpi.kpiKey === "deals_stagnant";
              const pct = isWarning
                ? (kpi.weekTarget > 0 ? Math.min(100, (kpi.weekActual / kpi.weekTarget) * 100) : kpi.weekActual > 0 ? 100 : 0)
                : (kpi.weekTarget > 0 ? Math.min(100, (kpi.weekActual / kpi.weekTarget) * 100) : 0);

              return (
                <div key={kpi.kpiKey} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{kpi.label}</span>
                    <span className={cn("text-sm font-bold", getTextColor(kpi.weekActual, kpi.weekTarget, isWarning))}>
                      {kpi.weekActual}/{kpi.weekTarget}
                    </span>
                  </div>
                  <div className={cn("h-2 w-full rounded-full", getBarTrack(kpi.weekActual, kpi.weekTarget, isWarning))}>
                    <div
                      className={cn("h-2 rounded-full transition-all duration-500", getBarColor(kpi.weekActual, kpi.weekTarget, isWarning))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
