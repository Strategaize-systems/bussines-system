"use client";

import { useState } from "react";
import { Calendar, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { Meeting, ActionItem } from "@/app/(app)/meetings/actions";

interface MeetingTimelineItemProps {
  meeting: Meeting;
}

function isActionItemObject(item: string | ActionItem): item is ActionItem {
  return typeof item === "object" && item !== null && "task" in item;
}

export function MeetingTimelineItem({ meeting }: MeetingTimelineItemProps) {
  const [expanded, setExpanded] = useState(false);

  const title = meeting.title?.trim() || "Meeting";

  const summary = meeting.ai_summary ?? null;
  const hasSummary =
    !!summary &&
    !!(
      summary.outcome ||
      summary.next_step ||
      (summary.decisions && summary.decisions.length > 0) ||
      (summary.action_items && summary.action_items.length > 0) ||
      (summary.key_topics && summary.key_topics.length > 0)
    );
  const hasTranscript = !!meeting.transcript;
  const canExpand = hasSummary || hasTranscript;

  const date = meeting.scheduled_at ?? meeting.created_at;

  const statusBadge = (() => {
    if (meeting.summary_status === "completed") {
      return { label: "KI-Analyse", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (
      meeting.summary_status === "processing" ||
      meeting.transcript_status === "processing" ||
      meeting.recording_status === "uploading"
    ) {
      return { label: "wird verarbeitet", cls: "bg-slate-50 text-slate-600 border-slate-200" };
    }
    if (
      meeting.summary_status === "failed" ||
      meeting.transcript_status === "failed" ||
      meeting.recording_status === "failed"
    ) {
      return { label: "Fehler", cls: "bg-red-50 text-red-700 border-red-200" };
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex gap-3">
        <div className="rounded-lg p-2 shrink-0 bg-purple-100 text-purple-600">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
              {title}
            </p>
            {hasSummary && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 shrink-0">
                <Sparkles className="h-2.5 w-2.5" />
                KI
              </span>
            )}
            {statusBadge && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusBadge.cls}`}
              >
                {statusBadge.label}
              </span>
            )}
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-purple-100 text-purple-600 shrink-0">
              Meeting
            </span>
          </div>
          {hasSummary && summary!.outcome && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {summary!.outcome}
            </p>
          )}
          {!hasSummary && meeting.location && (
            <p className="text-xs text-slate-500 mt-1">Ort: {meeting.location}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-[11px] text-slate-400">
              {new Date(date).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {canExpand && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {expanded ? "Weniger" : "Details"}
              </button>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              {hasSummary && summary!.next_step && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Naechster Schritt
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{summary!.next_step}</p>
                </div>
              )}
              {hasSummary &&
                summary!.decisions &&
                summary!.decisions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Entscheidungen
                    </p>
                    <ul className="mt-0.5 space-y-1">
                      {summary!.decisions.map((d: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-700">
                          <span className="text-slate-400">•</span> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {hasSummary &&
                summary!.action_items &&
                summary!.action_items.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Aufgaben
                    </p>
                    <ul className="mt-0.5 space-y-1">
                      {summary!.action_items.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-700">
                          <span className="text-slate-400">•</span>{" "}
                          {isActionItemObject(item) ? (
                            <>
                              {item.owner ? (
                                <span className="font-medium">{item.owner}:</span>
                              ) : null}{" "}
                              {item.task}
                            </>
                          ) : (
                            item
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {hasSummary &&
                summary!.key_topics &&
                summary!.key_topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {summary!.key_topics.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              {hasTranscript && (
                <details className="group">
                  <summary className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 cursor-pointer hover:text-slate-600">
                    Transkript anzeigen
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-lg p-3 max-h-64 overflow-auto">
                    {meeting.transcript}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
