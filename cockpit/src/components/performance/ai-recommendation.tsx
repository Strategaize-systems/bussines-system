"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { getPerformanceRecommendation } from "@/app/actions/goals";
import type { GoalProgress } from "@/types/goals";

type Props = {
  progressData: GoalProgress[];
};

export function AiRecommendation({ progressData }: Props) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPerformanceRecommendation(progressData);
      if (result.error) {
        setError(result.error);
      } else {
        setRecommendation(result.recommendation ?? null);
      }
    } catch {
      setError("Verbindung zur KI fehlgeschlagen. Bitte spaeter erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (progressData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg relative overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
      <div className="p-4 pb-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          KI-Empfehlung
        </h3>
      </div>
      <div className="p-4">
        {!recommendation && !loading && !error && (
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
          >
            <Sparkles className="h-4 w-4" />
            KI-Empfehlung abrufen
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysiere deine Performance-Daten...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                onClick={handleClick}
                className="mt-2 text-xs font-medium underline hover:no-underline"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )}

        {recommendation && (
          <div className="space-y-3">
            <div className="rounded-lg bg-purple-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {recommendation}
            </div>
            <button
              onClick={handleClick}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Neue Empfehlung abrufen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
