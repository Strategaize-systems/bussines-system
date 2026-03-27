"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EntrySheet } from "./entry-sheet";
import type { CalendarEntry } from "./actions";

const TYPE_COLORS: Record<string, string> = {
  blog: "bg-blue-500",
  linkedin: "bg-indigo-500",
  newsletter: "bg-purple-500",
  case_study: "bg-amber-500",
  video: "bg-red-500",
  other: "bg-gray-400",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

interface CalendarViewProps {
  entries: CalendarEntry[];
  currentMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

export function CalendarView({ entries, currentMonth, onMonthChange }: CalendarViewProps) {
  const [year, month] = currentMonth.split("-").map(Number);

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const d = new Date(year, month, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const today = new Date().toISOString().split("T")[0];

  // Group entries by date
  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    if (entry.planned_date) {
      const key = entry.planned_date;
      if (!entriesByDate.has(key)) entriesByDate.set(key, []);
      entriesByDate.get(key)!.push(entry);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTHS[month - 1]} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-t border-l">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="border-r border-b bg-muted/30 min-h-20" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDate.get(dateStr) || [];
          const isToday = dateStr === today;

          return (
            <div
              key={i}
              className={`border-r border-b min-h-20 p-1 ${isToday ? "bg-primary/5" : ""}`}
            >
              <span
                className={`text-xs tabular-nums ${
                  isToday ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEntries.slice(0, 3).map((entry) => (
                  <EntrySheet
                    key={entry.id}
                    entry={entry}
                    trigger={
                      <div
                        className={`${TYPE_COLORS[entry.content_type] || TYPE_COLORS.other} text-white text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer`}
                        title={entry.title}
                      >
                        {entry.title}
                      </div>
                    }
                  />
                ))}
                {dayEntries.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayEntries.length - 3} mehr
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
