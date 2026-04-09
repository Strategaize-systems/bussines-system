import {
  Mail,
  Phone,
  MessageSquare,
  ArrowRightLeft,
  Clock,
  Calendar,
  Zap,
} from "lucide-react";
import type { Meeting } from "@/app/(app)/meetings/actions";

const typeIcons: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  stage_change: ArrowRightLeft,
  task: Clock,
  signal: Zap,
};

const typeColors: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
  meeting: "bg-purple-50 text-purple-600",
  stage_change: "bg-amber-50 text-amber-600",
  signal: "bg-orange-50 text-orange-600",
  call: "bg-green-50 text-green-600",
};

const defaultColor = "bg-slate-50 text-slate-500";

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  summary?: string;
  date: string;
}

interface DealTimelineProps {
  activities: any[];
  emails: any[];
  meetings: Meeting[];
  signals: any[];
}

export function DealTimeline({
  activities,
  emails,
  meetings,
  signals,
}: DealTimelineProps) {
  const items: TimelineItem[] = [
    ...activities.map((a: any) => ({
      id: `act-${a.id}`,
      type: a.type || "note",
      title: a.title || a.type,
      summary: a.summary || a.description,
      date: a.created_at,
    })),
    ...emails.map((e: any) => ({
      id: `email-${e.id}`,
      type: "email",
      title: e.subject || "(Kein Betreff)",
      summary: `An: ${e.to_address}`,
      date: e.sent_at || e.created_at,
    })),
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      type: "meeting",
      title: m.title,
      summary: m.location
        ? `Ort: ${m.location}`
        : m.agenda
          ? m.agenda.substring(0, 100)
          : undefined,
      date: m.scheduled_at,
    })),
    ...signals.map((s: any) => ({
      id: `signal-${s.id}`,
      type: "signal",
      title: `Signal: ${s.signal_type}`,
      summary: s.notes,
      date: s.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Keine Aktivitäten vorhanden.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = typeIcons[item.type] || MessageSquare;
        const colorClass = typeColors[item.type] || defaultColor;
        return (
          <div
            key={item.id}
            className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0"
          >
            <div className={`rounded-lg p-1.5 shrink-0 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-700">
                {item.title}
              </p>
              {item.summary && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {item.summary}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5">
                {new Date(item.date).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
