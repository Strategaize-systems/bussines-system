import {
  getDashboardStats,
  getTopChancen,
  getManagementContext,
} from "./actions";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { DashboardSearch } from "./dashboard-search";
import { KIAnalysis } from "./ki-analysis";
import { Euro, ClipboardList, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

const fmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const [stats, chancen, managementCtx] = await Promise.all([
    getDashboardStats(),
    getTopChancen(5),
    getManagementContext(),
  ]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Business Development Dashboard"
        subtitle="Geschäftsführer-Cockpit · KPIs & Analytics"
      />

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Search Bar with Voice + KI */}
          <DashboardSearch />

          {/* Main Layout: KPI-Fenster (left) + Cards & Chancen (right) */}
          <div className="grid grid-cols-12 gap-6">
            {/* KI-Analyse Cockpit */}
            <div className="col-span-8">
              <KIAnalysis contextData={managementCtx} />
            </div>

            {/* Right Column: KPI Cards + Unternehmer-Chancen */}
            <div className="col-span-4 space-y-6">
              {/* Two KPI Cards side by side */}
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  label="Pipeline Wert"
                  value={fmt.format(stats.totalPipelineValue)}
                  icon={Euro}
                  gradient="blue"
                  href="/pipeline/unternehmer"
                  comparison="+18% vs Vormonat"
                  comparisonPositive
                />
                <KPICard
                  label="Offene Deals"
                  value={stats.openDeals}
                  icon={ClipboardList}
                  gradient="blue"
                  href="/pipeline/unternehmer"
                  comparison="+12% vs Vormonat"
                  comparisonPositive
                />
              </div>

              {/* Unternehmer-Chancen Table */}
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
