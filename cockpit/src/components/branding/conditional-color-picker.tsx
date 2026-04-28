"use client";

// =============================================================
// ConditionalColorPicker (SLC-541 MT-1, DEC-102)
// =============================================================
// Toggle-Checkbox "Markenfarbe verwenden" + native <input type="color">.
//
// - Toggle aus → Color-Picker disabled, Wert NULL
// - Toggle an  → Color-Picker aktiv, Wert = Hex
//
// Initial-State leitet sich aus value !== null ab (FEAT-531 AC9-Drift Fix:
// User mit primary_color = NULL sieht Toggle aus, Mail rendert weiter ueber
// textToHtml-Fallback, NICHT ueber renderBrandedHtml).
//
// Keine Submit-Logik in der Komponente — Form-Submit bleibt Eltern-Pflicht.

import { useEffect, useState } from "react";
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
  const [enabled, setEnabled] = useState<boolean>(value !== null);

  // Wenn der Eltern-Wert von aussen (z.B. nach Reload mit neuem initial)
  // wechselt, Toggle-State synchronisieren.
  useEffect(() => {
    setEnabled(value !== null);
  }, [value]);

  const inputId = id ?? `color-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const toggleId = `${inputId}-toggle`;

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    onChange(next ? value ?? defaultColor : null);
  };

  const handleColorChange = (next: string) => {
    onChange(next);
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
          value={enabled ? value ?? defaultColor : defaultColor}
          onChange={(e) => handleColorChange(e.target.value)}
          disabled={!enabled}
          className="h-10 w-20 rounded border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="text-xs font-mono text-slate-500">
          {enabled ? value ?? defaultColor : "—"}
        </span>
      </div>
    </div>
  );
}
