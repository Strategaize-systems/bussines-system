"use client";

import { useState, useCallback } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiLoadButton } from "@/components/ai/ai-load-button";
import { AiResultPanel } from "@/components/ai/ai-result-panel";
import type { DealBriefing, DealBriefingContext } from "@/lib/ai/types";

interface AIBriefingPanelProps {
  context: DealBriefingContext;
}

export function AIBriefingPanel({ context }: AIBriefingPanelProps) {
  const [briefing, setBriefing] = useState<DealBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loaded = briefing !== null;

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deal-briefing", context }),
      });

      if (res.status === 429) {
        setError(
          "Rate Limit erreicht. Bitte in einer Minute erneut versuchen."
        );
        return;
      }

      if (!res.ok) {
        setError("KI-Service nicht verfügbar.");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setBriefing(data.data);
      } else {
        setError(data.error || "Briefing konnte nicht geladen werden");
      }
    } catch {
      setError("Verbindung zum KI-Service fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [context]);

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#4454b8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">
            KI-Briefing
          </h3>
        </div>
        {loaded && (
          <div className="flex items-center gap-1">
            <AiLoadButton
              onClick={fetchBriefing}
              loading={loading}
              loaded={true}
              refreshVariant="icon"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {!expanded && briefing && (
        <p className="text-xs text-slate-500 line-clamp-2">
          {briefing.summary}
        </p>
      )}

      {(expanded || !loaded) && (
        <AiResultPanel
          loading={loading}
          error={error}
          onRetry={fetchBriefing}
          loadingMessage="Analysiere Deal..."
        >
          {!loaded && (
            <div className="text-center py-3">
              <AiLoadButton
                onClick={fetchBriefing}
                loading={false}
                loaded={false}
                label="KI-Analyse laden"
              />
            </div>
          )}
          {briefing && <BriefingContent briefing={briefing} />}
        </AiResultPanel>
      )}
    </div>
  );
}

function BriefingContent({ briefing }: { briefing: DealBriefing }) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-sm text-slate-700 leading-relaxed">
        {briefing.summary}
      </p>

      {/* Confidence Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              briefing.confidence >= 70
                ? "bg-green-500"
                : briefing.confidence >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${briefing.confidence}%` }}
          />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {briefing.confidence}%
        </span>
      </div>

      {/* Key Facts */}
      {briefing.keyFacts.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Key Facts
          </p>
          <ul className="space-y-0.5">
            {briefing.keyFacts.map((fact, i) => (
              <li
                key={i}
                className="text-xs text-slate-600 flex items-start gap-1.5"
              >
                <span className="text-[#4454b8] mt-0.5 shrink-0">•</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {briefing.openRisks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">
            Risiken
          </p>
          <ul className="space-y-0.5">
            {briefing.openRisks.map((risk, i) => (
              <li
                key={i}
                className="text-xs text-slate-600 flex items-start gap-1.5"
              >
                <span className="text-red-400 mt-0.5 shrink-0">!</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {briefing.suggestedNextSteps.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mb-1">
            Empfohlene Schritte
          </p>
          <ul className="space-y-0.5">
            {briefing.suggestedNextSteps.map((step, i) => (
              <li
                key={i}
                className="text-xs text-slate-600 flex items-start gap-1.5"
              >
                <span className="text-green-500 mt-0.5 shrink-0">&rarr;</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
