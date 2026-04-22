import { Eye, EyeOff, MousePointerClick } from "lucide-react";
import type { TrackingSummary } from "@/types/email-tracking";

interface TrackingBadgeProps {
  summary: TrackingSummary | undefined;
}

/**
 * Compact tracking badge for email lists.
 * Shows opened/not opened icon + click count.
 */
export function TrackingBadge({ summary }: TrackingBadgeProps) {
  if (!summary) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-400">
        <EyeOff size={10} />
        Nicht geöffnet
      </span>
    );
  }

  const opened = summary.open_count > 0;
  const clicked = summary.click_count > 0;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
          opened
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-400"
        }`}
      >
        {opened ? <Eye size={10} /> : <EyeOff size={10} />}
        {opened ? `${summary.open_count}× geöffnet` : "Nicht geöffnet"}
      </span>
      {clicked && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
          <MousePointerClick size={10} />
          {summary.click_count}× geklickt
        </span>
      )}
    </span>
  );
}

/**
 * Minimal tracking indicator for timeline items.
 * Just an icon + short text.
 */
export function TrackingIndicator({ summary }: TrackingBadgeProps) {
  if (!summary || summary.open_count === 0) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
      <Eye size={9} />
      {summary.open_count}
      {summary.click_count > 0 && (
        <>
          <MousePointerClick size={9} className="ml-0.5" />
          {summary.click_count}
        </>
      )}
    </span>
  );
}
