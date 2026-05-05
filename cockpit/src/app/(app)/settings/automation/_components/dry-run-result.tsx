"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DryRunResult } from "@/lib/automation/dry-run";

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "gerade eben";
  if (ms < 3_600_000) return `vor ${Math.floor(ms / 60_000)} Min.`;
  if (ms < 86_400_000) return `vor ${Math.floor(ms / 3_600_000)} Std.`;
  return `vor ${Math.floor(ms / 86_400_000)} Tagen`;
}

export function DryRunResultView({ result }: { result: DryRunResult }) {
  if (result.total_matched === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
        <p className="text-sm font-medium text-slate-900">
          Keine Treffer in den letzten 30 Tagen
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Pruefe ob Trigger und Bedingungen so eng sind, dass sie keine
          historischen Daten gematcht haetten. Quell-Datensaetze gepruefT:{" "}
          {result.source_count}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
        Letzte 30 Tage haetten <strong>{result.total_matched}</strong>{" "}
        Treffer ergeben (von {result.source_count} pruefBaren Datensaetzen).
        {result.truncated
          ? ` Liste auf ${result.hits.length} Eintraege begrenzt.`
          : ""}
      </div>
      <div className="space-y-2">
        {result.hits.map((hit, i) => (
          <div
            key={`${hit.entity_id}-${i}`}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {hit.entity_label}
                </p>
                <p className="text-xs text-slate-500">
                  {relTime(hit.matched_at)}
                </p>
              </div>
              {hit.entity_url ? (
                <Link
                  href={hit.entity_url}
                  className="text-xs text-amber-700 hover:underline inline-flex items-center gap-1 shrink-0"
                  target="_blank"
                >
                  Oeffnen
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
            <ul className="mt-2 space-y-1">
              {hit.would_run_actions.map((a, j) => (
                <li key={j} className="text-xs text-slate-600">
                  • {a.summary}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {result.truncated ? (
          <p className="text-xs text-slate-500 italic">
            + {result.total_matched - result.hits.length} weitere Eintraege
            (nicht angezeigt)
          </p>
        ) : null}
      </div>
    </div>
  );
}
