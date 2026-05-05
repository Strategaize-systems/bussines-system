"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateSkonto } from "@/lib/proposal/skonto-validation";

type Props = {
  skonto_percent: number | null;
  skonto_days: number | null;
  onChange: (percent: number | null, days: number | null) => void;
  disabled?: boolean;
};

const DEFAULT_PERCENT = 2.0;
const DEFAULT_DAYS = 7;

export function SkontoSection({
  skonto_percent,
  skonto_days,
  onChange,
  disabled = false,
}: Props) {
  // V5.7 SLC-572 Follow-up — isOn aus beiden Feldern ableiten, damit ein
  // transient-null-Wert (z.B. wenn der User Backspace im Prozent-Input drueckt)
  // die Inputs nicht sofort unmountet. Der Toggle wird nur als OFF gerendert,
  // wenn BEIDE Felder null sind — was im Editor nur durch Toggle-Click selbst
  // (onChange(null, null)) oder durch Mutex-Auto-Clear erreicht wird. So
  // kann der User die Werte editieren ohne dass das Input-Feld waehrend des
  // Tippens DOM-mauml;ssig verschwindet.
  const isOn = skonto_percent !== null || skonto_days !== null;
  const validation = validateSkonto(skonto_percent, skonto_days);

  function toggle() {
    if (disabled) return;
    if (isOn) {
      onChange(null, null);
    } else {
      onChange(DEFAULT_PERCENT, DEFAULT_DAYS);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Skonto</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Optional: Skontorabatt bei frueher Zahlung anbieten.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Skonto anbieten"
          onClick={toggle}
          disabled={disabled}
          title={
            disabled
              ? "Bei Vorkasse nicht anwendbar"
              : isOn
                ? "Skonto deaktivieren"
                : "Skonto aktivieren"
          }
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            disabled
              ? "cursor-not-allowed bg-slate-200 opacity-50"
              : isOn
                ? "bg-emerald-600"
                : "bg-slate-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              isOn ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {isOn ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="skonto-percent">Prozent</Label>
            <div className="relative">
              <Input
                id="skonto-percent"
                type="number"
                min="0.01"
                max="9.99"
                step="0.01"
                value={skonto_percent ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value;
                  const next = raw === "" ? null : Number(raw);
                  onChange(next, skonto_days);
                }}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                %
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skonto-days">Tage</Label>
            <div className="relative">
              <Input
                id="skonto-days"
                type="number"
                min="1"
                max="90"
                step="1"
                value={skonto_days ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value;
                  const next = raw === "" ? null : Number(raw);
                  onChange(skonto_percent, next);
                }}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                Tage
              </span>
            </div>
          </div>
          {!validation.ok ? (
            <p className="col-span-2 text-xs text-red-600">{validation.error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
