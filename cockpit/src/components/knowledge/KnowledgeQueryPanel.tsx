"use client";

import { useState } from "react";
import { BookOpen, X, Clock } from "lucide-react";
import { KnowledgeQueryInput } from "./KnowledgeQueryInput";
import { ScopeToggle } from "./ScopeToggle";
import { KnowledgeAnswer } from "./KnowledgeAnswer";
import { KnowledgeSourceCard } from "./KnowledgeSourceCard";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { useKnowledgeQuery } from "./useKnowledgeQuery";

interface KnowledgeQueryPanelProps {
  dealId: string;
}

export function KnowledgeQueryPanel({ dealId }: KnowledgeQueryPanelProps) {
  const [scope, setScope] = useState<"deal" | "all">("deal");
  const kq = useKnowledgeQuery();

  const handleQuery = (text: string) => {
    kq.query(text, scope, dealId);
  };

  return (
    <div className="space-y-4">
      {/* Input Row: Query + Scope */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 w-full">
          <KnowledgeQueryInput onSubmit={handleQuery} loading={kq.state === "loading"} />
        </div>
        <ScopeToggle scope={scope} onChange={setScope} disabled={kq.state === "loading"} />
      </div>

      {/* Empty State */}
      {kq.state === "idle" && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Stellen Sie eine Frage zur Wissensbasis dieses Deals.
            Die KI durchsucht Meeting-Transkripte, E-Mails, Notizen und Dokumente.
          </p>
        </div>
      )}

      {/* Loading State */}
      {kq.state === "loading" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-slate-200 rounded w-full mb-2" />
            <div className="h-4 bg-slate-200 rounded w-5/6 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-full mb-1" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {kq.state === "error" && kq.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600 flex-1">{kq.error}</p>
          <button
            onClick={kq.reset}
            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Success State */}
      {kq.state === "success" && kq.answer && (
        <div className="space-y-4">
          {/* Answer + Confidence */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <KnowledgeAnswer answer={kq.answer} />
              <button
                onClick={kq.reset}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                title="Ergebnis schliessen"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
              {kq.confidence && <ConfidenceBadge level={kq.confidence} />}
              {kq.queryTimeMs != null && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />
                  {(kq.queryTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          {/* Source Cards */}
          {kq.sources.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Quellen ({kq.sources.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {kq.sources.map((source) => (
                  <KnowledgeSourceCard key={source.index} source={source} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
