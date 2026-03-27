"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { deleteEntry, updateStatus, type CalendarEntry } from "./actions";
import { EntrySheet } from "./entry-sheet";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  review: "bg-purple-100 text-purple-800",
  published: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  review: "Review",
  published: "Veröffentlicht",
};

const STATUS_FLOW = ["planned", "in_progress", "review", "published"];

const TYPE_LABELS: Record<string, string> = {
  blog: "Blog",
  linkedin: "LinkedIn",
  newsletter: "Newsletter",
  case_study: "Case Study",
  video: "Video",
  other: "Sonstiges",
};

interface TableViewProps {
  entries: CalendarEntry[];
}

export function TableView({ entries }: TableViewProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusAdvance = (id: string, currentStatus: string) => {
    const currentIdx = STATUS_FLOW.indexOf(currentStatus);
    if (currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1];
      startTransition(async () => {
        await updateStatus(id, nextStatus);
      });
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteEntry(id);
    });
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Keine Einträge gefunden.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">Titel</th>
            <th className="px-3 py-2 text-left font-medium">Typ</th>
            <th className="px-3 py-2 text-left font-medium">Kanal</th>
            <th className="px-3 py-2 text-left font-medium">Datum</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{entry.title}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {TYPE_LABELS[entry.content_type] || entry.content_type}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {entry.channel || "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground tabular-nums">
                {entry.planned_date
                  ? new Date(entry.planned_date).toLocaleDateString("de-DE")
                  : "—"}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleStatusAdvance(entry.id, entry.status)}
                  disabled={isPending || entry.status === "published"}
                  className="cursor-pointer disabled:cursor-default"
                  title={entry.status !== "published" ? `Weiter → ${STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(entry.status) + 1]] || ""}` : ""}
                >
                  <Badge
                    variant="secondary"
                    className={`${STATUS_COLORS[entry.status] || ""} text-xs`}
                  >
                    {STATUS_LABELS[entry.status] || entry.status}
                  </Badge>
                </button>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <EntrySheet
                    entry={entry}
                    trigger={
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
