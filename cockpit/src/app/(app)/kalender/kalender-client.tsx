"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Building2,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import type { CalendarEventRow } from "./actions";

// ── Types ────────────────────────────────────────────────────

type ViewMode = "day" | "week" | "month";

interface KalenderClientProps {
  initialEvents: CalendarEventRow[];
  initialDate: string; // ISO date string (YYYY-MM-DD)
}

// ── Helpers ──────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00–20:00

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  meeting: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  call: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  block: { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  personal: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-800" },
  other: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-700" },
};

const TYPE_LABELS: Record<string, string> = {
  meeting: "Meeting",
  call: "Call",
  block: "Block",
  personal: "Privat",
  other: "Termin",
};

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_NAMES_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function getTypeStyle(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildSubtitle(e: CalendarEventRow): string {
  const parts: string[] = [];
  if (e.contacts) parts.push(`${e.contacts.first_name} ${e.contacts.last_name}`);
  if (e.companies) parts.push(e.companies.name);
  if (e.deals) parts.push(e.deals.title);
  return parts.join(" · ");
}

// ── Event Detail Popover ─────────────────────────────────────

function EventDetail({ event, onClose }: { event: CalendarEventRow; onClose: () => void }) {
  const style = getTypeStyle(event.type);
  const sub = buildSubtitle(event);

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl border-2 border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("px-5 py-4 border-b-2", style.bg, style.border)}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold uppercase tracking-wide", style.text)}>
              {TYPE_LABELS[event.type] || "Termin"}
            </span>
            {event.source === "calcom" && (
              <span className="text-[10px] font-bold bg-white/60 rounded px-1.5 py-0.5 text-slate-600">
                Cal.com
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">{event.title}</h3>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock size={14} className="text-slate-400" />
            <span>
              {formatTime(event.start_time)} – {formatTime(event.end_time)}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin size={14} className="text-slate-400" />
              <span>{event.location}</span>
            </div>
          )}

          {event.contacts && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={14} className="text-slate-400" />
              <span>{event.contacts.first_name} {event.contacts.last_name}</span>
            </div>
          )}

          {event.companies && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 size={14} className="text-slate-400" />
              <span>{event.companies.name}</span>
            </div>
          )}

          {event.deals && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Briefcase size={14} className="text-slate-400" />
              <span>{event.deals.title}</span>
            </div>
          )}

          {event.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day View ─────────────────────────────────────────────────

function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEventRow[];
  onEventClick: (e: CalendarEventRow) => void;
}) {
  const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), date));

  return (
    <div className="flex-1 overflow-auto">
      {/* Day header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="text-center">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            {DAY_NAMES_LONG[date.getDay() === 0 ? 6 : date.getDay() - 1]}
          </div>
          <div className={cn(
            "text-2xl font-bold mt-0.5",
            isSameDay(date, new Date()) ? "text-[#4454b8]" : "text-slate-900"
          )}>
            {date.getDate()}. {MONTH_NAMES[date.getMonth()]}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="flex border-b border-slate-100" style={{ height: 64 }}>
            <div className="w-16 shrink-0 text-right pr-3 pt-1 text-[11px] font-medium text-slate-400">
              {String(hour).padStart(2, "0")}:00
            </div>
            <div className="flex-1 relative" />
          </div>
        ))}

        {/* Events overlay */}
        <div className="absolute inset-0 ml-16">
          {dayEvents.map((event) => {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const startMinutes = start.getHours() * 60 + start.getMinutes();
            const endMinutes = end.getHours() * 60 + end.getMinutes();
            const duration = Math.max(endMinutes - startMinutes, 15);
            const topOffset = (startMinutes - HOURS[0] * 60) * (64 / 60);
            const height = duration * (64 / 60);
            const style = getTypeStyle(event.type);

            if (topOffset + height < 0) return null;

            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "absolute left-1 right-4 rounded-lg border-l-4 px-3 py-1.5 text-left transition-shadow hover:shadow-md cursor-pointer overflow-hidden",
                  style.bg,
                  style.border
                )}
                style={{ top: Math.max(topOffset, 0), height: Math.max(height, 24) }}
              >
                <div className={cn("text-[11px] font-bold truncate", style.text)}>
                  {formatTime(event.start_time)} {event.title}
                </div>
                {height > 36 && (
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {buildSubtitle(event)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────

function WeekView({
  weekStart,
  events,
  onEventClick,
  onDayClick,
}: {
  weekStart: Date;
  events: CalendarEventRow[];
  onEventClick: (e: CalendarEventRow) => void;
  onDayClick: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      {/* Week header with day columns */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex">
          <div className="w-16 shrink-0" />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <button
                key={i}
                onClick={() => onDayClick(day)}
                className={cn(
                  "flex-1 text-center py-2 border-l border-slate-100 hover:bg-slate-50 transition-colors",
                  isToday && "bg-blue-50/50"
                )}
              >
                <div className="text-[10px] font-semibold text-slate-400 uppercase">{DAY_NAMES[i]}</div>
                <div className={cn(
                  "text-lg font-bold mt-0.5",
                  isToday
                    ? "w-8 h-8 mx-auto rounded-full bg-[#4454b8] text-white flex items-center justify-center text-sm"
                    : "text-slate-700"
                )}>
                  {day.getDate()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="flex border-b border-slate-100" style={{ height: 56 }}>
            <div className="w-16 shrink-0 text-right pr-3 pt-1 text-[10px] font-medium text-slate-400">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((_, i) => (
              <div key={i} className="flex-1 border-l border-slate-100 relative" />
            ))}
          </div>
        ))}

        {/* Events overlay */}
        <div className="absolute inset-0 flex ml-16">
          {days.map((day, dayIdx) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), day));

            return (
              <div key={dayIdx} className="flex-1 relative border-l border-slate-100">
                {dayEvents.map((event) => {
                  const start = new Date(event.start_time);
                  const end = new Date(event.end_time);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const endMinutes = end.getHours() * 60 + end.getMinutes();
                  const duration = Math.max(endMinutes - startMinutes, 15);
                  const topOffset = (startMinutes - HOURS[0] * 60) * (56 / 60);
                  const height = duration * (56 / 60);
                  const style = getTypeStyle(event.type);

                  if (topOffset + height < 0) return null;

                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "absolute left-0.5 right-0.5 rounded-md border-l-3 px-1.5 py-0.5 text-left transition-shadow hover:shadow-md cursor-pointer overflow-hidden",
                        style.bg,
                        style.border
                      )}
                      style={{ top: Math.max(topOffset, 0), height: Math.max(height, 20) }}
                    >
                      <div className={cn("text-[10px] font-bold truncate", style.text)}>
                        {formatTime(event.start_time)}
                      </div>
                      {height > 28 && (
                        <div className={cn("text-[10px] font-medium truncate", style.text)}>
                          {event.title}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month View ───────────────────────────────────────────────

function MonthView({
  date,
  events,
  onEventClick,
  onDayClick,
}: {
  date: Date;
  events: CalendarEventRow[];
  onEventClick: (e: CalendarEventRow) => void;
  onDayClick: (d: Date) => void;
}) {
  const today = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad to start on Monday
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalDays = startPad + lastDay.getDate();
  const totalWeeks = Math.ceil(totalDays / 7);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalWeeks * 7; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayNum));
    }
  }

  // Group events by day string
  const eventsByDay = new Map<string, CalendarEventRow[]>();
  for (const event of events) {
    const key = toDateStr(new Date(event.start_time));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-2">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border border-slate-200 rounded-xl overflow-hidden">
        {cells.map((cellDate, idx) => {
          if (!cellDate) {
            return <div key={idx} className="bg-slate-50/50 min-h-[100px] border-b border-r border-slate-100" />;
          }

          const key = toDateStr(cellDate);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = isSameDay(cellDate, today);
          const isCurrentMonth = cellDate.getMonth() === month;

          return (
            <button
              key={idx}
              onClick={() => onDayClick(cellDate)}
              className={cn(
                "min-h-[100px] p-1.5 text-left border-b border-r border-slate-100 transition-colors hover:bg-slate-50",
                !isCurrentMonth && "opacity-40",
                isToday && "bg-blue-50/40"
              )}
            >
              <div className={cn(
                "text-xs font-bold mb-1",
                isToday
                  ? "w-6 h-6 rounded-full bg-[#4454b8] text-white flex items-center justify-center text-[11px]"
                  : "text-slate-600 pl-1"
              )}>
                {cellDate.getDate()}
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const style = getTypeStyle(event.type);
                  return (
                    <div
                      key={event.id}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick(event); }}
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px] font-medium truncate cursor-pointer hover:opacity-80",
                        style.bg,
                        style.text
                      )}
                    >
                      {formatTime(event.start_time)} {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-semibold text-slate-400 pl-1">
                    +{dayEvents.length - 3} weitere
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Client Component ────────────────────────────────────

export function KalenderClient({ initialEvents, initialDate }: KalenderClientProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date(initialDate));
  const [events] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRow | null>(null);

  // Computed dates
  const weekStart = useMemo(() => getMonday(currentDate), [currentDate]);

  // Navigation
  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const switchToDay = (d: Date) => {
    setCurrentDate(d);
    setView("day");
  };

  // Title for current view
  const title = useMemo(() => {
    if (view === "day") {
      return `${currentDate.getDate()}. ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === "week") {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${weekStart.getDate()}.–${end.getDate()}. ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      }
      return `${weekStart.getDate()}. ${MONTH_NAMES[weekStart.getMonth()]} – ${end.getDate()}. ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [view, currentDate, weekStart]);

  // Event count filtered to current view
  const eventCount = useMemo(() => {
    if (view === "day") {
      return events.filter((e) => isSameDay(new Date(e.start_time), currentDate)).length;
    }
    if (view === "week") {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      return events.filter((e) => {
        const d = new Date(e.start_time);
        return d >= weekStart && d < end;
      }).length;
    }
    // month
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    return events.filter((e) => {
      const d = new Date(e.start_time);
      return d >= monthStart && d <= monthEnd;
    }).length;
  }, [events, view, currentDate, weekStart]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <PageHeader title="Kalender" subtitle={`${eventCount} Termine im aktuellen Zeitraum`}>
        {/* View Switcher */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-2 text-xs font-semibold transition-colors",
                view === v
                  ? "bg-[#4454b8] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {v === "day" ? "Tag" : v === "week" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center gap-4">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Heute
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={18} className="text-slate-500" />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-hidden bg-white">
        {view === "day" && (
          <DayView
            date={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === "week" && (
          <WeekView
            weekStart={weekStart}
            events={events}
            onEventClick={setSelectedEvent}
            onDayClick={switchToDay}
          />
        )}
        {view === "month" && (
          <MonthView
            date={currentDate}
            events={events}
            onEventClick={setSelectedEvent}
            onDayClick={switchToDay}
          />
        )}
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
