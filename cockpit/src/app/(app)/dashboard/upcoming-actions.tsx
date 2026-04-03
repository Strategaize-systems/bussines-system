import { cn } from "@/lib/utils";
import { CalendarClock, AlertTriangle } from "lucide-react";
import type { UpcomingAction } from "./actions";

interface UpcomingActionsProps {
  actions: UpcomingAction[];
}

export function UpcomingActions({ actions }: UpcomingActionsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgb(0 0 0 / 0.1)" }}
    >
      <div className="h-1 bg-gradient-to-r from-[#f2b705] to-[#ffd54f]" />
      <div className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Nächste Aktionen</h3>
        {actions.length > 0 ? (
          <div className="space-y-3">
            {actions.map((a) => (
              <div
                key={a.dealId}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  a.isOverdue ? "bg-red-50/80" : "hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "rounded-lg p-1.5 shrink-0",
                  a.isOverdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"
                )}>
                  {a.isOverdue ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CalendarClock className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-700 leading-tight">
                    {a.nextAction}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {a.dealTitle}
                    {a.contactName && ` · ${a.contactName}`}
                  </p>
                  <p className={cn(
                    "text-[11px] mt-0.5 font-medium",
                    a.isOverdue ? "text-red-600" : "text-slate-400"
                  )}>
                    {a.isOverdue ? "Überfällig: " : ""}
                    {new Date(a.nextActionDate).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Keine offenen Aktionen.</p>
        )}
      </div>
    </div>
  );
}
