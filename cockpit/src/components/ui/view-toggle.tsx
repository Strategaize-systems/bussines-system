"use client";

import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  mode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <button
        onClick={() => onChange("grid")}
        className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
          mode === "grid"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <LayoutGrid size={16} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
          mode === "list"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <List size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
