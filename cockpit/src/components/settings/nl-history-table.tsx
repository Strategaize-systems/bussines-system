// SLC-756 MT-1 — minimaler Compile-Stub. MT-2 ersetzt mit Filter-Dropdowns,
// Status-Badges (green/amber/red), NL-Input-Truncate-mit-Tooltip und
// shadcn-Table-Render. Bis dahin Plain-Render damit page.tsx compilet.

"use client";

import type { EnrichedNlHistoryRow } from "@/app/(app)/settings/workflow-automation/nl-history/page";

interface NlHistoryTableProps {
  rows: EnrichedNlHistoryRow[];
}

export function NlHistoryTable({ rows }: NlHistoryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Noch keine NL-Sculpt-Versuche vorhanden.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs text-slate-500">
        {rows.length} Eintrag{rows.length === 1 ? "" : "e"} (Stub — MT-2 ergaenzt Filter + Badges + Truncate)
      </p>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-4">Datum</th>
            <th className="py-2 pr-4">User</th>
            <th className="py-2 pr-4">NL-Input</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4 text-right">Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.audit_log_id} className="border-b border-slate-100">
              <td className="py-2 pr-4 text-slate-700">
                {new Date(r.created_at).toLocaleString("de-DE")}
              </td>
              <td className="py-2 pr-4 text-slate-700">{r.actor_email}</td>
              <td className="py-2 pr-4 text-slate-700">
                {r.nl_input.length > 80 ? `${r.nl_input.slice(0, 80)}…` : r.nl_input}
              </td>
              <td className="py-2 pr-4 text-slate-700">{r.result_status}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-slate-700">
                {r.sculptor_cost_usd.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
