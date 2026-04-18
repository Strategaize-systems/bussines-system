"use client";

import { Video, Mail, FileEdit, FileText } from "lucide-react";
import type { RAGSource } from "@/lib/knowledge/search";

interface KnowledgeSourceCardProps {
  source: RAGSource;
}

const typeConfig: Record<string, { icon: typeof Video; label: string }> = {
  meeting: { icon: Video, label: "Meeting" },
  email: { icon: Mail, label: "E-Mail" },
  deal_activity: { icon: FileEdit, label: "Aktivitaet" },
  document: { icon: FileText, label: "Dokument" },
};

const relevanceColors: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function KnowledgeSourceCard({ source }: KnowledgeSourceCardProps) {
  const tc = typeConfig[source.type] ?? { icon: FileText, label: source.type };
  const Icon = tc.icon;
  const relClass = relevanceColors[source.relevance] ?? relevanceColors.low;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      {/* Header: Number + Type + Relevance */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#4454b8]/10 text-[10px] font-bold text-[#4454b8] shrink-0">
          {source.index}
        </span>
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-600">{tc.label}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${relClass}`}>
          {source.relevance === "high" ? "hoch" : source.relevance === "medium" ? "mittel" : "niedrig"}
        </span>
      </div>

      {/* Title + Date */}
      {(source.title || source.date) && (
        <div className="flex items-baseline gap-2">
          {source.title && (
            <span className="text-sm font-medium text-slate-800 truncate">{source.title}</span>
          )}
          {source.date && (
            <span className="text-xs text-slate-400 shrink-0">{formatDate(source.date)}</span>
          )}
        </div>
      )}

      {/* Snippet */}
      {source.snippet && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
          {source.snippet}...
        </p>
      )}

      {/* Link to original */}
      {source.sourceUrl && (
        <a
          href={source.sourceUrl}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#4454b8] hover:underline"
        >
          Zum Original
        </a>
      )}
    </div>
  );
}
