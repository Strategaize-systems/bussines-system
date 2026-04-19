import { CheckCircle2, XCircle, Circle, ClipboardCheck } from "lucide-react";
import type { ProcessCheckItem } from "@/lib/process-check";

interface ProcessCheckPanelProps {
  checks: ProcessCheckItem[];
}

export function ProcessCheckPanel({ checks }: ProcessCheckPanelProps) {
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const requiredFailed = checks.filter((c) => c.required && !c.passed);
  const allRequiredPassed = requiredFailed.length === 0;
  const progressPct = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#120774] to-[#4454b8] flex items-center justify-center shadow-md">
              <ClipboardCheck className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Prozess-Check
            </h3>
          </div>
          <span
            className={`text-sm font-bold ${
              allRequiredPassed ? "text-green-600" : "text-amber-600"
            }`}
          >
            {passedCount}/{totalCount}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allRequiredPassed
                ? "bg-gradient-to-r from-[#00a84f] to-[#4dcb8b]"
                : "bg-gradient-to-r from-[#f2b705] to-[#ffd54f]"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              check.passed
                ? "bg-green-50/50"
                : check.required
                  ? "bg-red-50/50"
                  : ""
            }`}
          >
            {check.passed ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-green-500 shrink-0" />
            ) : check.required ? (
              <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
            ) : (
              <Circle className="h-4.5 w-4.5 text-slate-300 shrink-0" />
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
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500 font-medium">
            * Pflichtfeld für diese Stage
          </p>
        </div>
      )}
    </div>
  );
}
