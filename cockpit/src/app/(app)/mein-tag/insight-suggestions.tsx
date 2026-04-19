"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import type { AIActionQueueItem } from "@/types/ai-queue";
import { PropertyChangeCard } from "./property-change-card";
import { batchApproveInsightActions } from "@/lib/actions/insight-actions";

// ── Props ────────────────────────────────────────────────────

interface InsightSuggestionsProps {
  suggestions: AIActionQueueItem[];
  embedded?: boolean;
}

// ── Main component ───────────────────────────────────────────

export function InsightSuggestions({
  suggestions,
  embedded,
}: InsightSuggestionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatching, startBatch] = useTransition();
  const [batchResult, setBatchResult] = useState<{
    approved: number;
    failed: number;
  } | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out items that were individually handled (approved/rejected renders locally)
  // and batch-dismissed items
  const visibleItems = suggestions.filter((s) => !dismissedIds.has(s.id));

  if (visibleItems.length === 0 && !batchResult) return null;

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const appliableIds = visibleItems
      .filter(
        (s) => s.type === "status_change" || s.type === "value_change"
      )
      .map((s) => s.id);

    if (selectedIds.size === appliableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(appliableIds));
    }
  };

  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    startBatch(async () => {
      const result = await batchApproveInsightActions(ids);
      setBatchResult({
        approved: result.approved,
        failed: result.failed,
      });
      // Remove approved items from view
      setDismissedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      setSelectedIds(new Set());
    });
  };

  const appliableCount = visibleItems.filter(
    (s) => s.type === "status_change" || s.type === "value_change"
  ).length;

  // ── Embedded mode (inside KI Workspace tab) ────────────────
  if (embedded) {
    return (
      <div className="space-y-3">
        {/* Batch result feedback */}
        {batchResult && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <Check size={14} className="text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">
              {batchResult.approved} angewendet
              {batchResult.failed > 0 &&
                `, ${batchResult.failed} fehlgeschlagen`}
            </span>
          </div>
        )}

        {/* Cards */}
        {visibleItems.map((item) => (
          <PropertyChangeCard
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onSelect={handleSelect}
          />
        ))}

        {/* Batch bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-violet-100 border border-violet-200">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-[11px] font-medium text-violet-600 hover:text-violet-800 transition-colors"
              >
                {selectedIds.size === appliableCount
                  ? "Keine"
                  : "Alle"}{" "}
                auswaehlen
              </button>
              <span className="text-[11px] text-violet-500">
                {selectedIds.size} ausgewaehlt
              </span>
            </div>
            <button
              onClick={handleBatchApprove}
              disabled={isBatching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isBatching ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Alle genehmigen
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Standalone card mode ───────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            KI-Vorschlaege
          </h3>
          <p className="text-[11px] text-violet-600">
            {visibleItems.length} Vorschl
            {visibleItems.length === 1 ? "ag" : "aege"}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Batch result feedback */}
        {batchResult && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <Check size={14} className="text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">
              {batchResult.approved} angewendet
              {batchResult.failed > 0 &&
                `, ${batchResult.failed} fehlgeschlagen`}
            </span>
          </div>
        )}

        {visibleItems.map((item) => (
          <PropertyChangeCard
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Batch bar (sticky bottom) */}
      {selectedIds.size > 0 && (
        <div className="px-5 py-3 border-t border-violet-100 bg-violet-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              {selectedIds.size === appliableCount
                ? "Keine auswaehlen"
                : "Alle auswaehlen"}
            </button>
            <span className="text-xs text-violet-500">
              {selectedIds.size} ausgewaehlt
            </span>
          </div>
          <button
            onClick={handleBatchApprove}
            disabled={isBatching}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isBatching ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Alle genehmigen
          </button>
        </div>
      )}
    </div>
  );
}
