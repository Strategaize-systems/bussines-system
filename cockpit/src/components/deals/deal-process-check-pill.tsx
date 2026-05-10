"use client";

import { CheckCircle2, XCircle, Circle, ClipboardCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ProcessCheckItem } from "@/lib/process-check";

interface DealProcessCheckPillProps {
  checks: ProcessCheckItem[];
}

export function DealProcessCheckPill({ checks }: DealProcessCheckPillProps) {
  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const requiredFailed = checks.filter((c) => c.required && !c.passed).length;
  const allRequiredPassed = requiredFailed === 0;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Prozess-Check: ${passed}/${total} erfuellt${
              requiredFailed > 0 ? `, ${requiredFailed} Pflicht offen` : ""
            }`}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer",
              allRequiredPassed
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
            )}
          />
        }
      >
        <ClipboardCheck className="h-3 w-3" />
        Prozess-Check {passed}/{total}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-80 max-h-[60vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-sm font-bold text-slate-900">Prozess-Check</span>
          <span className={cn("text-sm font-bold", allRequiredPassed ? "text-emerald-600" : "text-amber-600")}>
            {passed}/{total}
          </span>
        </div>
        <ul className="space-y-1.5 mt-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md",
                c.passed ? "bg-emerald-50/40" : c.required ? "bg-red-50/40" : "",
              )}
            >
              {c.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : c.required ? (
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300 shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs",
                  c.passed
                    ? "text-slate-700"
                    : c.required
                      ? "text-red-700 font-medium"
                      : "text-slate-500",
                )}
              >
                {c.label}
                {c.required && !c.passed && <span className="text-red-500 ml-1">*</span>}
              </span>
            </li>
          ))}
        </ul>
        {requiredFailed > 0 && (
          <p className="text-[11px] text-red-500 font-medium mt-2 border-t border-slate-100 pt-2">
            * Pflichtfeld fuer diese Stage
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
