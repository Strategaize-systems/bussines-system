"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Lock,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KPICard, KPIGrid } from "@/components/ui/kpi-card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import { EventSheet } from "@/components/calendar/event-sheet";
import { deleteMeeting, type Meeting } from "../meetings/actions";
import {
  deleteCalendarEvent,
  type CalendarEvent,
} from "./actions";
import Link from "next/link";

const typeConfig: Record<
  string,
  { label: string; variant: string; icon: typeof Calendar }
> = {
  meeting: {
    label: "Meeting",
    variant: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Users,
  },
  call: {
    label: "Anruf",
    variant: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Phone,
  },
  block: {
    label: "Blockzeit",
    variant: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Lock,
  },
  personal: {
    label: "Persönlich",
    variant: "bg-green-100 text-green-700 border-green-200",
    icon: Calendar,
  },
  other: {
    label: "Sonstiges",
    variant: "bg-slate-100 text-slate-600 border-slate-200",
    icon: MoreHorizontal,
  },
};

const meetingStatusConfig: Record<string, { label: string; variant: string }> = {
  planned: {
    label: "Geplant",
    variant: "bg-blue-100 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Durchgeführt",
    variant: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Abgesagt",
    variant: "bg-red-100 text-red-700 border-red-200",
  },
};

// Unified item type for the list
type TerminItem =
  | { kind: "meeting"; data: Meeting; sortTime: string }
  | { kind: "event"; data: CalendarEvent; sortTime: string };

interface TermineClientProps {
  meetings: Meeting[];
  events: CalendarEvent[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

function groupByDay(items: TerminItem[]): Record<string, TerminItem[]> {
  const groups: Record<string, TerminItem[]> = {};
  for (const item of items) {
    const day = item.sortTime.slice(0, 10); // YYYY-MM-DD
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  }
  return groups;
}

function formatDayHeading(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const formatted = d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (isToday) return `Heute — ${formatted}`;
  if (isTomorrow) return `Morgen — ${formatted}`;
  return formatted;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TermineClient({
  meetings,
  events,
  contacts,
  companies,
  deals,
}: TermineClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  // Unify meetings + standalone events into a single sorted list
  const allItems = useMemo(() => {
    const items: TerminItem[] = [];

    // Add meetings
    for (const m of meetings) {
      items.push({ kind: "meeting", data: m, sortTime: m.scheduled_at });
    }

    // Add calendar events that are NOT linked to a meeting
    // (meeting-linked events are shown via the meeting entry)
    for (const e of events) {
      if (!e.meeting_id) {
        items.push({ kind: "event", data: e, sortTime: e.start_time });
      }
    }

    // Sort ascending by time
    items.sort(
      (a, b) =>
        new Date(a.sortTime).getTime() - new Date(b.sortTime).getTime()
    );

    return items;
  }, [meetings, events]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = allItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const title =
          item.kind === "meeting" ? item.data.title : item.data.title;
        return title.toLowerCase().includes(q);
      });
    }

    if (typeFilter) {
      result = result.filter((item) => {
        if (typeFilter === "meeting") return item.kind === "meeting";
        if (item.kind === "event") return item.data.type === typeFilter;
        return false;
      });
    }

    return result;
  }, [allItems, searchQuery, typeFilter]);

  const grouped = groupByDay(filtered);
  const sortedDays = Object.keys(grouped).sort();

  // KPI stats
  const totalMeetings = meetings.length;
  const plannedMeetings = meetings.filter(
    (m) => m.status === "planned"
  ).length;
  const totalEvents = events.filter((e) => !e.meeting_id).length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Termine"
        subtitle={`${totalMeetings} Meetings, ${totalEvents} Events`}
      >
        <button
          onClick={() => setShowNewEvent(true)}
          className="px-5 py-2.5 rounded-lg border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Neues Event
        </button>
        <button
          onClick={() => setShowNewMeeting(true)}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00a84f] to-[#4dcb8b] text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Neues Meeting
        </button>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* KPI Cards */}
          <KPIGrid columns={3}>
            <KPICard
              label="Meetings gesamt"
              value={totalMeetings}
              icon={Users}
              gradient="blue"
              href="/termine"
            />
            <KPICard
              label="Geplant"
              value={plannedMeetings}
              icon={Calendar}
              gradient="green"
              href="/termine"
            />
            <KPICard
              label="Events"
              value={totalEvents}
              icon={Clock}
              gradient="yellow"
              href="/termine"
            />
          </KPIGrid>

          {/* Filter Bar */}
          <FilterBar
            searchPlaceholder="Termine durchsuchen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          >
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "", label: "Alle Typen" },
                { value: "meeting", label: "Meetings" },
                { value: "call", label: "Anrufe" },
                { value: "block", label: "Blockzeit" },
                { value: "personal", label: "Persönlich" },
                { value: "other", label: "Sonstiges" },
              ]}
            />
          </FilterBar>

          {/* Timeline grouped by day */}
          {sortedDays.length > 0 ? (
            <div className="space-y-6">
              {sortedDays.map((day) => (
                <div key={day}>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
                    {formatDayHeading(day)}
                  </h2>
                  <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100">
                    {grouped[day].map((item) =>
                      item.kind === "meeting" ? (
                        <MeetingRow
                          key={`m-${item.data.id}`}
                          meeting={item.data}
                          contacts={contacts}
                          companies={companies}
                          deals={deals}
                        />
                      ) : (
                        <EventRow
                          key={`e-${item.data.id}`}
                          event={item.data}
                          contacts={contacts}
                          companies={companies}
                          deals={deals}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
              <Calendar
                size={40}
                className="mx-auto text-slate-300 mb-3"
              />
              <p className="text-sm font-medium text-slate-500">
                Keine Termine gefunden
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Sheets for new meeting / event */}
      {showNewMeeting && (
        <MeetingSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setShowNewMeeting(false);
          }}
        />
      )}
      {showNewEvent && (
        <EventSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setShowNewEvent(false);
          }}
        />
      )}
    </div>
  );
}

// ── Row Components ──────────────────────────────────────────────────

function MeetingRow({
  meeting,
  contacts,
  companies,
  deals,
}: {
  meeting: Meeting;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const status = meetingStatusConfig[meeting.status] ?? meetingStatusConfig.planned;

  const handleDelete = () => {
    if (!confirm("Meeting wirklich löschen?")) return;
    startTransition(async () => {
      await deleteMeeting(meeting.id);
    });
  };

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
        <Users size={18} strokeWidth={2} />
      </div>

      {/* Time */}
      <div className="shrink-0 w-14 text-right">
        <span className="text-sm font-bold text-slate-700">
          {formatTime(meeting.scheduled_at)}
        </span>
      </div>

      {/* Title + Badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 truncate">
            {meeting.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${status.variant}`}
          >
            {status.label}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-100 text-blue-700 border-blue-200">
            Meeting
          </span>
          {meeting.duration_minutes && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock size={10} />
              {meeting.duration_minutes} Min
            </span>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="shrink-0 w-32 text-right">
        {meeting.location && (
          <span className="text-xs text-slate-500 flex items-center gap-1 justify-end">
            <MapPin size={10} />
            {meeting.location}
          </span>
        )}
      </div>

      {/* Linked Company */}
      <div className="shrink-0">
        {meeting.companies ? (
          <Link
            href={`/companies/${meeting.companies.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {meeting.companies.name}
          </Link>
        ) : (
          <span className="text-xs text-slate-300">--</span>
        )}
      </div>

      {/* Contact */}
      <div className="shrink-0 w-28 text-right">
        {meeting.contacts ? (
          <span className="text-xs font-medium text-slate-600">
            {meeting.contacts.first_name} {meeting.contacts.last_name}
          </span>
        ) : (
          <span className="text-xs text-slate-300">--</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <MeetingSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          meeting={meeting}
          trigger={
            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Pencil size={14} />
            </button>
          }
        />
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function EventRow({
  event,
  contacts,
  companies,
  deals,
}: {
  event: CalendarEvent;
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const typeInfo = typeConfig[event.type] ?? typeConfig.other;
  const TypeIcon = typeInfo.icon;

  const handleDelete = () => {
    if (!confirm("Event wirklich löschen?")) return;
    startTransition(async () => {
      await deleteCalendarEvent(event.id);
    });
  };

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeInfo.variant}`}
      >
        <TypeIcon size={18} strokeWidth={2} />
      </div>

      {/* Time */}
      <div className="shrink-0 w-14 text-right">
        <span className="text-sm font-bold text-slate-700">
          {formatTime(event.start_time)}
        </span>
      </div>

      {/* Title + Badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 truncate">
            {event.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${typeInfo.variant}`}
          >
            {typeInfo.label}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <Clock size={10} />
            {formatTime(event.start_time)} – {formatTime(event.end_time)}
          </span>
        </div>
      </div>

      {/* Location */}
      <div className="shrink-0 w-32 text-right">
        {event.location && (
          <span className="text-xs text-slate-500 flex items-center gap-1 justify-end">
            <MapPin size={10} />
            {event.location}
          </span>
        )}
      </div>

      {/* Linked Company */}
      <div className="shrink-0">
        {event.companies ? (
          <Link
            href={`/companies/${event.companies.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {event.companies.name}
          </Link>
        ) : (
          <span className="text-xs text-slate-300">--</span>
        )}
      </div>

      {/* Contact */}
      <div className="shrink-0 w-28 text-right">
        {event.contacts ? (
          <span className="text-xs font-medium text-slate-600">
            {event.contacts.first_name} {event.contacts.last_name}
          </span>
        ) : (
          <span className="text-xs text-slate-300">--</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <EventSheet
          contacts={contacts}
          companies={companies}
          deals={deals}
          event={event}
          trigger={
            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Pencil size={14} />
            </button>
          }
        />
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
