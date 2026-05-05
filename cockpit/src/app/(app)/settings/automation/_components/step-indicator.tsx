"use client";

import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Trigger" },
  { num: 2, label: "Bedingungen" },
  { num: 3, label: "Aktionen" },
  { num: 4, label: "Aktivieren" },
];

export function StepIndicator({
  currentStep,
  onJumpToStep,
}: {
  currentStep: number;
  onJumpToStep: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isClickable = step.num <= currentStep;
        return (
          <div key={step.num} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onJumpToStep(step.num)}
              className={`flex items-center gap-2 ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={`text-sm hidden sm:block ${
                  isCurrent
                    ? "font-medium text-slate-900"
                    : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 ? (
              <div
                className={`h-px flex-1 ${
                  isCompleted ? "bg-emerald-300" : "bg-slate-200"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
