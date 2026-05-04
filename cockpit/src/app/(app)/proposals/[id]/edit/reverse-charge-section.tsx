"use client";

/**
 * Reverse-Charge-Section (V5.7 SLC-571 MT-6, DEC-126 + DEC-128).
 *
 * Toggle-Section mit dreifacher Voraussetzungs-Pruefung
 * (siehe useReverseChargeEligibility):
 * - branding.vatId NOT NULL
 * - company.vat_id NOT NULL
 * - company.address_country in EU != 'NL'
 *
 * Toggle-OFF (eligible=false): Switch disabled + Tooltip-Liste der
 * fehlenden Voraussetzungen + Quick-Links auf /settings/branding und
 * Company-Edit. Damit der User die Luecke selbststaendig schliessen kann.
 *
 * Toggle-ON: Eltern-Editor setzt tax_rate=0 simultan (DB-CHECK
 * proposals_reverse_charge_consistency erzwingt das).
 *
 * DE-Mode (`branding.businessCountry='DE'`): Section komplett ausgeblendet
 * (V5.7 unterstuetzt nur NL-Reverse-Charge nach Article 196 EU-VAT-Directive,
 * § 13b UStG ist BL-421-Backlog).
 */

import Link from "next/link";
import { Info } from "lucide-react";

import type {
  EligibilityResult,
  MissingPrerequisite,
} from "./use-reverse-charge-eligibility";
import type { BusinessCountry } from "@/types/branding";

const MISSING_LABEL: Record<MissingPrerequisite, string> = {
  DE_MODE_OUT_OF_SCOPE:
    "Reverse-Charge ist im DE-Mode nicht verfuegbar (V5.7-Out-of-Scope, BL-421).",
  BRANDING_VAT_ID:
    "BTW-Nummer Strategaize fehlt — bitte in Branding-Einstellungen pflegen.",
  COMPANY_VAT_ID:
    "BTW-Nummer Empfaenger fehlt — bitte in Company-Stammdaten pflegen.",
  COMPANY_COUNTRY_NL:
    "Empfaenger sitzt in NL — Reverse-Charge ist nur fuer EU-B2B-Cross-Border anwendbar.",
  COMPANY_COUNTRY_NON_EU:
    "Empfaenger sitzt ausserhalb der EU — Reverse-Charge ist nur fuer EU-B2B anwendbar.",
  COMPANY_COUNTRY_MISSING:
    "Land des Empfaengers fehlt oder ist nicht erkannt — bitte in Company-Stammdaten pflegen.",
};

const QUICK_LINK: Partial<Record<MissingPrerequisite, { href: string; label: string }>> = {
  BRANDING_VAT_ID: {
    href: "/settings/branding",
    label: "Zu Branding-Einstellungen",
  },
};

type ReverseChargeSectionProps = {
  businessCountry: BusinessCountry;
  enabled: boolean;
  eligibility: EligibilityResult;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Optional: Quick-Link zur Company-Edit-Seite, wenn Empfaenger-vat_id/Country fehlt. */
  companyEditHref?: string | null;
};

export function ReverseChargeSection({
  businessCountry,
  enabled,
  eligibility,
  onChange,
  disabled = false,
  companyEditHref = null,
}: ReverseChargeSectionProps) {
  // DE-Mode: Section komplett ausgeblendet (kein Toggle, kein Hinweis).
  // BL-421 zieht das nach.
  if (businessCountry === "DE") {
    return null;
  }

  const isEligible = eligibility.eligible;
  const isDisabled = disabled || !isEligible;

  return (
    <div className="space-y-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <Label>Reverse-Charge (BTW verlegd)</Label>
          <p className="text-[11px] text-slate-500">
            Steuerschuldumkehr fuer EU-B2B-Empfaenger gemaess Artikel 196
            EU-VAT-Directive 2006/112/EG. Setzt den Steuersatz auf 0%.
          </p>
        </div>
        <ToggleSwitch
          checked={enabled}
          onChange={onChange}
          disabled={isDisabled}
          ariaLabel="Reverse-Charge aktivieren"
        />
      </div>

      {!isEligible && eligibility.missing.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Voraussetzung fehlt</span>
          </div>
          <ul className="ml-5 list-disc space-y-1 text-[11px] text-amber-900">
            {eligibility.missing.map((code) => (
              <li key={code}>
                {MISSING_LABEL[code]}{" "}
                {QUICK_LINK[code] && (
                  <Link
                    href={QUICK_LINK[code]!.href}
                    className="font-semibold underline hover:text-amber-700"
                  >
                    {QUICK_LINK[code]!.label}
                  </Link>
                )}
                {(code === "COMPANY_VAT_ID" ||
                  code === "COMPANY_COUNTRY_MISSING" ||
                  code === "COMPANY_COUNTRY_NON_EU") &&
                  companyEditHref && (
                    <Link
                      href={companyEditHref}
                      className="font-semibold underline hover:text-amber-700"
                    >
                      Zu Empfaenger-Stammdaten
                    </Link>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enabled && isEligible && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
          Reverse-Charge aktiv — Steuersatz auf 0% gesperrt. Der PDF-Renderer
          fuegt den bilingualen &quot;BTW verlegd / Reverse Charge&quot;-Block hinzu.
        </p>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors " +
        (checked
          ? "border-[#120774] bg-[#120774]"
          : "border-slate-300 bg-slate-200") +
        " disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      <span
        className={
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}
