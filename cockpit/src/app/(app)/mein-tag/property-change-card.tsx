"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Mail,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIActionQueueItem } from "@/types/ai-queue";
import {
  approveInsightAction,
  rejectInsightAction,
} from "@/lib/actions/insight-actions";

// ── Confidence Badge ─────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);

  if (value >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
        {pct}% Hoch
      </span>
    );
  }
  if (value >= 0.4) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
        {pct}% Mittel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
      {pct}% Niedrig
    </span>
  );
}

// ── Source icon helper ────────────────────────────────────────

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case "signal_meeting":
      return <Video size={10} className="text-blue-500" />;
    case "signal_email":
      return <Mail size={10} className="text-sky-500" />;
    default:
      return <Users size={10} className="text-slate-400" />;
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case "signal_meeting":
      return "Meeting";
    case "signal_email":
      return "E-Mail";
    case "signal_manual":
      return "Manuell";
    default:
      return "Signal";
  }
}

// ── Field label helper ───────────────────────────────────────

function fieldLabel(type: string): string {
  switch (type) {
    case "status_change":
      return "Phase";
    case "value_change":
      return "Wert";
    case "tag_change":
      return "Tag";
    case "property_change":
      return "Eigenschaft";
    default:
      return "Feld";
  }
}

// ── Main component ───────────────────────────────────────────

interface PropertyChangeCardProps {
  item: AIActionQueueItem;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export function PropertyChangeCard({
  item,
  selected,
  onSelect,
}: PropertyChangeCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const proposed = item.proposed_changes;
  const context = item.context_json as Record<string, unknown> | null;
  const dealName =
    (context?.deal_name as string) ??
    item.action_description.split('"')[1] ??
    "Deal";

  // Check if this type can actually be applied
  const canApply = item.type === "status_change" || item.type === "value_change";

  const handleApprove = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await approveInsightAction(item.id);
      if (result.success) {
        setStatus("approved");
      } else {
        setErrorMsg(result.error ?? "Fehler beim Anwenden");
      }
    });
  };

  const handleReject = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await rejectInsightAction(item.id);
      if (result.success) {
        setStatus("rejected");
      }
    });
  };

  // ── Approved state ─────────────────────────────────────────
  if (status === "approved") {
    return (
      <div className="px-4 py-3 bg-emerald-50/50 rounded-lg border border-emerald-200 flex items-center gap-2">
        <Check size={14} className="text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">
          Angewendet: {fieldLabel(item.type)}{" "}
          {proposed?.old ?? "?"} → {String(proposed?.new ?? "?")}
        </span>
      </div>
    );
  }

  // ── Rejected state ─────────────────────────────────────────
  if (status === "rejected") {
    return (
      <div className="px-4 py-3 bg-slate-50/50 rounded-lg border border-slate-200 flex items-center gap-2">
        <X size={14} className="text-slate-400" />
        <span className="text-sm text-slate-500 font-medium line-through">
          {item.action_description}
        </span>
      </div>
    );
  }

  // ── Pending state (main card) ──────────────────────────────
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/30 hover:bg-violet-50/60 transition-colors">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Checkbox for batch */}
          {onSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={(e) => onSelect(item.id, e.target.checked)}
              className="mt-1.5 h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              disabled={!canApply}
            />
          )}

          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
            <Briefcase size={14} className="text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Entity + Field */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/deals/${item.target_entity_id}`}
                className="text-sm font-bold text-slate-900 hover:text-violet-700 transition-colors"
              >
                {dealName}
              </Link>
              <span className="text-[10px] font-bold text-violet-600 bg-violet-100 rounded px-1.5 py-0.5">
                {fieldLabel(item.type)}
              </span>
            </div>

            {/* Old → New */}
            {proposed && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm text-slate-500 line-through">
                  {proposed.old != null ? String(proposed.old) : "–"}
                </span>
                <ArrowRight size={12} className="text-violet-500 shrink-0" />
                <span className="text-sm font-bold text-violet-700">
                  {String(proposed.new)}
                  {item.type === "value_change" ? " EUR" : ""}
                </span>
              </div>
            )}

            {/* Badges row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.confidence != null && (
                <ConfidenceBadge value={item.confidence} />
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                <SourceIcon source={item.source} />
                {sourceLabel(item.source)}
              </span>
              {!canApply && (
                <span className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 font-medium">
                  Feld nicht verfuegbar
                </span>
              )}
            </div>

            {/* Expandable reasoning */}
            {item.reasoning && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {expanded ? (
                  <ChevronUp size={10} />
                ) : (
                  <ChevronDown size={10} />
                )}
                {expanded ? "Begruendung ausblenden" : "Begruendung anzeigen"}
              </button>
            )}
            {expanded && item.reasoning && (
              <p className="text-xs text-slate-500 mt-1 pl-0.5 leading-relaxed border-l-2 border-violet-200 ml-0.5 pl-2">
                {item.reasoning}
              </p>
            )}

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-red-600 mt-1.5">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2.5 ml-10">
          {canApply ? (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Anwenden
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Kann nicht angewendet werden
            </span>
          )}
          <button
            onClick={handleReject}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <X size={12} />
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}
