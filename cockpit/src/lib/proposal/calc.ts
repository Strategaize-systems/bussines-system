// V5.5 SLC-552: Cent-genaue Brutto/Netto-Berechnung.
// Single-Source-of-Truth fuer Workspace-UI (live preview) + SLC-553 PDF-Renderer.
// Pattern: Math.round(value * 100) / 100 nach jedem Schritt — vermeidet Floating-Drift.

export type ProposalLineInput = {
  quantity: number;
  unit_price_net: number;
  discount_pct: number;
};

export type ProposalTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateLineTotal(
  quantity: number,
  unitPriceNet: number,
  discountPct: number,
): number {
  if (quantity <= 0) return 0;
  if (unitPriceNet < 0) return 0;
  const clampedDiscount = Math.max(0, Math.min(100, discountPct));
  const gross = quantity * unitPriceNet;
  const afterDiscount = gross * (1 - clampedDiscount / 100);
  return roundCents(afterDiscount);
}

export function calculateTotals(
  items: ProposalLineInput[],
  taxRatePct: number,
): ProposalTotals {
  const subtotal = roundCents(
    items.reduce(
      (sum, item) =>
        sum +
        calculateLineTotal(item.quantity, item.unit_price_net, item.discount_pct),
      0,
    ),
  );
  const tax = roundCents(subtotal * (taxRatePct / 100));
  const total = roundCents(subtotal + tax);
  return { subtotal, tax, total };
}
