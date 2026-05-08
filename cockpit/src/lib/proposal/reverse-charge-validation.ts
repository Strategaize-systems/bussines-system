// V5.7 SLC-571 MT-7 — Cross-Field-Validation fuer Reverse-Charge.
// V6.5 SLC-656 MT-4 (DEC-162) — generalisiert um businessCountry: DE-Mode
// erlaubt § 13b UStG, NL-Mode unveraendert Article 196.
//
// Server-Side-Enforcement der Eligibility-Regel (DEC-126 + DEC-128 + DEC-162):
// Wenn `reverse_charge=true`, MUSS ALLES erfuellt sein:
//   1. tax_rate === 0 (DB-CHECK proposals_reverse_charge_consistency
//      enforced das ohnehin, aber wir wollen eine bessere Fehlermeldung)
//   2. businessCountry ist gesetzt ('DE' | 'NL') — sonst kein Cross-Border-
//      Routing entscheidbar
//   3. branding.vat_id ist gesetzt (Strategaize-VAT-ID erforderlich)
//   4. company.vat_id ist gesetzt (Empfaenger-VAT erforderlich fuer Reverse-
//      Charge-Block-Render im PDF)
//   5. company.address_country mappt auf einen EU-Country-Code AND
//      != businessCountry (Inland ist nicht Article-196-/§ 13b-Scope;
//      Drittlaender sind aussen vor)
//
// Pure Function — keine I/O. Aufrufer (Server Action) liefert die bereits
// resolved-Werte. DEC-099-Pattern (V5.4) wird wiederverwendet.

import { EU_COUNTRY_CODES } from "@/lib/validation/vat-id";
import { countryNameToCode } from "@/app/(app)/proposals/[id]/edit/use-reverse-charge-eligibility";

export type ReverseChargeValidationInput = {
  reverseCharge: boolean;
  taxRate: number;
  /**
   * Strategaize-Markt: 'DE' | 'NL'. Null = Branding nicht eingerichtet — der
   * Validator blockt RC=true in diesem Fall mit einer dedizierten Fehlermeldung.
   */
  businessCountry: "DE" | "NL" | null;
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

  // Pfad 2: businessCountry. Ohne Markt kein Cross-Border-Routing.
  if (input.businessCountry !== "DE" && input.businessCountry !== "NL") {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert ein eingerichtetes Branding-Land (DE oder NL). Bitte unter /settings/branding hinterlegen.",
    };
  }

  // Pfad 3: Strategaize-VAT-ID.
  if (!isNonEmpty(input.brandingVatId)) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert eine VAT-ID in den Branding-Einstellungen. Bitte unter /settings/branding eintragen.",
    };
  }

  // Pfad 4: Empfaenger-VAT.
  if (!isNonEmpty(input.companyVatId)) {
    return {
      ok: false,
      error:
        "Reverse-Charge erfordert eine VAT-ID beim Empfaenger. Bitte in den Company-Stammdaten eintragen.",
    };
  }

  // Pfad 5: Empfaenger-Country (EU != businessCountry).
  const code = countryNameToCode(input.companyCountry);
  if (code === null) {
    return {
      ok: false,
      error: `Reverse-Charge erfordert ein EU-Empfaengerland (ausser ${input.businessCountry}). Land des Empfaengers fehlt oder ist nicht erkannt.`,
    };
  }
  if (code === input.businessCountry) {
    return {
      ok: false,
      error: `Reverse-Charge ist nur fuer EU-B2B-Cross-Border anwendbar. Empfaenger sitzt in ${input.businessCountry} — Standard-${input.businessCountry}-VAT verwenden.`,
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
