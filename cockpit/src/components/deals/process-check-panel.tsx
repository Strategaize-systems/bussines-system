import { CheckCircle2, XCircle, Circle } from "lucide-react";
import type { ProcessCheckItem } from "@/lib/process-check";

interface ProcessCheckPanelProps {
  checks: ProcessCheckItem[];
}

export function ProcessCheckPanel({ checks }: ProcessCheckPanelProps) {
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const requiredFailed = checks.filter((c) => c.required && !c.passed);
  const allRequiredPassed = requiredFailed.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">
          Prozess-Check
        </h3>
        <span
          className={`text-xs font-semibold ${
            allRequiredPassed ? "text-green-600" : "text-amber-600"
          }`}
        >
          {passedCount}/{totalCount}
        </span>
      </div>
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            {check.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : check.required ? (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-slate-300 shrink-0" />
            )}
            <span
              className={`text-sm ${
                check.passed
                  ? "text-slate-600"
                  : check.required
                    ? "text-red-700 font-medium"
                    : "text-slate-400"
              }`}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
      {requiredFailed.length > 0 && (
        <p className="text-[11px] text-red-500 mt-1">
          * Pflichtfeld für diese Stage
        </p>
      )}
    </div>
  );
}
