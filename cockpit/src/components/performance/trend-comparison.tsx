import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SnapshotComparison } from "@/app/actions/kpi-snapshots";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { KpiType } from "@/types/kpi-snapshots";

type TrendRow = {
  label: string;
  kpiType: KpiType;
  unit: string;
  comparison: SnapshotComparison;
};

function formatChange(comparison: SnapshotComparison, unit: string): string {
  if (comparison.changePercent === null) return "—";
  const sign = comparison.changePercent >= 0 ? "+" : "";
  if (unit === "%") {
    const diff = Math.round(comparison.current - comparison.previous);
    return `${diff >= 0 ? "+" : ""}${diff}pp`;
  }
  return `${sign}${comparison.changePercent}%`;
}

type Props = {
  rows: TrendRow[];
};

export function TrendComparison({ rows }: Props) {
  const hasData = rows.some((r) => r.comparison.current > 0 || r.comparison.previous > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend (vs. Vorperiode)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Keine Trend-Daten vorhanden. Trend-Daten werden durch den taeglichen KPI-Snapshot-Cron gesammelt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend (vs. Vorperiode)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const { comparison } = row;
          const isPositive = comparison.changePercent !== null && comparison.changePercent > 0;
          const isNegative = comparison.changePercent !== null && comparison.changePercent < 0;
          const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
          const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500";

          return (
            <div
              key={row.kpiType}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5"
            >
              <span className="text-sm font-medium text-slate-700">{row.label}</span>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className={`text-sm font-semibold ${color}`}>
                  {formatChange(comparison, row.unit)}
                </span>
                <span className="text-xs text-slate-400">vs. Vorperiode</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
