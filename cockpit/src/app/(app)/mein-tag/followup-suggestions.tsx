"use client";

import { useState, useTransition } from "react";
import {
  Lightbulb,
  Check,
  Clock,
  X,
  Briefcase,
  Mail,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIActionQueueItem } from "@/types/ai-queue";
import {
  approveFollowup,
  postponeFollowup,
  rejectFollowup,
} from "./followup-actions";

interface FollowupSuggestionsProps {
  suggestions: AIActionQueueItem[];
  embedded?: boolean;
}

export function FollowupSuggestions({ suggestions, embedded }: FollowupSuggestionsProps) {
  if (suggestions.length === 0) return null;

  // Embedded mode: just the list, no card wrapper (used inside KI Workspace tab)
  if (embedded) {
    return (
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <FollowupItem key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Lightbulb size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            KI-Wiedervorlagen
          </h3>
          <p className="text-[11px] text-amber-600">
            {suggestions.length} Vorschl{suggestions.length === 1 ? "ag" : "äge"}
          </p>
        </div>
      </div>
      <div className="divide-y divide-amber-50">
        {suggestions.map((suggestion) => (
          <FollowupItem key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>
    </div>
  );
}

function FollowupItem({ suggestion }: { suggestion: AIActionQueueItem }) {
  const [status, setStatus] = useState<
    "pending" | "approved" | "postponed" | "rejected"
  >("pending");
  const [isPending, startTransition] = useTransition();

  const entityIcons: Record<string, typeof Briefcase> = {
    deal: Briefcase,
    email_message: Mail,
    contact: Users,
    company: Users,
  };
  const EntityIcon = entityIcons[suggestion.entity_type] ?? Briefcase;

  const priorityColors: Record<string, string> = {
    dringend: "bg-red-100 text-red-700",
    normal: "bg-blue-100 text-blue-700",
    niedrig: "bg-slate-100 text-slate-500",
  };

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveFollowup(suggestion.id);
      if (!result.error) setStatus("approved");
    });
  };

  const handlePostpone = () => {
    startTransition(async () => {
      const result = await postponeFollowup(suggestion.id);
      if (!result.error) setStatus("postponed");
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectFollowup(suggestion.id);
      if (!result.error) setStatus("rejected");
    });
  };

  if (status === "approved") {
    return (
      <div className="px-5 py-3 bg-emerald-50/50 flex items-center gap-2">
        <Check size={14} className="text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">
          Aufgabe erstellt
        </span>
      </div>
    );
  }

  if (status === "postponed") {
    return (
      <div className="px-5 py-3 bg-blue-50/50 flex items-center gap-2">
        <Clock size={14} className="text-blue-600" />
        <span className="text-sm text-blue-700 font-medium">
          Verschoben (3 Tage)
        </span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="px-5 py-3 bg-slate-50/50 flex items-center gap-2">
        <X size={14} className="text-slate-400" />
        <span className="text-sm text-slate-500 font-medium line-through">
          Abgelehnt
        </span>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 hover:bg-amber-50/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <EntityIcon size={14} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">
            {suggestion.action_description}
          </p>
          {suggestion.reasoning && (
            <p className="text-xs text-slate-500 mt-0.5">
              {suggestion.reasoning}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                priorityColors[suggestion.priority] ??
                  "bg-slate-100 text-slate-500"
              )}
            >
              {suggestion.priority === "dringend"
                ? "Dringend"
                : suggestion.priority === "niedrig"
                  ? "Niedrig"
                  : "Normal"}
            </span>
          </div>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-2 ml-10">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50"
        >
          <Check size={12} />
          Freigeben
        </button>
        <button
          onClick={handlePostpone}
          disabled={isPending}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-[11px] font-bold hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          <Clock size={12} />
          Verschieben
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <X size={12} />
          Abbrechen
        </button>
      </div>
    </div>
  );
}
