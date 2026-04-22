"use client";

import {
  Mail,
  MailOpen,
  Phone,
  MessageSquare,
  ArrowRightLeft,
  Clock,
  Calendar,
  Zap,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrackingIndicator } from "@/components/email/tracking-badge";
import type { TrackingSummary } from "@/types/email-tracking";

const typeIcons: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  inbox: MailOpen,
  meeting: Calendar,
  stage_change: ArrowRightLeft,
  task: Clock,
  signal: Zap,
  proposal: FileText,
};

const typeColors: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
  inbox: "bg-indigo-50 text-indigo-600",
  meeting: "bg-purple-50 text-purple-600",
  stage_change: "bg-amber-50 text-amber-600",
  signal: "bg-orange-50 text-orange-600",
  call: "bg-green-50 text-green-600",
  proposal: "bg-pink-50 text-pink-600",
  task: "bg-slate-50 text-slate-500",
  note: "bg-slate-50 text-slate-500",
};

const typeLabels: Record<string, string> = {
  note: "Notiz",
  call: "Anruf",
  email: "E-Mail",
  inbox: "Empfangen",
  meeting: "Meeting",
  stage_change: "Stage",
  task: "Aufgabe",
  signal: "Signal",
  proposal: "Angebot",
};

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  summary?: string;
  date: string;
  emailId?: string;
}

interface UnifiedTimelineProps {
  activities: any[];
  emails: any[];
  meetings: any[];
  signals: any[];
  proposals: any[];
  inboxEmails?: any[];
  trackingSummaries?: Record<string, TrackingSummary>;
}

export function UnifiedTimeline({
  activities,
  emails,
  meetings,
  signals,
  proposals,
  inboxEmails = [],
  trackingSummaries = {},
}: UnifiedTimelineProps) {
  const [filterType, setFilterType] = useState<string>("all");

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
      summary: `${e.direction === "inbound" ? "Von" : "An"}: ${e.direction === "inbound" ? e.from_address : e.to_address}`,
      date: e.sent_at || e.created_at,
      emailId: e.id,
    })),
    ...meetings.map((m: any) => ({
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
      title: `Signal: ${s.signal_type?.replace(/_/g, " ")}`,
      summary: s.description,
      date: s.created_at,
    })),
    ...proposals.map((p: any) => ({
      id: `proposal-${p.id}`,
      type: "proposal",
      title: p.title || "Angebot",
      summary: [
        p.status && `Status: ${p.status}`,
        p.price_range && `Wert: ${p.price_range}`,
        p.deals?.title && `Deal: ${p.deals.title}`,
      ].filter(Boolean).join(" · "),
      date: p.sent_at || p.created_at,
    })),
    ...inboxEmails.map((e: any) => ({
      id: `inbox-${e.id}`,
      type: "inbox",
      title: e.subject || "(Kein Betreff)",
      summary: `Von: ${e.from_name || e.from_address}`,
      date: e.received_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeTypes = [...new Set(items.map((i) => i.type))];
  const filtered = filterType === "all" ? items : items.filter((i) => i.type === filterType);

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Keine Aktivitäten vorhanden.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Type filter chips */}
      {activeTypes.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors",
              filterType === "all"
                ? "bg-[#4454b8] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            Alle ({items.length})
          </button>
          {activeTypes.map((type) => {
            const count = items.filter((i) => i.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors",
                  filterType === type
                    ? "bg-[#4454b8] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {typeLabels[type] || type} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline items */}
      <div className="space-y-1">
        {filtered.map((item) => {
          const Icon = typeIcons[item.type] || MessageSquare;
          const colorClass = typeColors[item.type] || "bg-slate-50 text-slate-500";
          const tracking = item.emailId
            ? trackingSummaries[item.emailId]
            : undefined;
          return (
            <div
              key={item.id}
              className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0"
            >
              <div className={`rounded-lg p-1.5 shrink-0 ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-slate-700 truncate">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {typeLabels[item.type] || item.type}
                  </span>
                  {tracking && <TrackingIndicator summary={tracking} />}
                </div>
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
    </div>
  );
}
