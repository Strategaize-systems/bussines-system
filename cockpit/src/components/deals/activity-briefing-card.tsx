"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { BriefingPayload } from "@/lib/types/briefing";

interface ParsedBriefing extends BriefingPayload {
  meetingId?: string;
}

interface ActivityBriefingCardProps {
  /** Activity row with type='briefing' and JSON-stringified BriefingPayload in description. */
  activity: {
    id: string;
    title?: string | null;
    description?: string | null;
    created_at?: string | null;
  };
}

function parseBriefing(raw: string | null | undefined): ParsedBriefing | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      typeof data?.summary === "string" &&
      Array.isArray(data?.keyFacts) &&
      Array.isArray(data?.openRisks) &&
      Array.isArray(data?.suggestedNextSteps) &&
      typeof data?.confidence === "number"
    ) {
      return data as ParsedBriefing;
    }
    return null;
  } catch {
    return null;
  }
}

export function ActivityBriefingCard({ activity }: ActivityBriefingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const briefing = parseBriefing(activity.description);

  // Fallback when JSON parse fails — render description as plain text.
  if (!briefing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-3">
          <div className="rounded-lg p-2 shrink-0 bg-purple-100 text-purple-600">
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700">
              {activity.title ?? "Pre-Call Briefing"}
            </p>
            <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
              {activity.description ?? "(kein Inhalt)"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex gap-3">
        <div className="rounded-lg p-2 shrink-0 bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600">
          <Brain className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
              {activity.title ?? "Pre-Call Briefing"}
            </p>
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 bg-purple-50 text-purple-700 border-purple-200">
              KI {briefing.confidence}%
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            {briefing.summary}
          </p>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              {briefing.keyFacts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Wichtigste Fakten
                  </p>
                  <ul className="space-y-1">
                    {briefing.keyFacts.map((f, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-snug pl-3 relative">
                        <span className="absolute left-0 text-slate-300">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {briefing.openRisks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                    Offene Risiken
                  </p>
                  <ul className="space-y-1">
                    {briefing.openRisks.map((r, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-snug pl-3 relative">
                        <span className="absolute left-0 text-amber-400">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {briefing.suggestedNextSteps.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 mb-1">
                    Naechste Schritte
                  </p>
                  <ul className="space-y-1">
                    {briefing.suggestedNextSteps.map((s, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-snug pl-3 relative">
                        <span className="absolute left-0 text-indigo-400">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Weniger anzeigen
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Details anzeigen
              </>
            )}
          </button>

          {activity.created_at && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              {new Date(activity.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActivityBriefingErrorCardProps {
  activity: {
    id: string;
    title?: string | null;
    created_at?: string | null;
  };
}

export function ActivityBriefingErrorCard({ activity }: ActivityBriefingErrorCardProps) {
  return (
    <div className="bg-red-50 rounded-xl border border-red-200 p-3">
      <div className="flex gap-2 items-center">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-800">
            {activity.title ?? "Briefing-Generierung fehlgeschlagen"}
          </p>
          {activity.created_at && (
            <p className="text-[11px] text-red-600/70 mt-0.5">
              {new Date(activity.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
