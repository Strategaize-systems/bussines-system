import { describe, it, expect } from "vitest";
import { buildProposalDocDefinition } from "./proposal-renderer";
import type { Proposal, ProposalItem } from "@/app/(app)/proposals/actions";

// V5.6 SLC-562 — Snapshot-Tests fuer den PDF-Renderer.
// Wichtigste Aussage: Conditional-Skonto-Block darf den V5.5-Output NICHT
// veraendern, wenn skonto_percent/days null sind (DEC-120 bit-identisch).
//
// Snapshots werden auf das pdfmake DocDefinition-Object gemacht (deterministisch).
// Raw-PDF-Bytes haetten ein Datum + UUID drin und waeren nicht reproduzierbar.

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    deal_id: null,
    company_id: null,
    contact_id: null,
    title: "Test-Angebot",
    version: 1,
    status: "draft",
    scope_notes: null,
    price_range: null,
    objections: null,
    negotiation_notes: null,
    won_lost_reason: null,
    won_lost_details: null,
    sent_at: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    subtotal_net: null,
    tax_rate: 19,
    tax_amount: null,
    total_gross: null,
    valid_until: "2026-06-01",
    payment_terms: "Zahlbar innerhalb von 30 Tagen netto.",
    parent_proposal_id: null,
    accepted_at: null,
    rejected_at: null,
    expired_at: null,
    pdf_storage_path: null,
    skonto_percent: null,
    skonto_days: null,
    ...overrides,
  };
}

const items: ProposalItem[] = [
  {
    id: "item-1",
    proposal_id: "00000000-0000-0000-0000-000000000001",
    product_id: null,
    position_order: 1,
    quantity: 1,
    unit_price_net: 1000,
    discount_pct: 0,
    snapshot_name: "Beratungstag",
    snapshot_description: "8h Onsite",
    snapshot_unit_price_at_creation: 1000,
    created_at: "2026-05-01T00:00:00Z",
  },
];

const baseInput = {
  items,
  branding: null,
  deal: null,
  company: null,
  contact: null,
  logoDataUrl: null,
  testMode: false,
};

// Hilfs-Funktion: extrahiert die content-Bloecke (ohne pageSize/header/footer-Closures,
// damit Snapshots keine Funktionsreferenzen enthalten).
function getContentSnapshot(input: ReturnType<typeof makeProposal>) {
  const docDef = buildProposalDocDefinition({
    proposal: input,
    ...baseInput,
  });
  return JSON.parse(JSON.stringify(docDef.content));
}

describe("buildProposalDocDefinition — Skonto conditional block (DEC-120)", () => {
  it("ohne Skonto: keine Skonto-Zeile im content (V5.5 bit-identisch)", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const content = getContentSnapshot(proposal);
    const skontoMatch = JSON.stringify(content).match(/Skonto/);
    expect(skontoMatch).toBeNull();
  });

  it("mit Skonto: Skonto-Block enthaelt formatierten Text", () => {
    const proposal = makeProposal({ skonto_percent: 2.5, skonto_days: 7 });
    const content = getContentSnapshot(proposal);
    const stringified = JSON.stringify(content);
    expect(stringified).toMatch(
      /Skonto: 2,50% bei Zahlung innerhalb 7 Tagen/,
    );
  });

  it("mit Skonto Edge-Werte 9.99/90", () => {
    const proposal = makeProposal({ skonto_percent: 9.99, skonto_days: 90 });
    const content = getContentSnapshot(proposal);
    expect(JSON.stringify(content)).toMatch(
      /Skonto: 9,99% bei Zahlung innerhalb 90 Tagen/,
    );
  });

  it("Snapshot ohne Skonto deterministisch (V5.5 Baseline)", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const content = getContentSnapshot(proposal);
    expect(content).toMatchSnapshot();
  });

  it("Snapshot mit Skonto deterministisch", () => {
    const proposal = makeProposal({ skonto_percent: 2.0, skonto_days: 14 });
    const content = getContentSnapshot(proposal);
    expect(content).toMatchSnapshot();
  });
});
