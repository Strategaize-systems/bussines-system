/**
 * Reverse-Charge-Eligibility (V5.7 SLC-571 MT-5, DEC-126 + DEC-128;
 * V6.5 SLC-656 MT-4, DEC-162 erweitert um DE-Mode).
 *
 * Drei Voraussetzungen muessen erfuellt sein, damit der Reverse-Charge-Toggle
 * im Editor enabled werden darf:
 * 1. branding.vatId NOT NULL/empty (Strategaize-eigene VAT-ID)
 * 2. company.vat_id NOT NULL/empty (Empfaenger-VAT)
 * 3. company.address_country mappt auf einen EU-Country-Code AND
 *    != branding.businessCountry (Cross-Border erforderlich; Inland-Reverse-
 *    Charge ist nicht Article-196- bzw. § 13b-UStG-Scope dieses Slices).
 *
 * DE-Mode ist seit V6.5 SLC-656 zugelassen (DE→EU-non-DE Cross-Border via
 * § 13b UStG). NL-Mode unveraendert (NL→EU-non-NL Cross-Border via Art. 196).
 *
 * Pure Function — kein React-State, keine Side-Effects. Hook ist nur
 * ein duenner Wrapper damit Editor das Pattern nutzen kann.
 */

import { EU_COUNTRY_CODES } from "@/lib/validation/vat-id";

export type EligibilityBranding = {
  businessCountry: "DE" | "NL";
  vatId: string | null;
};

export type EligibilityCompany = {
  vat_id: string | null;
  address_country: string | null;
};

export type MissingPrerequisite =
  | "BRANDING_MISSING"
  | "BRANDING_VAT_ID"
  | "COMPANY_VAT_ID"
  | "COMPANY_COUNTRY_NL"
  | "COMPANY_COUNTRY_DE"
  | "COMPANY_COUNTRY_NON_EU"
  | "COMPANY_COUNTRY_MISSING";

export type EligibilityResult = {
  eligible: boolean;
  missing: MissingPrerequisite[];
};

/**
 * Mapper: Free-Text-Country-Name (deutsch + ISO-Code) → ISO-2-Country-Code.
 *
 * companies.address_country wird aktuell als Free-Text gepflegt
 * (Default "Deutschland"). Mapper akzeptiert deutsche Bezeichnungen,
 * ISO-2-Codes und ein paar gaengige englische Schreibweisen.
 *
 * Returnt null wenn nicht eindeutig mappbar — Aufrufer behandelt
 * das als "Country fehlt / ungueltig".
 */
export function countryNameToCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direkte ISO-2-Code-Eingabe (z.B. "DE", "NL")
  if (/^[A-Z]{2}$/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const map: Record<string, string> = {
    deutschland: "DE",
    germany: "DE",
    niederlande: "NL",
    netherlands: "NL",
    holland: "NL",
    "österreich": "AT",
    oesterreich: "AT",
    austria: "AT",
    frankreich: "FR",
    france: "FR",
    belgien: "BE",
    belgium: "BE",
    italien: "IT",
    italy: "IT",
    spanien: "ES",
    spain: "ES",
    polen: "PL",
    poland: "PL",
    portugal: "PT",
    irland: "IE",
    ireland: "IE",
    daenemark: "DK",
    "dänemark": "DK",
    denmark: "DK",
    schweden: "SE",
    sweden: "SE",
    finnland: "FI",
    finland: "FI",
    luxemburg: "LU",
    luxembourg: "LU",
    tschechien: "CZ",
    czechia: "CZ",
    "czech republic": "CZ",
    griechenland: "EL",
    greece: "EL",
    ungarn: "HU",
    hungary: "HU",
    kroatien: "HR",
    croatia: "HR",
    rumaenien: "RO",
    "rumänien": "RO",
    romania: "RO",
    bulgarien: "BG",
    bulgaria: "BG",
    slowakei: "SK",
    slovakia: "SK",
    slowenien: "SI",
    slovenia: "SI",
    estland: "EE",
    estonia: "EE",
    lettland: "LV",
    latvia: "LV",
    litauen: "LT",
    lithuania: "LT",
    zypern: "CY",
    cyprus: "CY",
    malta: "MT",
    // Nicht-EU (bewusst gemappt, damit der Eligibility-Check sie als non-EU erkennt)
    schweiz: "CH",
    switzerland: "CH",
    "vereinigtes königreich": "GB",
    "vereinigtes koenigreich": "GB",
    "united kingdom": "GB",
    grossbritannien: "GB",
    "großbritannien": "GB",
    england: "GB",
    "vereinigte staaten": "US",
    "united states": "US",
    usa: "US",
    norwegen: "NO",
    norway: "NO",
  };

  return map[lower] ?? null;
}

function isNonEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return value.trim().length > 0;
}

/**
 * Pruefung der Reverse-Charge-Voraussetzungen.
 *
 * Reihenfolge der `missing`-Eintraege ist deterministisch:
 * DE_MODE → BRANDING_VAT_ID → COMPANY_VAT_ID → COMPANY_COUNTRY_*.
 * Damit kann die UI-Tooltip-Liste reproduzierbar gerendert werden.
 */
export function checkReverseChargeEligibility(
  branding: EligibilityBranding | null,
  company: EligibilityCompany | null,
): EligibilityResult {
  const missing: MissingPrerequisite[] = [];

  // V6.5 SLC-656 — branding=null bedeutet kein business_country, also kein
  // Cross-Border-Routing entscheidbar. Frueher Exit; UI kann Quick-Link auf
  // /settings/branding rendern.
  if (!branding) {
    missing.push("BRANDING_MISSING");
    return { eligible: false, missing };
  }

  if (!isNonEmpty(branding.vatId)) {
    missing.push("BRANDING_VAT_ID");
  }

  if (!company || !isNonEmpty(company.vat_id)) {
    missing.push("COMPANY_VAT_ID");
  }

  const code = countryNameToCode(company?.address_country ?? null);
  if (code === null) {
    missing.push("COMPANY_COUNTRY_MISSING");
  } else if (code === branding.businessCountry) {
    // V6.5 SLC-656 — generischer Same-Country-Check. Empfaenger im selben
    // Markt wie Strategaize → kein Cross-Border, Reverse-Charge nicht
    // anwendbar. Code haengt vom Markt ab fuer kontextspezifische Tooltip-
    // Texte (NL: "Empfaenger sitzt in NL ..." / DE: "... in DE ...").
    missing.push(
      branding.businessCountry === "DE"
        ? "COMPANY_COUNTRY_DE"
        : "COMPANY_COUNTRY_NL",
    );
  } else if (!(EU_COUNTRY_CODES as readonly string[]).includes(code)) {
    missing.push("COMPANY_COUNTRY_NON_EU");
  }

  return { eligible: missing.length === 0, missing };
}

/**
 * Convenience-Hook fuer den Editor — ruft die pure Function auf.
 * Kein eigener State, keine Side-Effects: nur ein dokumentierter
 * Wrapper damit der Editor-Code lesbar bleibt.
 */
export function useReverseChargeEligibility(
  branding: EligibilityBranding | null,
  company: EligibilityCompany | null,
): EligibilityResult {
  return checkReverseChargeEligibility(branding, company);
}
