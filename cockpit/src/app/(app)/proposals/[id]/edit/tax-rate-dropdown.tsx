"use client";

/**
 * Steuersatz-Dropdown (V5.7 SLC-571 MT-6, DEC-128).
 *
 * Filtert die Whitelist nach `businessCountry`:
 * - NL: 21% / 9% / 0%  (Default fuer neue Angebote: 21%)
 * - DE: 19% / 7% / 0%  (Default fuer neue Angebote: 19%)
 *
 * Legacy-Behandlung (Snapshot-Prinzip DEC-107): existierende Angebote
 * mit einem Steuersatz ausserhalb des aktiven Country-Sets behalten ihren
 * Wert. Der Dropdown rendert den Legacy-Wert mit Suffix "(Legacy)" als
 * erste Option, damit der User bewusst auf einen aktuellen Satz wechseln
 * kann ohne den alten Wert zu verlieren.
 *
 * Lock-Mode (Reverse-Charge aktiv): Dropdown wird disabled und auf 0%
 * fixiert. Der Lock-State kommt vom Eltern-Editor — die Komponente
 * forciert den Wert nicht selbst, sondern reflektiert nur den uebergebenen
 * `value`-Prop.
 */

import type { BusinessCountry } from "@/types/branding";

type AllowedRate = 0 | 7 | 9 | 19 | 21;

const NL_RATES: AllowedRate[] = [21, 9, 0];
const DE_RATES: AllowedRate[] = [19, 7, 0];

const RATE_LABEL: Record<AllowedRate, { nl: string; de: string }> = {
  21: { nl: "21% (Standard NL)", de: "21%" },
  19: { nl: "19%", de: "19% (Standard DE)" },
  9: { nl: "9% (reduziert NL)", de: "9%" },
  7: { nl: "7%", de: "7% (reduziert DE)" },
  0: { nl: "0% (steuerfrei / Reverse-Charge)", de: "0% (steuerfrei)" },
};

type TaxRateDropdownProps = {
  businessCountry: BusinessCountry;
  value: number;
  onChange: (next: AllowedRate) => void;
  disabled?: boolean;
  /** Reverse-Charge-Lock — Dropdown disabled + auf 0% fixiert. */
  locked?: boolean;
  id?: string;
};

export function TaxRateDropdown({
  businessCountry,
  value,
  onChange,
  disabled = false,
  locked = false,
  id = "proposal-tax",
}: TaxRateDropdownProps) {
  const activeRates = businessCountry === "DE" ? DE_RATES : NL_RATES;
  const isLegacy = !activeRates.includes(value as AllowedRate);

  const options: { rate: AllowedRate; label: string; legacy?: boolean }[] = [];
  if (isLegacy) {
    options.push({
      rate: value as AllowedRate,
      label: `${value}% (Legacy)`,
      legacy: true,
    });
  }
  for (const rate of activeRates) {
    options.push({
      rate,
      label:
        businessCountry === "DE" ? RATE_LABEL[rate].de : RATE_LABEL[rate].nl,
    });
  }

  const isDisabled = disabled || locked;

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as AllowedRate)}
      disabled={isDisabled}
      title={
        locked
          ? "Steuersatz ist gesperrt — Reverse-Charge ist aktiv (0%)"
          : undefined
      }
      className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#4454b8] focus:ring-2 focus:ring-[#4454b8]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {options.map((opt) => (
        <option key={opt.rate} value={opt.rate}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
