"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table2, CalendarDays } from "lucide-react";
import { TableView } from "./table-view";
import { CalendarView } from "./calendar-view";
import { EntrySheet } from "./entry-sheet";
import type { CalendarEntry } from "./actions";

interface CalendarClientProps {
  entries: CalendarEntry[];
  currentMonth: string;
}

export function CalendarClient({ entries, currentMonth: initialMonth }: CalendarClientProps) {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Redaktionskalender</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} Einträge
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              size="sm"
              variant={view === "table" ? "secondary" : "ghost"}
              className="rounded-r-none"
              onClick={() => setView("table")}
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "secondary" : "ghost"}
              className="rounded-l-none"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
          <EntrySheet />
        </div>
      </div>

      {/* View */}
      {view === "table" ? (
        <TableView entries={entries} />
      ) : (
        <CalendarView
          entries={entries}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      )}
    </div>
  );
}
