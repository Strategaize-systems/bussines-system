"use client";

// V7.5 SLC-754 MT-3 — Preview-Result-Card fuer NL-Rule-Builder.
//
// Karte 4 in der Sequenz Sculpt -> Schema-Karte -> Trockenlauf-Karte -> Apply.
// Rendert DryRunResult von `previewNlRule()`: total_matched + Liste der Hits
// (deal/activity-Label + Datum + would-run-Actions). Quelle: V6.2 dry-run.ts (DEC-132).
//
// Pure-Render (kein State, keine Server-Action). RTL-Tests pruefen 0-Match-Empty +
// N-Match-List + Truncated-Notice.

import * as React from "react";
import { TestTube2, Calendar } from "lucide-react";

import type { DryRunResult } from "@/lib/automation/dry-run";

interface Props {
  result: DryRunResult;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PreviewResultCard({ result }: Props) {
  if (result.total_matched === 0) {
    return (
      <div
        data-testid="preview-result-card"
        data-state="empty"
        className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3"
      >
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
          <TestTube2 size={12} /> Trockenlauf
        </p>
        <p className="text-sm text-slate-700">
          In den letzten 7 Tagen waere diese Regel <strong>nicht</strong> ausgeloest worden.
          Das ist normal fuer neue Workflows — die Regel wird erst bei zukuenftigen Ereignissen aktiv.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="preview-result-card"
      data-state="hits"
      className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3"
    >
      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <TestTube2 size={12} /> Trockenlauf — letzte 7 Tage
      </p>
      <p className="text-sm text-slate-800 mb-2">
        Diese Regel haette in den letzten 7 Tagen{" "}
        <strong data-testid="preview-result-total">{result.total_matched}</strong>{" "}
        {result.total_matched === 1 ? "Mal" : "Mal"} ausgeloest und folgende Aktionen erzeugt:
      </p>
      <ul
        data-testid="preview-result-list"
        className="space-y-1.5 max-h-56 overflow-y-auto"
      >
        {result.hits.map((hit) => (
          <li
            key={hit.entity_id + "-" + hit.matched_at}
            data-testid="preview-result-hit"
            className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-800">{hit.entity_label}</span>
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar size={10} /> {formatDate(hit.matched_at)}
              </span>
            </div>
            <ul className="space-y-0.5 text-slate-700">
              {hit.would_run_actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 mt-0.5">→</span>
                  <span>{action.summary}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {result.truncated && (
        <p
          data-testid="preview-result-truncated"
          className="text-[11px] text-slate-500 mt-2 italic"
        >
          (Nur die ersten Treffer angezeigt — insgesamt {result.total_matched})
        </p>
      )}
    </div>
  );
}
