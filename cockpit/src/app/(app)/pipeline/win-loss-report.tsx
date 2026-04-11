"use client";

import { useMemo, useState } from "react";
import type { Deal } from "./actions";
import { Trophy, XCircle, TrendingUp, TrendingDown } from "lucide-react";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface WinLossReportProps {
  deals: Deal[];
}

type ReasonEntry = {
  reason: string;
  count: number;
  totalValue: number;
  percentage: number;
};

type MonthBucket = {
  label: string; // e.g. "Apr 2026"
  key: string; // e.g. "2026-04"
  won: number;
  lost: number;
  wonValue: number;
  lostValue: number;
};

export function WinLossReport({ deals }: WinLossReportProps) {
  const [tab, setTab] = useState<"overview" | "reasons" | "trend">("overview");

  // Separate won and lost deals
  const wonDeals = useMemo(() => deals.filter((d) => d.status === "won"), [deals]);
  const lostDeals = useMemo(() => deals.filter((d) => d.status === "lost"), [deals]);
  const closedDeals = useMemo(() => [...wonDeals, ...lostDeals], [wonDeals, lostDeals]);

  // Win rate
  const winRate = closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0;

  // Group by reason
  const lossReasons = useMemo((): ReasonEntry[] => {
    const map = new Map<string, { count: number; totalValue: number }>();
    for (const d of lostDeals) {
      const reason = d.won_lost_reason?.trim() || "Kein Grund angegeben";
      const entry = map.get(reason) ?? { count: 0, totalValue: 0 };
      entry.count++;
      entry.totalValue += d.value ?? 0;
      map.set(reason, entry);
    }
    const total = lostDeals.length || 1;
    return Array.from(map.entries())
      .map(([reason, data]) => ({
        reason,
        ...data,
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [lostDeals]);

  const winReasons = useMemo((): ReasonEntry[] => {
    const map = new Map<string, { count: number; totalValue: number }>();
    for (const d of wonDeals) {
      const reason = d.won_lost_reason?.trim() || "Kein Grund angegeben";
      const entry = map.get(reason) ?? { count: 0, totalValue: 0 };
      entry.count++;
      entry.totalValue += d.value ?? 0;
      map.set(reason, entry);
    }
    const total = wonDeals.length || 1;
    return Array.from(map.entries())
      .map(([reason, data]) => ({
        reason,
        ...data,
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [wonDeals]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo((): MonthBucket[] => {
    const now = new Date();
    const buckets: MonthBucket[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "numeric" });
      buckets.push({ label, key, won: 0, lost: 0, wonValue: 0, lostValue: 0 });
    }

    for (const deal of closedDeals) {
      const closedDate = deal.closed_at ? new Date(deal.closed_at) : null;
      if (!closedDate) continue;
      const key = `${closedDate.getFullYear()}-${String(closedDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((b) => b.key === key);
      if (!bucket) continue;
      if (deal.status === "won") {
        bucket.won++;
        bucket.wonValue += deal.value ?? 0;
      } else {
        bucket.lost++;
        bucket.lostValue += deal.value ?? 0;
      }
    }

    return buckets;
  }, [closedDeals]);

  // Max for bar scaling in trend
  const maxMonthlyDeals = Math.max(...monthlyTrend.map((m) => m.won + m.lost), 1);

  if (closedDeals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Noch keine abgeschlossenen Deals vorhanden.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Trophy size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{wonDeals.length}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Gewonnen</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <XCircle size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{lostDeals.length}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Verloren</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
                <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{winRate}%</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Win-Rate</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <TrendingDown size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">
                  {fmt.format(lostDeals.reduce((s, d) => s + (d.value ?? 0), 0))}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Entgangener Umsatz</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {([
            { key: "overview", label: "Übersicht" },
            { key: "reasons", label: "Verlustgründe" },
            { key: "trend", label: "Trend (6 Monate)" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-6">
            {/* Win Reasons */}
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-4">
                Gewinn-Gründe
              </h3>
              {winReasons.length === 0 ? (
                <p className="text-sm text-slate-400">Keine Gewinn-Gründe erfasst.</p>
              ) : (
                <div className="space-y-3">
                  {winReasons.map((r) => (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">
                          {r.reason}
                        </span>
                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                          {r.count}× · {r.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loss Reasons */}
            <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-4">
                Verlust-Gründe
              </h3>
              {lossReasons.length === 0 ? (
                <p className="text-sm text-slate-400">Keine Verlust-Gründe erfasst.</p>
              ) : (
                <div className="space-y-3">
                  {lossReasons.map((r) => (
                    <div key={r.reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">
                          {r.reason}
                        </span>
                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                          {r.count}× · {r.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "reasons" && (
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
              Alle Verlust-Gründe — Detail
            </h3>
            {lossReasons.length === 0 ? (
              <p className="text-sm text-slate-400">Keine Verlust-Gründe erfasst.</p>
            ) : (
              <div className="space-y-4">
                {lossReasons.map((r, i) => (
                  <div key={r.reason} className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-slate-600">{i + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-800">{r.reason}</span>
                        <span className="text-xs font-bold text-red-600 tabular-nums">
                          {r.count} Deal{r.count !== 1 ? "s" : ""} · {fmt.format(r.totalValue)}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${r.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
                        {r.percentage}% aller verlorenen Deals
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "trend" && (
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Won/Lost Trend — Letzte 6 Monate
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  Gewonnen
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  Verloren
                </span>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end gap-4 h-[200px]">
              {monthlyTrend.map((m) => {
                const totalDeals = m.won + m.lost;
                const wonHeight = totalDeals > 0 ? (m.won / maxMonthlyDeals) * 100 : 0;
                const lostHeight = totalDeals > 0 ? (m.lost / maxMonthlyDeals) * 100 : 0;
                const monthWinRate = totalDeals > 0 ? Math.round((m.won / totalDeals) * 100) : 0;

                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {/* Value labels */}
                    {totalDeals > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {monthWinRate}% WR
                      </span>
                    )}

                    {/* Stacked bars */}
                    <div className="w-full flex flex-col items-center gap-0.5">
                      {m.won > 0 && (
                        <div
                          className="w-full max-w-[48px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md flex items-end justify-center"
                          style={{ height: `${Math.max(wonHeight * 1.6, 16)}px` }}
                          title={`Gewonnen: ${m.won} (${fmt.format(m.wonValue)})`}
                        >
                          <span className="text-[10px] font-bold text-white pb-0.5">{m.won}</span>
                        </div>
                      )}
                      {m.lost > 0 && (
                        <div
                          className="w-full max-w-[48px] bg-gradient-to-t from-red-600 to-red-400 rounded-b-md flex items-start justify-center"
                          style={{ height: `${Math.max(lostHeight * 1.6, 16)}px` }}
                          title={`Verloren: ${m.lost} (${fmt.format(m.lostValue)})`}
                        >
                          <span className="text-[10px] font-bold text-white pt-0.5">{m.lost}</span>
                        </div>
                      )}
                      {totalDeals === 0 && (
                        <div className="w-full max-w-[48px] h-4 bg-slate-100 rounded-md" />
                      )}
                    </div>

                    {/* Month label */}
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">{m.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Monthly details table */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 font-semibold uppercase tracking-wide">
                    <th className="text-left pb-2">Monat</th>
                    <th className="text-right pb-2">Gewonnen</th>
                    <th className="text-right pb-2">Verloren</th>
                    <th className="text-right pb-2">Win-Rate</th>
                    <th className="text-right pb-2">Gewonnener Wert</th>
                    <th className="text-right pb-2">Verlorener Wert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyTrend.map((m) => {
                    const total = m.won + m.lost;
                    const wr = total > 0 ? Math.round((m.won / total) * 100) : 0;
                    return (
                      <tr key={m.key} className="text-slate-700">
                        <td className="py-2 font-semibold">{m.label}</td>
                        <td className="py-2 text-right tabular-nums text-emerald-600 font-semibold">{m.won}</td>
                        <td className="py-2 text-right tabular-nums text-red-600 font-semibold">{m.lost}</td>
                        <td className="py-2 text-right tabular-nums font-bold">
                          <span className={wr >= 50 ? "text-emerald-600" : "text-red-600"}>
                            {total > 0 ? `${wr}%` : "—"}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular-nums text-emerald-600">{fmt.format(m.wonValue)}</td>
                        <td className="py-2 text-right tabular-nums text-red-600">{fmt.format(m.lostValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
