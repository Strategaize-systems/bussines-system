import {
  getDashboardStats,
  getForecastValue,
  getTopMultiplikatoren,
  getTopChancen,
} from "./actions";
import { getOverdueCount } from "../mein-tag/actions";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { Banknote, Kanban, AlertCircle, TrendingUp, Handshake, ChevronRight } from "lucide-react";
import Link from "next/link";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const [stats, overdueTotal, forecastValue, multiplikatoren, chancen] =
    await Promise.all([
      getDashboardStats(),
      getOverdueCount(),
      getForecastValue(),
      getTopMultiplikatoren(5),
      getTopChancen(5),
    ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Business Development Dashboard"
        subtitle="Geschäftsführer-Cockpit · KPIs & Analytics"
      />

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Section Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              Key Performance Indicators
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Zeitraum:</span>
              <select className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] cursor-pointer">
                <option>Dieser Monat</option>
                <option>Letzte 30 Tage</option>
                <option>Dieses Quartal</option>
                <option>Dieses Jahr</option>
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <KPIGrid columns={4}>
            <KPICard
              label="Pipeline Wert"
              value={fmt.format(stats.totalPipelineValue)}
              icon={Banknote}
              gradient="blue"
              href="/pipeline/unternehmer"
              comparison="+18% vs Vormonat"
              comparisonPositive
            />
            <KPICard
              label="Offene Deals"
              value={stats.openDeals}
              icon={Kanban}
              gradient="blue"
              href="/pipeline/unternehmer"
              comparison="+12% vs Vormonat"
              comparisonPositive
            />
            <KPICard
              label="Überfällig"
              value={overdueTotal}
              icon={AlertCircle}
              gradient="red"
              href="/mein-tag"
              comparison={overdueTotal > 0 ? "-25% vs Vorwoche" : undefined}
              comparisonPositive={overdueTotal > 0 ? false : undefined}
            />
            <KPICard
              label="Forecast"
              value={fmt.format(forecastValue)}
              icon={TrendingUp}
              gradient="green"
              href="/pipeline/unternehmer"
              comparison="+22% vs Vormonat"
              comparisonPositive
            />
          </KPIGrid>

          {/* Two-Column: Multiplikatoren + Unternehmer-Chancen */}
          <div className="grid grid-cols-12 gap-6">
            {/* Multiplikatoren Table */}
            <div className="col-span-6">
              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
                    <Handshake size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Multiplikatoren
                  </h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {multiplikatoren.length}
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-3">
                        Name ↕
                      </th>
                      <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Firma
                      </th>
                      <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Vertrauen
                      </th>
                      <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-3">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {multiplikatoren.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">
                          {m.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {m.companyName || "–"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TrustBadge level={m.trustLevel} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={`/contacts/${m.id}`}
                            className="text-slate-400 hover:text-[#4454b8] transition-colors"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {multiplikatoren.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                          Noch keine Multiplikatoren angelegt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="px-6 py-3 border-t border-slate-100">
                  <Link
                    href="/multiplikatoren"
                    className="text-sm font-semibold text-[#4454b8] hover:text-[#120774] flex items-center gap-1 transition-colors"
                  >
                    Alle anzeigen <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Unternehmer-Chancen Table */}
            <div className="col-span-6">
              <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00a84f] to-[#4dcb8b] flex items-center justify-center">
                    <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Unternehmer-Chancen
                  </h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {chancen.length}
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-3">
                        Firma
                      </th>
                      <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Wert ↕
                      </th>
                      <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">
                        Chance
                      </th>
                      <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-3">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chancen.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {c.companyName}
                          </div>
                          {c.stageName && (
                            <StageBadge name={c.stageName} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {fmtCompact.format(c.value)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">
                              {c.probability}%
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden max-w-[80px]">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${c.probability}%`,
                                  background:
                                    c.probability >= 70
                                      ? "linear-gradient(to right, #00a84f, #4dcb8b)"
                                      : c.probability >= 40
                                      ? "linear-gradient(to right, #f2b705, #ffd54f)"
                                      : "linear-gradient(to right, #120774, #4454b8)",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href="/pipeline/unternehmer"
                            className="text-slate-400 hover:text-[#4454b8] transition-colors"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {chancen.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                          Noch keine aktiven Chancen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="px-6 py-3 border-t border-slate-100">
                  <Link
                    href="/pipeline/unternehmer"
                    className="text-sm font-semibold text-[#00a84f] hover:text-[#008f43] flex items-center gap-1 transition-colors"
                  >
                    Alle anzeigen <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TrustBadge({ level }: { level: number | null }) {
  if (level === null || level === undefined) {
    return <span className="text-xs text-slate-400">–</span>;
  }

  const color =
    level >= 9
      ? "bg-emerald-500"
      : level >= 7
      ? "bg-blue-500"
      : level >= 5
      ? "bg-amber-500"
      : "bg-slate-400";

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${color}`}
    >
      {level}
    </span>
  );
}

function StageBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Angebot: "bg-blue-100 text-blue-700 border-blue-200",
    Verständigung: "bg-purple-100 text-purple-700 border-purple-200",
    "Erstgespräch geführt": "bg-orange-100 text-orange-700 border-orange-200",
    "Qualifikation geprüft": "bg-amber-100 text-amber-700 border-amber-200",
  };

  const style = colors[name] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${style}`}>
      {name}
    </span>
  );
}
