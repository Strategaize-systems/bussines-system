import { describe, it, expect } from "vitest";
import { validateSkonto } from "./skonto-validation";

describe("validateSkonto", () => {
  it("akzeptiert null/null (Off-State)", () => {
    expect(validateSkonto(null, null)).toEqual({ ok: true });
  });

  it("akzeptiert valide Werte (2.0%, 7 Tage)", () => {
    expect(validateSkonto(2.0, 7)).toEqual({ ok: true });
  });

  it("akzeptiert Edge-Werte 0.01% / 1 Tag", () => {
    expect(validateSkonto(0.01, 1)).toEqual({ ok: true });
  });

  it("akzeptiert Edge-Werte 9.99% / 90 Tage", () => {
    expect(validateSkonto(9.99, 90)).toEqual({ ok: true });
  });

  it("blockt Prozent = 0", () => {
    const r = validateSkonto(0, 7);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Skonto-Prozent/);
  });

  it("blockt Prozent >= 10", () => {
    const r = validateSkonto(10, 7);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Skonto-Prozent/);
  });

  it("blockt Tage = 0", () => {
    const r = validateSkonto(2.0, 0);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Skonto-Tage/);
  });

  it("blockt Tage > 90", () => {
    const r = validateSkonto(2.0, 91);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Skonto-Tage/);
  });

  it("blockt nicht-Integer Tage", () => {
    const r = validateSkonto(2.0, 7.5);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Skonto-Tage/);
  });

  it("blockt halbleeren State percent=null, days=7", () => {
    const r = validateSkonto(null, 7);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Beide/);
  });

  it("blockt halbleeren State percent=2.0, days=null", () => {
    const r = validateSkonto(2.0, null);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/Beide/);
  });
});
