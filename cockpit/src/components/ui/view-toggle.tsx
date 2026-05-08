"use client";

import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export interface ViewToggleMode<TMode extends string> {
  value: TMode;
  icon: IconType;
  label: string;
}

interface ViewToggleProps<TMode extends string> {
  modes: ReadonlyArray<ViewToggleMode<TMode>>;
  active: TMode;
  onSelect: (mode: TMode) => void;
}

/**
 * Pure helper: returns true if the candidate mode equals the active mode.
 * Used by ViewToggle button styling and exposed for unit-testing the API contract
 * given vitest is node-only (no DOM/RTL).
 */
export function isViewToggleActive<TMode extends string>(active: TMode, candidate: TMode): boolean {
  return active === candidate;
}

/**
 * Pure helper: returns the ViewToggleMode that matches the given value, or null.
 * Useful for runtime mode-value-validation in callers (e.g. URL-state hydration).
 */
export function findViewToggleMode<TMode extends string>(
  modes: ReadonlyArray<ViewToggleMode<TMode>>,
  value: string
): ViewToggleMode<TMode> | null {
  return modes.find((m) => m.value === value) ?? null;
}

export function ViewToggle<TMode extends string>({
  modes,
  active,
  onSelect,
}: ViewToggleProps<TMode>): ReactNode {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          title={label}
          aria-label={label}
          aria-pressed={active === value}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-semibold transition-all",
            active === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Icon size={16} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}
