"use client";

import { useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityKpiStatus, WeekDayKpiStatus } from "@/types/activity-kpis";
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

function getCellBg(actual: number, target: number, isWarning: boolean): string {
  if (target === 0 && !isWarning) return "bg-slate-50";
  if (isWarning) {
    return actual > target ? "bg-red-50" : "bg-emerald-50";
  }
  const pct = target > 0 ? (actual / target) * 100 : 0;
  if (pct >= 90) return "bg-emerald-50";
  if (pct >= 50) return "bg-amber-50";
  return "bg-red-50";
}

function getCellText(actual: number, target: number, isWarning: boolean): string {
  if (target === 0 && !isWarning) return "text-slate-500";
  if (isWarning) {
    return actual > target ? "text-red-700" : "text-emerald-700";
  }
  const pct = target > 0 ? (actual / target) * 100 : 0;
  if (pct >= 90) return "text-emerald-700";
  if (pct >= 50) return "text-amber-700";
  return "text-red-700";
}

type Props = {
  kpis: ActivityKpiStatus[];
  weeklyPerDay?: WeekDayKpiStatus[];
};

export function DailyActivityCheck({ kpis, weeklyPerDay }: Props) {
  const [view, setView] = useState<"today" | "week">("today");

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
      <div className="p-4 pb-0 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] shadow-sm">
            <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          Tages-Check
        </h3>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setView("today")}
            className={cn(
              "px-3 py-1 text-xs font-semibold transition-colors",
              view === "today"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Heute
          </button>
          <button
            onClick={() => setView("week")}
            className={cn(
              "px-3 py-1 text-xs font-semibold transition-colors",
              view === "week"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Woche
          </button>
        </div>
      </div>

      <div className="p-4">
        {view === "today" ? (
          <TodayView kpis={kpis} />
        ) : (
          <WeekView kpis={kpis} weeklyPerDay={weeklyPerDay} />
        )}
      </div>
    </div>
  );
}

// ── Today View (existing logic) ──────────────────────────────

function TodayView({ kpis }: { kpis: ActivityKpiStatus[] }) {
  return (
    <div className="space-y-4">
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
  );
}

// ── Week View (new: per-day breakdown Mo-Fr) ─────────────────

function WeekView({ kpis, weeklyPerDay }: { kpis: ActivityKpiStatus[]; weeklyPerDay?: WeekDayKpiStatus[] }) {
  if (!weeklyPerDay || weeklyPerDay.length === 0) {
    return (
      <p className="text-sm text-slate-500">Keine Wochendaten verfuegbar.</p>
    );
  }

  const dayLabels = weeklyPerDay[0]?.days.map((d) => d.dayLabel) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2 pr-3 w-28">KPI</th>
            {weeklyPerDay[0]?.days.map((day) => (
              <th
                key={day.date}
                className={cn(
                  "text-center text-xs font-semibold uppercase tracking-wide pb-2 px-1",
                  day.isToday ? "text-blue-600" : "text-slate-400"
                )}
              >
                {day.dayLabel}
              </th>
            ))}
            <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2 px-1 pl-3">Soll</th>
          </tr>
        </thead>
        <tbody>
          {weeklyPerDay.map((kpi) => {
            const isWarning = kpi.kpiKey === "deals_stagnant";
            return (
              <tr key={kpi.kpiKey} className="border-t border-slate-100">
                <td className="py-2 pr-3 text-sm font-medium text-slate-700 flex items-center gap-1">
                  {isWarning && (
                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  {kpi.label}
                </td>
                {kpi.days.map((day) => (
                  <td key={day.date} className="py-2 px-1 text-center">
                    <div
                      className={cn(
                        "inline-flex items-center justify-center rounded-md px-2 py-1 min-w-[2rem] text-xs font-bold",
                        getCellBg(day.actual, kpi.dailyTarget, isWarning),
                        getCellText(day.actual, kpi.dailyTarget, isWarning),
                        day.isToday && "ring-2 ring-blue-400 ring-offset-1"
                      )}
                    >
                      {day.actual}
                    </div>
                  </td>
                ))}
                <td className="py-2 px-1 pl-3 text-center text-xs text-slate-400 font-medium">
                  {kpi.dailyTarget}/Tag
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
