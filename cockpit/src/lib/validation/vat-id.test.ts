import { describe, it, expect } from "vitest";
import {
  EU_COUNTRY_CODES,
  validateDeVatId,
  validateEuVatId,
  validateNlVatId,
} from "./vat-id";

describe("EU_COUNTRY_CODES", () => {
  it("contains all 27 EU member states (Stand 2026)", () => {
    expect(EU_COUNTRY_CODES).toHaveLength(27);
  });

  it("contains DE and NL", () => {
    expect(EU_COUNTRY_CODES).toContain("DE");
    expect(EU_COUNTRY_CODES).toContain("NL");
  });

  it("uses EL for Greece (VAT-Special, not GR)", () => {
    expect(EU_COUNTRY_CODES).toContain("EL");
    expect(EU_COUNTRY_CODES).not.toContain("GR");
  });

  it("does not contain non-EU codes (UK, CH, NO, US)", () => {
    expect(EU_COUNTRY_CODES).not.toContain("UK");
    expect(EU_COUNTRY_CODES).not.toContain("GB");
    expect(EU_COUNTRY_CODES).not.toContain("CH");
    expect(EU_COUNTRY_CODES).not.toContain("NO");
    expect(EU_COUNTRY_CODES).not.toContain("US");
  });
});

describe("validateNlVatId", () => {
  it("accepts canonical NL format NL\\d{9}B\\d{2}", () => {
    const r = validateNlVatId("NL859123456B01");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value).toBe("NL859123456B01");
  });

  it("trims whitespace before validation", () => {
    const r = validateNlVatId("  NL859123456B01  ");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value).toBe("NL859123456B01");
  });

  it("rejects empty input", () => {
    expect(validateNlVatId("").valid).toBe(false);
    expect(validateNlVatId("   ").valid).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(validateNlVatId("nl859123456b01").valid).toBe(false);
  });

  it("rejects too short", () => {
    expect(validateNlVatId("NL12345").valid).toBe(false);
  });

  it("rejects DE-Format", () => {
    expect(validateNlVatId("DE123456789").valid).toBe(false);
  });

  it("rejects extra characters", () => {
    expect(validateNlVatId("NL859123456B01X").valid).toBe(false);
  });
});

describe("validateDeVatId", () => {
  it("accepts canonical DE format DE\\d{9}", () => {
    const r = validateDeVatId("DE123456789");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value).toBe("DE123456789");
  });

  it("trims whitespace before validation", () => {
    const r = validateDeVatId(" DE123456789 ");
    expect(r.valid).toBe(true);
  });

  it("rejects empty input", () => {
    expect(validateDeVatId("").valid).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(validateDeVatId("de123456789").valid).toBe(false);
  });

  it("rejects too short (8 digits)", () => {
    expect(validateDeVatId("DE12345678").valid).toBe(false);
  });

  it("rejects too long (10 digits)", () => {
    expect(validateDeVatId("DE1234567890").valid).toBe(false);
  });

  it("rejects NL-Format", () => {
    expect(validateDeVatId("NL859123456B01").valid).toBe(false);
  });
});

describe("validateEuVatId", () => {
  it("accepts DE format with country=DE", () => {
    const r = validateEuVatId("DE123456789");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.country).toBe("DE");
  });

  it("accepts AT format with country=AT", () => {
    const r = validateEuVatId("ATU12345678");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.country).toBe("AT");
  });

  it("accepts FR format with country=FR", () => {
    const r = validateEuVatId("FR12345678901");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.country).toBe("FR");
  });

  it("accepts NL canonical format with country=NL", () => {
    const r = validateEuVatId("NL859123456B01");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.country).toBe("NL");
  });

  it("accepts EL (Greece) format", () => {
    const r = validateEuVatId("EL123456789");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.country).toBe("EL");
  });

  it("trims whitespace", () => {
    expect(validateEuVatId(" DE123456789 ").valid).toBe(true);
  });

  it("rejects empty input", () => {
    expect(validateEuVatId("").valid).toBe(false);
  });

  it("rejects lowercase country code", () => {
    expect(validateEuVatId("nl859123456B01").valid).toBe(false);
  });

  it("rejects unknown country code (XX)", () => {
    const r = validateEuVatId("XX12345678");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toContain("XX");
  });

  it("rejects UK (Brexit, not in EU VAT system)", () => {
    expect(validateEuVatId("UK123456789").valid).toBe(false);
    expect(validateEuVatId("GB123456789").valid).toBe(false);
  });

  it("rejects too-short alphanumeric block (1 char after country)", () => {
    expect(validateEuVatId("DE1").valid).toBe(false);
  });

  it("rejects too-long alphanumeric block (>12 chars after country)", () => {
    expect(validateEuVatId("DE1234567890123").valid).toBe(false);
  });
});
