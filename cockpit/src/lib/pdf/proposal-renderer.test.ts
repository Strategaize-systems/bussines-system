import { describe, it, expect } from "vitest";
import {
  buildProposalDocDefinition,
  formatMilestoneTriggerLabel,
} from "./proposal-renderer";
import type { Proposal, ProposalItem } from "@/app/(app)/proposals/actions";
import type { PaymentMilestone } from "@/types/proposal-payment";

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
function getContentSnapshot(
  input: ReturnType<typeof makeProposal>,
  milestones?: PaymentMilestone[],
) {
  const docDef = buildProposalDocDefinition({
    proposal: input,
    ...baseInput,
    milestones,
  });
  return JSON.parse(JSON.stringify(docDef.content));
}

function makeMilestone(
  partial: Partial<PaymentMilestone> & {
    sequence: number;
    percent: number;
  },
): PaymentMilestone {
  return {
    id: `ms-${partial.sequence}`,
    proposal_id: "00000000-0000-0000-0000-000000000001",
    amount: null,
    due_trigger: "on_signature",
    due_offset_days: null,
    label: null,
    created_at: "2026-05-02T00:00:00Z",
    ...partial,
  };
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

describe("buildProposalDocDefinition — Konditionen-Block (DEC-120, SLC-563)", () => {
  it("ohne Milestones UND ohne Skonto: keine Konditionen-Tabelle, keine Skonto-Zeile (V5.5 bit-identisch)", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const content = getContentSnapshot(proposal, []);
    const stringified = JSON.stringify(content);
    expect(stringified).not.toMatch(/Konditionen/);
    expect(stringified).not.toMatch(/Teilzahlung/);
    expect(stringified).not.toMatch(/Skonto/);
  });

  it("mit Milestones, ohne Skonto: Konditionen-Tabelle vorhanden, kein Skonto", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const milestones: PaymentMilestone[] = [
      makeMilestone({
        sequence: 1,
        percent: 30,
        due_trigger: "on_signature",
        amount: 300,
      }),
      makeMilestone({
        sequence: 2,
        percent: 70,
        due_trigger: "on_completion",
        amount: 700,
      }),
    ];
    const content = getContentSnapshot(proposal, milestones);
    const stringified = JSON.stringify(content);
    expect(stringified).toMatch(/Konditionen \/ Teilzahlungen/);
    expect(stringified).toMatch(/Bei Vertragsabschluss/);
    expect(stringified).toMatch(/Bei Fertigstellung/);
    expect(stringified).toMatch(/30,00%/);
    expect(stringified).toMatch(/70,00%/);
    expect(stringified).not.toMatch(/Skonto/);
  });

  it("ohne Milestones, mit Skonto: kein Konditionen-Block, Skonto-Zeile vorhanden (SLC-562 unveraendert)", () => {
    const proposal = makeProposal({ skonto_percent: 2.0, skonto_days: 7 });
    const content = getContentSnapshot(proposal, []);
    const stringified = JSON.stringify(content);
    expect(stringified).not.toMatch(/Konditionen \/ Teilzahlungen/);
    expect(stringified).toMatch(/Skonto: 2,00% bei Zahlung innerhalb 7 Tagen/);
  });

  it("mit Milestones UND Skonto: Tabelle erst, Skonto-Zeile danach", () => {
    const proposal = makeProposal({ skonto_percent: 2.5, skonto_days: 14 });
    const milestones: PaymentMilestone[] = [
      makeMilestone({
        sequence: 1,
        percent: 50,
        due_trigger: "days_after_signature",
        due_offset_days: 30,
        amount: 500,
      }),
      makeMilestone({
        sequence: 2,
        percent: 50,
        due_trigger: "on_milestone",
        label: "Kickoff",
        amount: 500,
      }),
    ];
    const content = getContentSnapshot(proposal, milestones);
    const stringified = JSON.stringify(content);
    expect(stringified).toMatch(/Konditionen \/ Teilzahlungen/);
    expect(stringified).toMatch(/30 Tage nach Vertragsabschluss/);
    expect(stringified).toMatch(/Bei Meilenstein: Kickoff/);
    expect(stringified).toMatch(/Skonto: 2,50% bei Zahlung innerhalb 14 Tagen/);

    const tableIdx = stringified.indexOf("Konditionen / Teilzahlungen");
    const skontoIdx = stringified.indexOf("Skonto: 2,50%");
    expect(tableIdx).toBeGreaterThan(-1);
    expect(skontoIdx).toBeGreaterThan(tableIdx);
  });

  it("Snapshot ohne beides deterministisch (V5.5 Baseline strict)", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const content = getContentSnapshot(proposal, []);
    expect(content).toMatchSnapshot();
  });

  it("Snapshot mit 3 Milestones deterministisch", () => {
    const proposal = makeProposal({ skonto_percent: null, skonto_days: null });
    const milestones: PaymentMilestone[] = [
      makeMilestone({
        sequence: 1,
        percent: 30,
        due_trigger: "on_signature",
        amount: 300,
      }),
      makeMilestone({
        sequence: 2,
        percent: 40,
        due_trigger: "days_after_signature",
        due_offset_days: 30,
        amount: 400,
      }),
      makeMilestone({
        sequence: 3,
        percent: 30,
        due_trigger: "on_completion",
        amount: 300,
      }),
    ];
    const content = getContentSnapshot(proposal, milestones);
    expect(content).toMatchSnapshot();
  });

  it("Snapshot mit Milestones UND Skonto deterministisch", () => {
    const proposal = makeProposal({ skonto_percent: 2.0, skonto_days: 14 });
    const milestones: PaymentMilestone[] = [
      makeMilestone({
        sequence: 1,
        percent: 50,
        due_trigger: "on_signature",
        amount: 500,
      }),
      makeMilestone({
        sequence: 2,
        percent: 50,
        due_trigger: "on_completion",
        amount: 500,
      }),
    ];
    const content = getContentSnapshot(proposal, milestones);
    expect(content).toMatchSnapshot();
  });
});

describe("formatMilestoneTriggerLabel", () => {
  function ms(
    partial: Partial<PaymentMilestone> & {
      due_trigger: PaymentMilestone["due_trigger"];
    },
  ): PaymentMilestone {
    return {
      id: "x",
      proposal_id: "p",
      sequence: 1,
      percent: 50,
      amount: null,
      due_offset_days: null,
      label: null,
      created_at: "2026-05-02T00:00:00Z",
      ...partial,
    };
  }

  it("on_signature -> 'Bei Vertragsabschluss'", () => {
    expect(formatMilestoneTriggerLabel(ms({ due_trigger: "on_signature" }))).toBe(
      "Bei Vertragsabschluss",
    );
  });

  it("on_completion -> 'Bei Fertigstellung'", () => {
    expect(
      formatMilestoneTriggerLabel(ms({ due_trigger: "on_completion" })),
    ).toBe("Bei Fertigstellung");
  });

  it("days_after_signature -> '{n} Tage nach Vertragsabschluss'", () => {
    expect(
      formatMilestoneTriggerLabel(
        ms({ due_trigger: "days_after_signature", due_offset_days: 30 }),
      ),
    ).toBe("30 Tage nach Vertragsabschluss");
  });

  it("on_milestone ohne Label -> 'Bei Meilenstein'", () => {
    expect(
      formatMilestoneTriggerLabel(ms({ due_trigger: "on_milestone" })),
    ).toBe("Bei Meilenstein");
  });

  it("on_milestone mit Label -> 'Bei Meilenstein: {label}'", () => {
    expect(
      formatMilestoneTriggerLabel(
        ms({ due_trigger: "on_milestone", label: "Kickoff" }),
      ),
    ).toBe("Bei Meilenstein: Kickoff");
  });

  it("on_milestone mit leerem Label -> 'Bei Meilenstein' (Whitespace-only)", () => {
    expect(
      formatMilestoneTriggerLabel(
        ms({ due_trigger: "on_milestone", label: "   " }),
      ),
    ).toBe("Bei Meilenstein");
  });
});
