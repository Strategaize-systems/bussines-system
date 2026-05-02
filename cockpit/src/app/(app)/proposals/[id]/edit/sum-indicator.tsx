"use client";

import { Check, AlertTriangle } from "lucide-react";

import type { PaymentMilestone } from "@/types/proposal-payment";

// V5.6 SLC-563 — Live-Summen-Indikator (DEC-115 strict 100%).
// Reactive, kein Debounce — User sieht Diff sofort waehrend des Tippens.

type Props = {
  milestones: Pick<PaymentMilestone, "percent">[];
};

export function SumIndicator({ milestones }: Props) {
  const sum = milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
  const rounded = Number(sum.toFixed(2));
  const ok = rounded === 100;
  const diff = Number((100 - rounded).toFixed(2));

  if (ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        {rounded.toFixed(2)}% — gueltig
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"
      role="status"
    >
      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
      {rounded.toFixed(2)}%
      {diff > 0
        ? ` — fehlt ${diff.toFixed(2)}%`
        : ` — ueberschreitet um ${(-diff).toFixed(2)}%`}
    </span>
  );
}
