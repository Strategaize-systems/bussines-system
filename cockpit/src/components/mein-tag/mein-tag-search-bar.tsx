"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";
import type { MeinTagQueryResult } from "@/lib/ai/types";

interface MeinTagSearchBarProps {
  todaysTasks: Array<{
    title: string;
    priority?: string;
    dueDate?: string;
    contactName?: string;
    companyName?: string;
  }>;
  topDeals: Array<{
    title: string;
    value?: number;
    stage?: string;
    companyName?: string;
    nextAction?: string;
  }>;
  calendarSlots: Array<{
    time: string;
    title: string;
    type: string;
  }>;
  stagnantDeals: Array<{
    title: string;
    daysSinceUpdate: number;
    value?: number;
    stage?: string;
  }>;
  overdueTasks: Array<{
    title: string;
    dueDate: string;
  }>;
}

export function MeinTagSearchBar({
  todaysTasks,
  topDeals,
  calendarSlots,
  stagnantDeals,
  overdueTasks,
}: MeinTagSearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeinTagQueryResult | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mein-tag-query",
          context: {
            query: searchQuery.trim(),
            todaysTasks,
            topDeals,
            calendarSlots,
            stagnantDeals,
            overdueTasks,
          },
        }),
      });

      if (res.status === 429) {
        setError("Rate Limit erreicht. Bitte kurz warten.");
        return;
      }

      if (!res.ok) {
        setError("KI-Assistent nicht verfuegbar.");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || "KI-Anfrage fehlgeschlagen.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }, [todaysTasks, topDeals, calendarSlots, stagnantDeals, overdueTasks]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleSearch(query);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setQuery(text);
    handleSearch(text);
  };

  const handleClear = () => {
    setQuery("");
    setError(null);
    setResult(null);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4454b8]" size={18} />
          <input
            type="text"
            placeholder="Frag deinen KI-Assistenten... z.B. 'Welche Deals sind diese Woche fällig?'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-11 pr-14 py-3.5 rounded-2xl border-2 border-[#4454b8]/30 bg-gradient-to-r from-[#4454b8]/5 to-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading ? (
              <Loader2 className="h-5 w-5 text-[#4454b8] animate-spin" />
            ) : (
              <button
                type="button"
                onClick={() => handleSearch(query)}
                disabled={!query.trim()}
                className="p-1.5 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] text-white disabled:opacity-30 hover:shadow-md transition-all"
                title="KI-Anfrage senden"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <VoiceRecordButton onTranscript={handleVoiceTranscript} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={handleClear} className="text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-gradient-to-r from-[#120774]/5 to-[#4454b8]/5 rounded-2xl border border-[#4454b8]/15 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{result.answer}</p>

              {result.highlights.length > 0 && (
                <div className="space-y-1.5">
                  {result.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="w-4 h-4 rounded bg-[#4454b8]/10 text-[#4454b8] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {h}
                    </div>
                  ))}
                </div>
              )}

              {result.suggestedAction && (
                <div className="flex items-center gap-2 pt-1">
                  <Lightbulb size={12} className="text-amber-500" />
                  <p className="text-xs font-medium text-amber-700">{result.suggestedAction}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              title="Ergebnis schliessen"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
