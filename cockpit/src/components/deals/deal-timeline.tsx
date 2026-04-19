import {
  Mail,
  Phone,
  MessageSquare,
  ArrowRightLeft,
  Clock,
  Calendar,
  Zap,
  Sparkles,
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

const typeConfig: Record<
  string,
  { bg: string; iconColor: string; label: string; isAI?: boolean }
> = {
  email: { bg: "bg-blue-100", iconColor: "text-blue-600", label: "E-Mail" },
  meeting: {
    bg: "bg-purple-100",
    iconColor: "text-purple-600",
    label: "Meeting",
  },
  stage_change: {
    bg: "bg-amber-100",
    iconColor: "text-amber-600",
    label: "Stage",
  },
  signal: {
    bg: "bg-orange-100",
    iconColor: "text-orange-600",
    label: "Signal",
    isAI: true,
  },
  call: { bg: "bg-green-100", iconColor: "text-green-600", label: "Anruf" },
  note: { bg: "bg-slate-100", iconColor: "text-slate-500", label: "Notiz" },
  task: { bg: "bg-slate-100", iconColor: "text-slate-500", label: "Aufgabe" },
};

const defaultConfig = {
  bg: "bg-slate-100",
  iconColor: "text-slate-500",
  label: "Aktivität",
};

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
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">
          Keine Aktivitäten vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = typeIcons[item.type] || MessageSquare;
        const config = typeConfig[item.type] || defaultConfig;
        return (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex gap-3">
              <div
                className={`rounded-lg p-2 shrink-0 ${config.bg} ${config.iconColor}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                    {item.title}
                  </p>
                  {config.isAI && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 shrink-0">
                      <Sparkles className="h-2.5 w-2.5" />
                      KI
                    </span>
                  )}
                  <span
                    className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${config.bg} ${config.iconColor}`}
                  >
                    {config.label}
                  </span>
                </div>
                {item.summary && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
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
          </div>
        );
      })}
    </div>
  );
}
