// V6.2 SLC-625 — Clicks-Chart letzte 30 Tage (Bar-Sparkline ohne Library)

import { TrendingUp } from "lucide-react";

export interface ClicksChartProps {
  data: Array<{ date: string; count: number }>;
}

export function ClicksChart({ data }: ClicksChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (total === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <TrendingUp className="mx-auto h-5 w-5 text-slate-400 mb-1.5" />
        <p className="text-sm font-medium text-slate-700">
          Noch keine Klicks
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Klicks erscheinen hier sobald die Tracking-Links genutzt werden.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Klicks letzte 30 Tage
          </p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {total}
          </p>
        </div>
      </div>
      <div className="flex items-end gap-0.5 h-16">
        {data.map((d) => {
          const heightPct = max > 0 ? (d.count / max) * 100 : 0;
          return (
            <div
              key={d.date}
              className="flex-1 bg-violet-200 hover:bg-violet-400 transition-colors rounded-t-sm relative group min-h-[2px]"
              style={{ height: `${Math.max(heightPct, d.count > 0 ? 10 : 2)}%` }}
              title={`${d.date}: ${d.count} Klicks`}
            >
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-[10px] whitespace-nowrap bg-slate-900 text-white px-1.5 py-0.5 rounded">
                {d.date}: {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
