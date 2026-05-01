"use client";

// =============================================================
// ConditionalColorPicker (SLC-541 MT-1, DEC-102, V5.4.1 Refactor)
// =============================================================
// Toggle-Checkbox "Markenfarbe verwenden" + native <input type="color">.
//
// V5.4.1 Refactor: useState/useEffect entfernt zugunsten reiner derived
// state. `enabled` leitet sich direkt aus `value !== null` ab. Kein lokaler
// State, keine Sync-Drift bei Eltern-Wechsel — controlled component pattern.
//
// - Toggle aus → onChange(null)        (value === null  → enabled=false)
// - Toggle an  → onChange(defaultColor) (value !== null → enabled=true)
//
// Initial-State leitet sich aus value ab (FEAT-531 AC9-Drift Fix:
// User mit primary_color = NULL sieht Toggle aus, Mail rendert weiter ueber
// textToHtml-Fallback, NICHT ueber renderBrandedHtml).
//
// Keine Submit-Logik in der Komponente — Form-Submit bleibt Eltern-Pflicht.

import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  value: string | null;
  onChange: (val: string | null) => void;
  defaultColor: string;
  id?: string;
};

export function ConditionalColorPicker({
  label,
  value,
  onChange,
  defaultColor,
  id,
}: Props) {
  const enabled = value !== null;
  const inputId = id ?? `color-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const toggleId = `${inputId}-toggle`;

  const handleToggle = (next: boolean) => {
    onChange(next ? defaultColor : null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={toggleId}
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/30"
        />
        <Label
          htmlFor={toggleId}
          className="text-xs font-medium text-slate-600"
        >
          Markenfarbe verwenden
        </Label>
        <input
          id={inputId}
          type="color"
          value={enabled ? value : defaultColor}
          onChange={(e) => onChange(e.target.value)}
          disabled={!enabled}
          className="h-10 w-20 rounded border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="text-xs font-mono text-slate-500">
          {enabled ? value : "—"}
        </span>
      </div>
    </div>
  );
}
