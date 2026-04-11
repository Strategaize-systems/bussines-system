"use client";

import { LayoutGrid, List, MapPin } from "lucide-react";

export type ViewMode = "grid" | "list" | "karte";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  const items: { value: ViewMode; icon: typeof LayoutGrid }[] = [
    { value: "grid", icon: LayoutGrid },
    { value: "list", icon: List },
    { value: "karte", icon: MapPin },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {items.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
            mode === value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Icon size={16} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}
