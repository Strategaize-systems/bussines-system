import { Eye, MousePointerClick, Clock, ExternalLink } from "lucide-react";
import type { TrackingSummary } from "@/types/email-tracking";

interface TrackingDetailProps {
  summary: TrackingSummary | undefined;
}

/**
 * Detailed tracking view for email detail / expandable row.
 * Shows open count, click count, timestamps, and clicked links.
 */
export function TrackingDetail({ summary }: TrackingDetailProps) {
  if (!summary) {
    return (
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400 italic">
          Keine Tracking-Daten verfügbar
        </p>
      </div>
    );
  }

  const opened = summary.open_count > 0;

  return (
    <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 space-y-2">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
        Tracking
      </p>

      {/* Open stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Eye
            size={13}
            className={opened ? "text-emerald-600" : "text-slate-300"}
          />
          <span
            className={`text-xs font-semibold ${
              opened ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            {opened
              ? `${summary.open_count}× geöffnet`
              : "Nicht geöffnet"}
          </span>
        </div>

        {summary.click_count > 0 && (
          <div className="flex items-center gap-1.5">
            <MousePointerClick size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">
              {summary.click_count}× Link geklickt
            </span>
          </div>
        )}
      </div>

      {/* Timestamps */}
      {opened && (
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          {summary.first_opened_at && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Erste Öffnung:{" "}
              {new Date(summary.first_opened_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {summary.last_opened_at &&
            summary.last_opened_at !== summary.first_opened_at && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Letzte Öffnung:{" "}
                {new Date(summary.last_opened_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
        </div>
      )}

      {/* Clicked links */}
      {summary.clicked_links.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Geklickte Links
          </p>
          {summary.clicked_links.map((link, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-slate-600"
            >
              <ExternalLink size={10} className="text-blue-500 shrink-0" />
              <span className="truncate flex-1">{link.url}</span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {link.count}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
