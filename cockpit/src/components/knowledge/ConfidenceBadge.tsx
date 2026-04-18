"use client";

import type { ConfidenceLevel } from "@/lib/knowledge/search";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

const config: Record<ConfidenceLevel, { label: string; bg: string; text: string; tooltip: string }> = {
  high: {
    label: "Hohe Relevanz",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    tooltip: "Die gefundenen Quellen beantworten die Frage direkt.",
  },
  medium: {
    label: "Mittlere Relevanz",
    bg: "bg-amber-100",
    text: "text-amber-700",
    tooltip: "Die Quellen enthalten verwandte Informationen, aber keine direkte Antwort.",
  },
  low: {
    label: "Geringe Relevanz",
    bg: "bg-slate-100",
    text: "text-slate-500",
    tooltip: "Keine der Quellen scheint die Frage direkt zu beantworten.",
  },
};

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const c = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
      title={c.tooltip}
    >
      {c.label}
    </span>
  );
}
