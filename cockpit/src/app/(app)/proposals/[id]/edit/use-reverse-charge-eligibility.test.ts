import { describe, it, expect } from "vitest";
import {
  checkReverseChargeEligibility,
  countryNameToCode,
  type EligibilityBranding,
  type EligibilityCompany,
} from "./use-reverse-charge-eligibility";

const NL_BRANDING: EligibilityBranding = {
  businessCountry: "NL",
  vatId: "NL859123456B01",
};

const DE_BRANDING: EligibilityBranding = {
  businessCountry: "DE",
  vatId: "DE123456789",
};

const DE_COMPANY: EligibilityCompany = {
  vat_id: "DE123456789",
  address_country: "Deutschland",
};

describe("countryNameToCode", () => {
  it("mappt 'Deutschland' -> 'DE'", () => {
    expect(countryNameToCode("Deutschland")).toBe("DE");
  });

  it("mappt 'Niederlande' -> 'NL'", () => {
    expect(countryNameToCode("Niederlande")).toBe("NL");
  });

  it("mappt 'Österreich' -> 'AT'", () => {
    expect(countryNameToCode("Österreich")).toBe("AT");
  });

  it("mappt 'Frankreich' -> 'FR'", () => {
    expect(countryNameToCode("Frankreich")).toBe("FR");
  });

  it("akzeptiert ISO-2-Code direkt", () => {
    expect(countryNameToCode("DE")).toBe("DE");
    expect(countryNameToCode("FR")).toBe("FR");
  });

  it("ist case-insensitive bei Namen", () => {
    expect(countryNameToCode("deutschland")).toBe("DE");
    expect(countryNameToCode("DEUTSCHLAND")).toBe("DE");
  });

  it("trimmt Whitespace", () => {
    expect(countryNameToCode("  Deutschland  ")).toBe("DE");
  });

  it("returnt null fuer null/undefined/leer", () => {
    expect(countryNameToCode(null)).toBeNull();
    expect(countryNameToCode(undefined)).toBeNull();
    expect(countryNameToCode("")).toBeNull();
    expect(countryNameToCode("   ")).toBeNull();
  });

  it("returnt null fuer unbekannte Eingabe", () => {
    expect(countryNameToCode("Atlantis")).toBeNull();
  });

  it("mappt UK/Schweiz auf non-EU-Codes (fuer Drittland-Erkennung)", () => {
    expect(countryNameToCode("Schweiz")).toBe("CH");
    expect(countryNameToCode("United Kingdom")).toBe("GB");
    expect(countryNameToCode("Vereinigtes Königreich")).toBe("GB");
  });
});

describe("checkReverseChargeEligibility", () => {
  it("alle 3 Voraussetzungen erfuellt -> eligible=true", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, DE_COMPANY);
    expect(result.eligible).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("DE-Mode -> eligible=false (V5.7-out-of-scope)", () => {
    const result = checkReverseChargeEligibility(DE_BRANDING, DE_COMPANY);
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["DE_MODE_OUT_OF_SCOPE"]);
  });

  it("Branding-vat_id fehlt -> eligible=false", () => {
    const result = checkReverseChargeEligibility(
      { businessCountry: "NL", vatId: null },
      DE_COMPANY,
    );
    expect(result.eligible).toBe(false);
    expect(result.missing).toContain("BRANDING_VAT_ID");
  });

  it("Branding-vat_id leer/whitespace -> eligible=false", () => {
    const result = checkReverseChargeEligibility(
      { businessCountry: "NL", vatId: "   " },
      DE_COMPANY,
    );
    expect(result.eligible).toBe(false);
    expect(result.missing).toContain("BRANDING_VAT_ID");
  });

  it("Company-vat_id fehlt -> eligible=false", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: null,
      address_country: "Deutschland",
    });
    expect(result.eligible).toBe(false);
    expect(result.missing).toContain("COMPANY_VAT_ID");
  });

  it("Company komplett null -> eligible=false (vat_id + country missing)", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, null);
    expect(result.eligible).toBe(false);
    expect(result.missing).toContain("COMPANY_VAT_ID");
    expect(result.missing).toContain("COMPANY_COUNTRY_MISSING");
  });

  it("NL-Empfaenger -> eligible=false (Reverse-Charge nicht anwendbar)", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "NL123456789B01",
      address_country: "Niederlande",
    });
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["COMPANY_COUNTRY_NL"]);
  });

  it("UK-Empfaenger (Drittland) -> eligible=false", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "GB123456789",
      address_country: "United Kingdom",
    });
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["COMPANY_COUNTRY_NON_EU"]);
  });

  it("Schweiz (Drittland) -> eligible=false", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "CHE123456789",
      address_country: "Schweiz",
    });
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["COMPANY_COUNTRY_NON_EU"]);
  });

  it("Country unbekannt/Free-Text-Tippfehler -> COMPANY_COUNTRY_MISSING", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "DE123456789",
      address_country: "Atlantis",
    });
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["COMPANY_COUNTRY_MISSING"]);
  });

  it("AT-Empfaenger -> eligible=true", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "ATU12345678",
      address_country: "Österreich",
    });
    expect(result.eligible).toBe(true);
  });

  it("FR-Empfaenger via ISO-Code -> eligible=true", () => {
    const result = checkReverseChargeEligibility(NL_BRANDING, {
      vat_id: "FR12345678901",
      address_country: "FR",
    });
    expect(result.eligible).toBe(true);
  });

  it("Branding null -> eligible=false (DE_MODE_OUT_OF_SCOPE als Fallback)", () => {
    const result = checkReverseChargeEligibility(null, DE_COMPANY);
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["DE_MODE_OUT_OF_SCOPE"]);
  });

  it("mehrere fehlende Voraussetzungen werden gleichzeitig gemeldet", () => {
    const result = checkReverseChargeEligibility(
      { businessCountry: "NL", vatId: null },
      { vat_id: null, address_country: "Niederlande" },
    );
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual([
      "BRANDING_VAT_ID",
      "COMPANY_VAT_ID",
      "COMPANY_COUNTRY_NL",
    ]);
  });
});
