import { describe, it, expect } from "vitest";
import { validateReverseCharge } from "./reverse-charge-validation";

const ELIGIBLE = {
  reverseCharge: true,
  taxRate: 0,
  brandingVatId: "NL859123456B01",
  companyVatId: "DE123456789",
  companyCountry: "Deutschland",
};

describe("validateReverseCharge", () => {
  it("akzeptiert Off-State (RC=false) bei jedem tax_rate", () => {
    expect(
      validateReverseCharge({
        reverseCharge: false,
        taxRate: 21,
        brandingVatId: null,
        companyVatId: null,
        companyCountry: null,
      }),
    ).toEqual({ ok: true });

    expect(
      validateReverseCharge({
        reverseCharge: false,
        taxRate: 0,
        brandingVatId: "NL859123456B01",
        companyVatId: "DE123456789",
        companyCountry: "Deutschland",
      }),
    ).toEqual({ ok: true });
  });

  it("akzeptiert RC=true wenn alle 4 Voraussetzungen erfuellt", () => {
    const r = validateReverseCharge(ELIGIBLE);
    expect(r).toEqual({ ok: true });
  });

  it("blockt RC=true wenn tax_rate != 0", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, taxRate: 21 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Steuersatz 0%/);
  });

  it("blockt RC=true wenn branding-vat_id fehlt", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, brandingVatId: null });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Branding-Einstellungen/);
  });

  it("blockt RC=true wenn branding-vat_id nur Whitespace", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, brandingVatId: "   " });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Branding-Einstellungen/);
  });

  it("blockt RC=true wenn company-vat_id fehlt", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, companyVatId: null });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Company-Stammdaten/);
  });

  it("blockt RC=true wenn company-country leer/null", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, companyCountry: null });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Land des Empfaengers/);
  });

  it("blockt RC=true wenn company-country unbekannt", () => {
    const r = validateReverseCharge({ ...ELIGIBLE, companyCountry: "Atlantis" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Land des Empfaengers|nicht erkannt/);
  });

  it("blockt RC=true wenn Empfaenger in NL sitzt", () => {
    const r = validateReverseCharge({
      ...ELIGIBLE,
      companyCountry: "Niederlande",
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Empfaenger sitzt in NL/);
  });

  it("blockt RC=true bei UK-Drittland (Brexit, nicht in EU-Whitelist)", () => {
    const r = validateReverseCharge({
      ...ELIGIBLE,
      companyCountry: "United Kingdom",
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/EU-Empfaenger|GB.*kein EU-Mitglied/);
  });

  it("blockt RC=true bei Schweiz (non-EU)", () => {
    const r = validateReverseCharge({
      ...ELIGIBLE,
      companyCountry: "Schweiz",
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/EU-Empfaenger|CH.*kein EU-Mitglied/);
  });

  it("akzeptiert RC=true bei AT-Empfaenger (EU != NL)", () => {
    const r = validateReverseCharge({
      ...ELIGIBLE,
      companyVatId: "ATU12345678",
      companyCountry: "Österreich",
    });
    expect(r.ok).toBe(true);
  });

  it("akzeptiert RC=true bei FR-ISO-Code direkt", () => {
    const r = validateReverseCharge({
      ...ELIGIBLE,
      companyVatId: "FR12345678901",
      companyCountry: "FR",
    });
    expect(r.ok).toBe(true);
  });

  it("Reihenfolge: tax_rate-Check kommt vor vat_id-Check (deterministische Fehlermeldung)", () => {
    const r = validateReverseCharge({
      reverseCharge: true,
      taxRate: 21,
      brandingVatId: null,
      companyVatId: null,
      companyCountry: null,
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Steuersatz 0%/);
  });
});
