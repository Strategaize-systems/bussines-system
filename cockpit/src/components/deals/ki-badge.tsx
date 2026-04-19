"use client";

// =============================================================
// KI-Badge — Visual indicator for AI-modified deal properties
// (SLC-436, MT-3)
// =============================================================

import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export interface KIBadgeInfo {
  /** Date when the AI change was applied */
  date: string;
  /** Source type: meeting, email, or manual */
  source: string;
  /** What was changed (human-readable) */
  detail: string;
}

interface KIBadgeProps {
  info: KIBadgeInfo;
}

const sourceLabels: Record<string, string> = {
  signal_meeting: "Meeting",
  signal_email: "E-Mail",
  signal_manual: "Manuell",
  signal: "KI-Signal",
};

export function KIBadge({ info }: KIBadgeProps) {
  const sourceLabel = sourceLabels[info.source] ?? "KI";
  const dateStr = new Date(info.date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200/50 cursor-help"
        >
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span className="text-[10px] font-bold text-purple-700">KI</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs space-y-0.5">
            <div className="font-semibold">KI-Aenderung angewendet</div>
            <div>{info.detail}</div>
            <div className="text-slate-400">
              {dateStr} · Quelle: {sourceLabel}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
