// V5.7 SLC-571 MT-7 — Cross-Field-Validation fuer Reverse-Charge.
//
// Server-Side-Enforcement der Eligibility-Regel (DEC-126 + DEC-128):
// Wenn `reverse_charge=true`, MUSS ALLES erfuellt sein:
//   1. tax_rate === 0 (DB-CHECK proposals_reverse_charge_consistency
//      enforced das ohnehin, aber wir wollen eine bessere Fehlermeldung)
//   2. branding.vat_id ist gesetzt (Strategaize-BTW erforderlich fuer Footer)
//   3. company.vat_id ist gesetzt (Empfaenger-BTW erforderlich fuer Reverse-
//      Charge-Block-Render im PDF)
//   4. company.address_country mappt auf einen EU-Country-Code AND != 'NL'
//      (Inland-NL-Reverse-Charge ist NICHT Article-196-Scope; Drittlaender
//      sind DSGVO-/Steuerlich aussen vor)
//
// Pure Function — keine I/O. Aufrufer (Server Action) liefert die bereits
// resolved-Werte. DEC-099-Pattern (V5.4) wird wiederverwendet.
//
// Wichtig: Wir ziehen den `countryNameToCode`-Mapper bewusst aus der
// Editor-only-Datei `use-reverse-charge-eligibility.ts` ab, weil Server-
// Action und Editor dieselbe Mapping-Tabelle teilen muessen.

import { EU_COUNTRY_CODES } from "@/lib/validation/vat-id";
import { countryNameToCode } from "@/app/(app)/proposals/[id]/edit/use-reverse-charge-eligibility";

export type ReverseChargeValidationInput = {
  reverseCharge: boolean;
  taxRate: number;
  brandingVatId: string | null;
  companyVatId: string | null;
  companyCountry: string | null;
};

export type ReverseChargeValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

export function validateReverseCharge(
  input: ReverseChargeValidationInput,
): ReverseChargeValidationResult {
  // Wenn Reverse-Charge aus ist, gibt es nichts zu enforcen.
  // (DB-CHECK erlaubt explizit RC=false bei jedem tax_rate.)
  if (!input.reverseCharge) return { ok: true };

  // Pfad 1: tax_rate-Konsistenz. Same-as DB-CHECK; explizite Fehlermeldung
  // verhindert, dass wir den Postgres-CHECK-Error an den User durchreichen.
  if (input.taxRate !== 0) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert Steuersatz 0%. Bitte den Steuersatz auf 0% setzen oder den Reverse-Charge-Toggle deaktivieren.",
    };
  }

  // Pfad 2: Strategaize-BTW.
  if (!isNonEmpty(input.brandingVatId)) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert eine BTW-Nummer in den Branding-Einstellungen. Bitte unter /settings/branding eintragen.",
    };
  }

  // Pfad 3: Empfaenger-BTW.
  if (!isNonEmpty(input.companyVatId)) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert eine BTW-Nummer beim Empfaenger. Bitte in den Company-Stammdaten eintragen.",
    };
  }

  // Pfad 4: Empfaenger-Country (EU != NL).
  const code = countryNameToCode(input.companyCountry);
  if (code === null) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert ein EU-Empfaengerland (ausser NL). Land des Empfaengers fehlt oder ist nicht erkannt.",
    };
  }
  if (code === "NL") {
    return {
      ok: false,
      error:
        "Reverse-Charge ist nur fuer EU-B2B-Cross-Border anwendbar. Empfaenger sitzt in NL — Standard-NL-VAT verwenden.",
    };
  }
  if (!(EU_COUNTRY_CODES as readonly string[]).includes(code)) {
    return {
      ok: false,
      error: `Reverse-Charge ist nur fuer EU-Empfaenger anwendbar. Country-Code "${code}" ist kein EU-Mitglied.`,
    };
  }

  return { ok: true };
}
