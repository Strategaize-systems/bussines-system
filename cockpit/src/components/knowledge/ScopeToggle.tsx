"use client";

interface ScopeToggleProps {
  scope: "deal" | "all";
  onChange: (scope: "deal" | "all") => void;
  disabled?: boolean;
}

export function ScopeToggle({ scope, onChange, disabled }: ScopeToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      <button
        type="button"
        onClick={() => onChange("deal")}
        disabled={disabled}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          scope === "deal"
            ? "bg-white text-[#4454b8] shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Nur dieser Deal
      </button>
      <button
        type="button"
        onClick={() => onChange("all")}
        disabled={disabled}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          scope === "all"
            ? "bg-white text-[#4454b8] shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Alle Daten
      </button>
    </div>
  );
}
