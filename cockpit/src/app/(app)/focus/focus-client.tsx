"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  SkipForward,
  Mail,
  Calendar,
  ListTodo,
  Kanban,
  AlertTriangle,
  CalendarClock,
  Building2,
  Users,
  Briefcase,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { TaskSheet } from "../aufgaben/task-sheet";
import { EmailSheet } from "../emails/email-sheet";
import { MeetingSheet } from "@/components/meetings/meeting-sheet";
import {
  completeTaskFromFocus,
  completeDealActionFromFocus,
  type FocusItem,
} from "./actions";

interface FocusClientProps {
  initialItems: FocusItem[];
  contacts: { id: string; first_name: string; last_name: string }[];
  companies: { id: string; name: string }[];
  deals: { id: string; title: string }[];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const priorityLabels: Record<string, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

export function FocusClient({ initialItems, contacts, companies, deals }: FocusClientProps) {
  const [items, setItems] = useState(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const current = items[currentIndex] ?? null;
  const remaining = items.length - currentIndex;

  const handleComplete = () => {
    if (!current) return;
    startTransition(async () => {
      if (current.sourceType === "task") {
        await completeTaskFromFocus(current.sourceId);
      } else {
        await completeDealActionFromFocus(current.sourceId);
      }
      setCompletedCount((c) => c + 1);
      // Remove completed item and stay at same index (next item slides in)
      setItems((prev) => prev.filter((_, i) => i !== currentIndex));
    });
  };

  const handleSkip = () => {
    if (!current) return;
    // Move current item to end
    setItems((prev) => {
      const skipped = prev[currentIndex];
      const rest = prev.filter((_, i) => i !== currentIndex);
      return [...rest, skipped];
    });
  };

  const Icon = current
    ? current.sourceType === "task"
      ? current.taskType === "follow_up"
        ? CalendarClock
        : ListTodo
      : Kanban
    : CheckCircle2;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Focus View"
        subtitle="Aktionen abarbeiten — eine nach der anderen"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
          <CheckCircle2 size={14} />
          {completedCount} erledigt
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
          {remaining} offen
        </span>
      </PageHeader>

      <main className="px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {!current ? (
            /* Empty state */
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Alles erledigt!</h2>
              <p className="text-sm text-slate-500 mb-6">
                {completedCount > 0
                  ? `${completedCount} Aktion${completedCount !== 1 ? "en" : ""} abgearbeitet. Gut gemacht!`
                  : "Keine offenen Aktionen in der Queue."}
              </p>
              <Link
                href="/mein-tag"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4454b8] text-white text-sm font-bold hover:bg-[#120774] transition-colors"
              >
                Zurueck zu Mein Tag <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${items.length > 0 ? (completedCount / (completedCount + items.length)) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {currentIndex + 1}/{items.length}
                </span>
              </div>

              {/* Current Focus Card */}
              <div className={cn(
                "bg-white rounded-2xl border-2 shadow-lg overflow-hidden",
                current.isOverdue ? "border-red-300" : "border-slate-200"
              )}>
                {/* Header */}
                <div className={cn(
                  "px-6 py-4 flex items-center gap-3",
                  current.isOverdue ? "bg-red-50" : "bg-slate-50"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    current.isOverdue
                      ? "bg-red-100 text-red-600"
                      : current.taskType === "follow_up"
                      ? "bg-purple-100 text-purple-600"
                      : current.sourceType === "deal_action"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-100 text-[#4454b8]"
                  )}>
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {current.isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle size={10} /> Ueberfaellig
                        </span>
                      )}
                      {current.taskType === "follow_up" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          Wiedervorlage
                        </span>
                      )}
                      {current.priority && (
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border",
                          priorityColors[current.priority]
                        )}>
                          {priorityLabels[current.priority] ?? current.priority}
                        </span>
                      )}
                      {current.sourceType === "deal_action" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Deal-Aktion
                        </span>
                      )}
                    </div>
                    {current.dueDate && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Faellig: {new Date(current.dueDate + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">{current.title}</h2>
                  {current.description && (
                    <p className="text-sm text-slate-500 mb-4">{current.description}</p>
                  )}

                  {/* Context chips */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {current.dealTitle && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                        <Briefcase size={12} /> {current.dealTitle}
                      </span>
                    )}
                    {current.contactName && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
                        <Users size={12} /> {current.contactName}
                      </span>
                    )}
                    {current.companyName && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                        <Building2 size={12} /> {current.companyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    {/* Primary: Complete */}
                    <Button
                      onClick={handleComplete}
                      disabled={isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Erledigt
                    </Button>

                    {/* Skip */}
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                      disabled={isPending}
                    >
                      <SkipForward className="mr-2 h-4 w-4" />
                      Ueberspringen
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quick:</span>
                    <EmailSheet
                      contactId={current.contactId ?? undefined}
                      companyId={current.companyId ?? undefined}
                      dealId={current.dealId ?? undefined}
                      trigger={
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                          <Mail size={12} /> E-Mail
                        </button>
                      }
                    />
                    <MeetingSheet
                      contacts={contacts}
                      companies={companies}
                      deals={deals}
                      defaultContactId={current.contactId ?? undefined}
                      defaultCompanyId={current.companyId ?? undefined}
                      defaultDealId={current.dealId ?? undefined}
                      trigger={
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                          <Calendar size={12} /> Meeting
                        </button>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Upcoming queue preview */}
              {items.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Naechste Aktionen</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {items.slice(currentIndex + 1, currentIndex + 4).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center shrink-0",
                          item.isOverdue ? "bg-red-100 text-red-500" : "bg-slate-100 text-slate-400"
                        )}>
                          {item.sourceType === "task" ? <ListTodo size={12} /> : <Kanban size={12} />}
                        </div>
                        <span className="text-xs text-slate-600 truncate flex-1">{item.title}</span>
                        {item.dueDate && (
                          <span className={cn(
                            "text-[10px] font-bold shrink-0",
                            item.isOverdue ? "text-red-500" : "text-slate-400"
                          )}>
                            {new Date(item.dueDate + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
