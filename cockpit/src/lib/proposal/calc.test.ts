// V5.5 SLC-552: Unit-Tests fuer calc.ts (Cent-Genauigkeit).
// AC8: 3 Items mit 10% Discount + 19% Tax — manuelle Verifikation.

import { describe, expect, it } from "vitest";
import { calculateLineTotal, calculateTotals } from "./calc";

describe("calculateLineTotal", () => {
  it("liefert 0 bei quantity 0", () => {
    expect(calculateLineTotal(0, 100, 0)).toBe(0);
  });

  it("liefert 0 bei negativem Preis", () => {
    expect(calculateLineTotal(1, -10, 0)).toBe(0);
  });

  it("rechnet ohne Discount korrekt", () => {
    expect(calculateLineTotal(3, 100.5, 0)).toBe(301.5);
  });

  it("rechnet 10% Discount korrekt", () => {
    // 2 * 50 = 100, -10% = 90.00
    expect(calculateLineTotal(2, 50, 10)).toBe(90);
  });

  it("rechnet 100% Discount = 0", () => {
    expect(calculateLineTotal(5, 99.99, 100)).toBe(0);
  });

  it("clamped Discount > 100 auf 100", () => {
    expect(calculateLineTotal(1, 100, 150)).toBe(0);
  });

  it("clamped negativen Discount auf 0", () => {
    expect(calculateLineTotal(1, 100, -10)).toBe(100);
  });

  it("rundet auf Cent (Pattern Math.round * 100 / 100)", () => {
    // 7 * 12.345 = 86.415 → 86.42
    expect(calculateLineTotal(7, 12.345, 0)).toBe(86.42);
  });
});

describe("calculateTotals", () => {
  it("liefert 0/0/0 bei leerer Item-Liste", () => {
    expect(calculateTotals([], 19)).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it("Test-Fall A (AC8): 1 Item qty=3 price=100.50 discount=0% tax=19% → 301.50/57.29/358.79", () => {
    const result = calculateTotals(
      [{ quantity: 3, unit_price_net: 100.5, discount_pct: 0 }],
      19,
    );
    expect(result.subtotal).toBe(301.5);
    expect(result.tax).toBe(57.29);
    expect(result.total).toBe(358.79);
  });

  it("Test-Fall B: 2 Items qty=2/1 price=50/75 discount=10%/0% tax=7%", () => {
    // Item 1: 2 * 50 * 0.9 = 90.00
    // Item 2: 1 * 75 * 1.0 = 75.00
    // subtotal = 165.00
    // tax = 11.55
    // total = 176.55
    const result = calculateTotals(
      [
        { quantity: 2, unit_price_net: 50, discount_pct: 10 },
        { quantity: 1, unit_price_net: 75, discount_pct: 0 },
      ],
      7,
    );
    expect(result.subtotal).toBe(165);
    expect(result.tax).toBe(11.55);
    expect(result.total).toBe(176.55);
  });

  it("Test-Fall C: 3 Items mit Discount 10% + Tax 19% (AC8 Reference)", () => {
    // Item A: 1 * 200 * 0.9 = 180.00
    // Item B: 2 * 150 * 0.9 = 270.00
    // Item C: 1 * 50 * 0.9 = 45.00
    // subtotal = 495.00
    // tax (19%) = 94.05
    // total = 589.05
    const result = calculateTotals(
      [
        { quantity: 1, unit_price_net: 200, discount_pct: 10 },
        { quantity: 2, unit_price_net: 150, discount_pct: 10 },
        { quantity: 1, unit_price_net: 50, discount_pct: 10 },
      ],
      19,
    );
    expect(result.subtotal).toBe(495);
    expect(result.tax).toBe(94.05);
    expect(result.total).toBe(589.05);
  });

  it("rechnet mit Tax 0% korrekt", () => {
    const result = calculateTotals(
      [{ quantity: 4, unit_price_net: 25, discount_pct: 0 }],
      0,
    );
    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(100);
  });

  it("vermeidet Floating-Drift bei vielen Decimals", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS — Cent-Rundung muss das fangen.
    const result = calculateTotals(
      [
        { quantity: 1, unit_price_net: 0.1, discount_pct: 0 },
        { quantity: 1, unit_price_net: 0.2, discount_pct: 0 },
      ],
      0,
    );
    expect(result.subtotal).toBe(0.3);
    expect(result.total).toBe(0.3);
  });
});
