"use client";

import { useState } from "react";
import { Phone, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { Call } from "@/app/(app)/calls/actions";

interface CallTimelineItemProps {
  call: Call;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")} min`;
}

export function CallTimelineItem({ call }: CallTimelineItemProps) {
  const [expanded, setExpanded] = useState(false);

  const contactName = call.contacts
    ? `${call.contacts.first_name} ${call.contacts.last_name}`.trim()
    : null;

  const directionLabel =
    call.direction === "outbound" ? "Ausgehender Anruf" : "Eingehender Anruf";
  const durationText = formatDuration(call.duration_seconds);
  const target = contactName ?? call.phone_number ?? "unbekannt";
  const title = `${directionLabel} · ${target}`;
  const meta = [durationText, call.status === "completed" ? null : call.status]
    .filter(Boolean)
    .join(" · ");

  const summary = call.ai_summary ?? null;
  const hasSummary =
    summary &&
    (summary.outcome || summary.next_step ||
      (summary.action_items && summary.action_items.length > 0) ||
      (summary.key_topics && summary.key_topics.length > 0));
  const hasTranscript = !!call.transcript;
  const canExpand = hasSummary || hasTranscript;

  const date = call.ended_at ?? call.started_at ?? call.created_at;

  const statusBadge = (() => {
    if (call.summary_status === "completed") {
      return { label: "KI-Analyse", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (
      call.summary_status === "processing" ||
      call.transcript_status === "processing" ||
      call.recording_status === "uploading"
    ) {
      return { label: "wird verarbeitet", cls: "bg-slate-50 text-slate-600 border-slate-200" };
    }
    if (
      call.summary_status === "failed" ||
      call.transcript_status === "failed" ||
      call.recording_status === "failed"
    ) {
      return { label: "Fehler", cls: "bg-red-50 text-red-700 border-red-200" };
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex gap-3">
        <div className="rounded-lg p-2 shrink-0 bg-green-100 text-green-600">
          <Phone className="h-4 w-4" />
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
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-green-100 text-green-600 shrink-0">
              Anruf
            </span>
          </div>
          {hasSummary && summary!.outcome && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {summary!.outcome}
            </p>
          )}
          {!hasSummary && meta && (
            <p className="text-xs text-slate-500 mt-1">{meta}</p>
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
                summary!.action_items &&
                summary!.action_items.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Aufgaben
                    </p>
                    <ul className="mt-0.5 space-y-1">
                      {summary!.action_items.map(
                        (item: any, idx: number) => (
                          <li key={idx} className="text-sm text-slate-700">
                            <span className="text-slate-400">•</span>{" "}
                            {item.owner ? (
                              <span className="font-medium">{item.owner}:</span>
                            ) : null}{" "}
                            {item.task}
                          </li>
                        ),
                      )}
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
                    {call.transcript}
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
