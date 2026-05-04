/**
 * VAT-ID Format-Validation (DEC-124, DEC-128).
 *
 * Format-only — kein VIES-Lookup in V5.7 (Backlog BL-420).
 *
 * Drei reine Validatoren:
 * - validateNlVatId: NL-BTW (`^NL\d{9}B\d{2}$`)
 * - validateDeVatId: DE-USt-IdNr. (`^DE\d{9}$`)
 * - validateEuVatId: EU-General (`^[A-Z]{2}[A-Z0-9]{2,12}$` + EU-Whitelist)
 *
 * Strategaize-eigene vat_id wird kontextabhaengig validiert ueber `business_country`
 * (DEC-128). Empfaenger-vat_id (companies) ist immer EU-General.
 */

/**
 * 27 EU-Mitgliedstaaten (Stand 2026), Country-Codes wie sie in VAT-IDs
 * verwendet werden (nicht ISO-3166 — Griechenland ist `EL`, nicht `GR`).
 *
 * UK/GB sind seit Brexit nicht mehr im EU-VAT-System enthalten.
 * Northern Ireland (`XI`) ist ein Sonderfall fuer Goods, V5.7 ignoriert.
 */
export const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE",
  "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK",
] as const;

export type EuCountryCode = (typeof EU_COUNTRY_CODES)[number];

export type ValidationResult =
  | { valid: true; value: string; country?: string }
  | { valid: false; error: string };

function trimOrEmpty(input: string): string {
  return (input ?? "").trim();
}

/**
 * NL-BTW-Nummer: `NL` + 9 Ziffern + `B` + 2 Ziffern.
 * Beispiel: `NL859123456B01`.
 */
export function validateNlVatId(input: string): ValidationResult {
  const value = trimOrEmpty(input);
  if (!value) {
    return { valid: false, error: "BTW-Nummer fehlt" };
  }
  if (!/^NL\d{9}B\d{2}$/.test(value)) {
    return {
      valid: false,
      error: "Format: NL gefolgt von 9 Ziffern, B und 2 Ziffern (z.B. NL123456789B01)",
    };
  }
  return { valid: true, value, country: "NL" };
}

/**
 * DE-USt-IdNr.: `DE` + 9 Ziffern.
 * Beispiel: `DE123456789`.
 */
export function validateDeVatId(input: string): ValidationResult {
  const value = trimOrEmpty(input);
  if (!value) {
    return { valid: false, error: "USt-IdNr. fehlt" };
  }
  if (!/^DE\d{9}$/.test(value)) {
    return {
      valid: false,
      error: "Format: DE gefolgt von 9 Ziffern (z.B. DE123456789)",
    };
  }
  return { valid: true, value, country: "DE" };
}

/**
 * EU-General: 2-Buchstaben-Country-Code + 2-12 alphanumerische Zeichen.
 * Country-Code muss in EU_COUNTRY_CODES enthalten sein.
 *
 * Beispiele:
 * - DE123456789 (DE)
 * - ATU12345678 (AT — beginnt mit U)
 * - FR12345678901 (FR — 11 Stellen)
 * - NL859123456B01 (NL — kanonisches BTW-Format)
 * - EL123456789 (EL — Griechenland, nicht GR)
 */
export function validateEuVatId(input: string): ValidationResult {
  const value = trimOrEmpty(input);
  if (!value) {
    return { valid: false, error: "EU-VAT-ID fehlt" };
  }
  const match = /^([A-Z]{2})([A-Z0-9]{2,12})$/.exec(value);
  if (!match) {
    return {
      valid: false,
      error:
        "Format: 2-Buchstaben-EU-Country-Code gefolgt von 2-12 alphanumerischen Zeichen (z.B. DE123456789)",
    };
  }
  const country = match[1] as string;
  if (!(EU_COUNTRY_CODES as readonly string[]).includes(country)) {
    return {
      valid: false,
      error: `Country-Code "${country}" ist kein EU-Mitglied`,
    };
  }
  return { valid: true, value, country };
}
