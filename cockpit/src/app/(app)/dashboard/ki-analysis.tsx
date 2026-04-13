"use client";

import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Activity,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ManagementAnalysisResult,
  ManagementFreetextResult,
  ManagementAnalysisContext,
} from "@/lib/ai/types";
import type { ManagementAnalysisType } from "@/lib/ai/prompts/management-analysis";

// ── Analysis Presets ─────────────────────────────────────────

const PRESETS: Array<{
  type: ManagementAnalysisType;
  label: string;
  icon: typeof TrendingUp;
  color: string;
}> = [
  { type: "pipeline-health", label: "Pipeline-Gesundheit", icon: TrendingUp, color: "from-blue-500 to-blue-600" },
  { type: "multiplikator-ranking", label: "Multiplikator-Ranking", icon: Users, color: "from-emerald-500 to-emerald-600" },
  { type: "forecast", label: "Umsatz-Prognose", icon: Target, color: "from-purple-500 to-purple-600" },
  { type: "win-loss", label: "Win/Loss-Analyse", icon: BarChart3, color: "from-amber-500 to-amber-600" },
  { type: "activity-analysis", label: "Aktivitaets-Analyse", icon: Activity, color: "from-rose-500 to-rose-600" },
];

// ── Types ────────────────────────────────────────────────────

interface KIAnalysisProps {
  contextData: ManagementAnalysisContext;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "analysis"; data: ManagementAnalysisResult; label: string }
  | { status: "freetext"; data: ManagementFreetextResult; query: string }
  | { status: "error"; message: string };

// ── Trend Icon ───────────────────────────────────────────────

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === "up") return <ArrowUp size={12} className="text-emerald-600" />;
  if (trend === "down") return <ArrowDown size={12} className="text-red-500" />;
  return <Minus size={12} className="text-slate-400" />;
}

// ── Component ────────────────────────────────────────────────

export function KIAnalysis({ contextData }: KIAnalysisProps) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [freetextQuery, setFreetextQuery] = useState("");
  const [expanded, setExpanded] = useState(true);

  async function runAnalysis(type: ManagementAnalysisType, label: string) {
    setState({ status: "loading", label });

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "management-analysis",
          context: { ...contextData, analysisType: type },
        }),
      });

      if (res.status === 429) {
        setState({ status: "error", message: "Rate Limit erreicht. Bitte kurz warten." });
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        setState({ status: "analysis", data: json.data, label });
      } else {
        setState({ status: "error", message: "Analyse konnte nicht erstellt werden. Bitte erneut versuchen." });
      }
    } catch {
      setState({ status: "error", message: "Verbindung fehlgeschlagen. Bitte erneut versuchen." });
    }
  }

  async function runFreetext() {
    if (!freetextQuery.trim()) return;

    setState({ status: "loading", label: "Freitext-Abfrage" });

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "management-freetext",
          context: {
            query: freetextQuery,
            deals: contextData.deals,
            activities: contextData.activities,
            stats: contextData.stats,
            stages: contextData.stages,
          },
        }),
      });

      if (res.status === 429) {
        setState({ status: "error", message: "Rate Limit erreicht. Bitte kurz warten." });
        return;
      }

      const json = await res.json();

      if (json.success && json.data) {
        setState({ status: "freetext", data: json.data, query: freetextQuery });
      } else {
        setState({ status: "error", message: "Abfrage konnte nicht verarbeitet werden. Bitte erneut versuchen." });
      }
    } catch {
      setState({ status: "error", message: "Verbindung fehlgeschlagen. Bitte erneut versuchen." });
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center">
          <Sparkles size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">KI-Analyse Cockpit</h3>
          <p className="text-[11px] text-slate-500">Vordefinierte Analysen und Freitext-Abfragen</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
      </div>

      {expanded && (
        <div className="p-6 space-y-5">
          {/* Preset Analysis Buttons */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Vordefinierte Analysen</div>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => runAnalysis(preset.type, preset.label)}
                  disabled={state.status === "loading"}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all text-center",
                    state.status === "loading"
                      ? "opacity-50 cursor-wait border-slate-200 bg-slate-50"
                      : "border-slate-200 hover:border-[#4454b8] hover:shadow-md bg-white cursor-pointer"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center", preset.color)}>
                    <preset.icon size={16} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Freetext Input */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Freitext-Abfrage</div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={freetextQuery}
                  onChange={(e) => setFreetextQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runFreetext()}
                  placeholder="z.B. &quot;Wie viele Deals wurden diesen Monat gewonnen?&quot;"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 focus:border-[#4454b8] focus:outline-none transition-colors"
                  disabled={state.status === "loading"}
                />
              </div>
              <button
                onClick={runFreetext}
                disabled={state.status === "loading" || !freetextQuery.trim()}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-xs font-bold transition-all",
                  state.status === "loading" || !freetextQuery.trim()
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-[#4454b8] text-white hover:bg-[#3a48a0]"
                )}
              >
                Fragen
              </button>
            </div>
          </div>

          {/* Result Area */}
          <div className="min-h-[200px]">
            {state.status === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles size={32} className="text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">
                  Waehlen Sie eine Analyse oder stellen Sie eine Frage.
                </p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={28} className="text-[#4454b8] animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-600">{state.label} wird erstellt...</p>
                <p className="text-[11px] text-slate-400 mt-1">Daten werden analysiert...</p>
              </div>
            )}

            {state.status === "error" && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{state.message}</p>
              </div>
            )}

            {state.status === "analysis" && (
              <AnalysisResult data={state.data} label={state.label} onReset={() => setState({ status: "idle" })} />
            )}

            {state.status === "freetext" && (
              <FreetextResult data={state.data} query={state.query} onReset={() => setState({ status: "idle" })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Result Display ──────────────────────────────────

function AnalysisResult({
  data,
  label,
  onReset,
}: {
  data: ManagementAnalysisResult;
  label: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Title + Confidence */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900">{data.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{data.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <div className={cn(
            "text-[11px] font-bold px-2 py-1 rounded-full",
            data.confidence >= 70 ? "bg-emerald-100 text-emerald-700" :
            data.confidence >= 40 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          )}>
            {data.confidence}% Konfidenz
          </div>
          <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Zuruecksetzen
          </button>
        </div>
      </div>

      {/* Data Points */}
      {data.dataPoints.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.dataPoints.map((dp, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">{dp.label}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">{dp.value}</span>
                <TrendIcon trend={dp.trend} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights + Recommendations side by side */}
      <div className="grid grid-cols-2 gap-4">
        {data.insights.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Erkenntnisse</div>
            <ul className="space-y-1.5">
              {data.insights.map((insight, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-[#4454b8] font-bold shrink-0">-</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.recommendations.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Empfehlungen</div>
            <ul className="space-y-1.5">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">-</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Data Sources */}
      {data.dataSources.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Database size={12} className="text-slate-400" />
          <span className="text-[10px] font-medium text-slate-400">
            Datenquellen: {data.dataSources.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Freetext Result Display ──────────────────────────────────

function FreetextResult({
  data,
  query,
  onReset,
}: {
  data: ManagementFreetextResult;
  query: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Question + Confidence */}
      <div className="flex items-start justify-between">
        <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
          <span className="text-xs font-medium text-slate-500">Frage:</span>
          <p className="text-sm font-medium text-slate-800">{query}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <div className={cn(
            "text-[11px] font-bold px-2 py-1 rounded-full",
            data.confidence >= 70 ? "bg-emerald-100 text-emerald-700" :
            data.confidence >= 40 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          )}>
            {data.confidence}%
          </div>
          <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Zuruecksetzen
          </button>
        </div>
      </div>

      {/* Answer */}
      <p className="text-sm text-slate-800 leading-relaxed">{data.answer}</p>

      {/* Data Points */}
      {data.dataPoints.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {data.dataPoints.map((dp, i) => (
            <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <div className="text-[10px] font-semibold text-slate-500">{dp.label}</div>
              <div className="text-sm font-bold text-slate-900">{dp.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Highlights</div>
          <ul className="space-y-1">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#4454b8] font-bold shrink-0">-</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-Up Suggestion */}
      {data.suggestedFollowUp && (
        <div className="bg-blue-50 rounded-lg px-4 py-2.5 border border-blue-200">
          <span className="text-[10px] font-semibold text-blue-600 uppercase">Folgefrage</span>
          <p className="text-sm text-blue-800 mt-0.5">{data.suggestedFollowUp}</p>
        </div>
      )}

      {/* Data Sources */}
      {data.dataSources.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Database size={12} className="text-slate-400" />
          <span className="text-[10px] font-medium text-slate-400">
            Datenquellen: {data.dataSources.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
