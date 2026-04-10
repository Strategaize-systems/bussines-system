"use client";

import { useState, useCallback } from "react";
import { Sparkles, Search, X, Loader2 } from "lucide-react";
import { VoiceRecordButton } from "@/components/voice/voice-record-button";
import type { PipelineSearchFilter } from "@/lib/ai/types";

interface PipelineSearchBarProps {
  pipelineName: string;
  stageNames: string[];
  onFilter: (filter: PipelineSearchFilter) => void;
  onReset: () => void;
  onTextSearch: (query: string) => void;
  textQuery: string;
}

export function PipelineSearchBar({
  pipelineName,
  stageNames,
  onFilter,
  onReset,
  onTextSearch,
  textQuery,
}: PipelineSearchBarProps) {
  const [aiQuery, setAiQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAiFilter, setActiveAiFilter] = useState(false);

  const handleAiSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pipeline-search",
          context: { query: query.trim(), stageNames, pipelineName },
        }),
      });

      if (res.status === 429) {
        setError("Rate Limit erreicht. Bitte kurz warten.");
        return;
      }

      if (!res.ok) {
        setError("KI-Suche nicht verfügbar.");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        onFilter(data.data);
        setActiveAiFilter(true);
      } else {
        setError(data.error || "KI-Suche fehlgeschlagen.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  }, [stageNames, pipelineName, onFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && aiQuery.trim()) {
      handleAiSearch(aiQuery);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setAiQuery(text);
    handleAiSearch(text);
  };

  const handleReset = () => {
    setAiQuery("");
    setError(null);
    setActiveAiFilter(false);
    onReset();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Regular text search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Deal, Firma oder Kontakt..."
              value={textQuery}
              onChange={(e) => onTextSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
            />
          </div>
        </div>

        {/* AI search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4454b8]" size={16} />
            <input
              type="text"
              placeholder="KI-Suche: z.B. 'Deals über 50k in Phase Angebot'"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-24 py-2.5 rounded-lg border-2 border-[#4454b8]/30 bg-[#4454b8]/5 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loading ? (
                <Loader2 className="h-4 w-4 text-[#4454b8] animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleAiSearch(aiQuery)}
                  disabled={!aiQuery.trim()}
                  className="p-1.5 rounded-md bg-[#4454b8] text-white disabled:opacity-30 hover:bg-[#3344a8] transition-colors"
                  title="KI-Suche starten"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Voice input */}
        <VoiceRecordButton onTranscript={handleVoiceTranscript} />

        {/* Reset button */}
        {activeAiFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            KI-Filter aufheben
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 pl-1">{error}</p>
      )}
    </div>
  );
}
