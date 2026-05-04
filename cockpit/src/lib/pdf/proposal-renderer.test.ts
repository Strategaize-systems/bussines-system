import { describe, it, expect } from "vitest";
import {
  buildProposalDocDefinition,
  formatMilestoneTriggerLabel,
} from "./proposal-renderer";
import { REVERSE_CHARGE_HEADER } from "./reverse-charge-block";
import type {
  Proposal,
  ProposalItem,
  ProposalEditPayload,
} from "@/app/(app)/proposals/actions";
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
    reverse_charge: false,
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
  overrides: {
    branding?: ProposalEditPayload["branding"];
    company?: ProposalEditPayload["company"];
  } = {},
) {
  const docDef = buildProposalDocDefinition({
    proposal: input,
    ...baseInput,
    branding: overrides.branding ?? baseInput.branding,
    company: overrides.company ?? baseInput.company,
    milestones,
  });
  return JSON.parse(JSON.stringify(docDef.content));
}

// V5.7 SLC-571 MT-8 — Test-Fixtures fuer Reverse-Charge + Strategaize-vat_id.
function makeBranding(
  overrides: Partial<NonNullable<ProposalEditPayload["branding"]>> = {},
): NonNullable<ProposalEditPayload["branding"]> {
  return {
    logo_url: null,
    primary_color: null,
    secondary_color: null,
    font_family: null,
    footer_markdown: null,
    contact_block: null,
    vat_id: null,
    business_country: "NL",
    ...overrides,
  };
}

function makeCompany(
  overrides: Partial<NonNullable<ProposalEditPayload["company"]>> = {},
): NonNullable<ProposalEditPayload["company"]> {
  return {
    id: "company-1",
    name: "Acme GmbH",
    vat_id: null,
    address_country: null,
    ...overrides,
  };
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

// V5.7 SLC-571 MT-8 — Reverse-Charge-Block + Strategaize-vat_id-Footer
// (DEC-124 + DEC-125). Snapshot-Strategie:
//  1) Ohne Reverse-Charge ohne branding.vat_id (branding=null) muss bit-
//     identisch zum V5.6-Baseline-Snapshot sein (siehe Skonto-Block-Tests).
//  2) Mit branding.vat_id (kein Reverse-Charge): Footer-Block enthaelt die
//     vat_id-Zeile mit kontextabhaengigem Bezeichner (NL/DE).
//  3) Mit Reverse-Charge: Bilingualer Block direkt unter Tax-Row + beide
//     vat_ids gerendert.
//  4) Edge-Case Reverse-Charge ohne Strategaize-vat_id: Renderer crasht nicht,
//     Block rendert mit "—" Platzhalter (Server-Action soll diesen Fall
//     blocken — Renderer ist defensiv).
describe("buildProposalDocDefinition — Reverse-Charge + Strategaize-vat_id (DEC-124, DEC-125)", () => {
  it("AC21: ohne Reverse-Charge ohne branding.vat_id ist bit-identisch zum V5.6-Baseline (regression-frei)", () => {
    const proposal = makeProposal({
      reverse_charge: false,
      skonto_percent: null,
      skonto_days: null,
    });
    const content = getContentSnapshot(proposal, []);
    const stringified = JSON.stringify(content);
    expect(stringified).not.toMatch(/BTW/);
    expect(stringified).not.toMatch(/Reverse Charge/);
    expect(stringified).not.toMatch(/USt-IdNr\./);
    // Re-Use des V5.6 Baseline-Snapshots aus Konditionen-Block-Suite
    // ("Snapshot ohne beides deterministisch (V5.5 Baseline strict)") —
    // identische Eingaben muessen identische Ausgabe liefern.
    expect(content).toMatchSnapshot();
  });

  it("AC20: branding.vat_id NL gesetzt rendert 'BTW-Nr.' im Footer-Block (kein Reverse-Charge)", () => {
    const proposal = makeProposal({ reverse_charge: false });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "NL859123456B01",
        business_country: "NL",
      }),
    });
    const stringified = JSON.stringify(content);
    expect(stringified).toMatch(/BTW-Nr\. NL859123456B01/);
    expect(stringified).not.toMatch(/USt-IdNr\./);
    // Reverse-Charge-Header darf NICHT erscheinen
    expect(stringified).not.toMatch(/Reverse Charge/);
    expect(stringified).not.toMatch(/BTW verlegd/);
  });

  it("AC20: branding.vat_id DE gesetzt rendert 'USt-IdNr.' im Footer-Block (kein Reverse-Charge)", () => {
    const proposal = makeProposal({ reverse_charge: false });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "DE123456789",
        business_country: "DE",
      }),
    });
    const stringified = JSON.stringify(content);
    expect(stringified).toMatch(/USt-IdNr\. DE123456789/);
    expect(stringified).not.toMatch(/BTW-Nr\./);
  });

  it("AC18: Reverse-Charge=true rendert bilingualen Header + beide BTW-IDs direkt unter Tax-Row", () => {
    const proposal = makeProposal({
      reverse_charge: true,
      tax_rate: 0,
    });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "NL859123456B01",
        business_country: "NL",
      }),
      company: makeCompany({
        vat_id: "DE123456789",
        address_country: "DE",
      }),
    });
    const stringified = JSON.stringify(content);
    expect(stringified).toContain(REVERSE_CHARGE_HEADER);
    expect(stringified).toMatch(/BTW verlegd \/ Reverse Charge — Article 196 VAT Directive 2006\/112\/EC/);
    expect(stringified).toMatch(
      /BTW-Nr\. NL859123456B01 — BTW-Nr\. DE123456789/,
    );
    // Strategaize-vat_id auch im Footer (AC20 + AC18 koexistieren).
    expect(stringified).toMatch(/BTW-Nr\. NL859123456B01/);
    // Tax-Rate 0% muss korrekt im Summary-Header stehen.
    expect(stringified).toMatch(/Steuer \(0%\)/);
  });

  it("AC18: Reverse-Charge-Block sitzt direkt unter Tax-Row vor Total-Brutto-Linie", () => {
    const proposal = makeProposal({
      reverse_charge: true,
      tax_rate: 0,
    });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "NL859123456B01",
        business_country: "NL",
      }),
      company: makeCompany({
        vat_id: "DE123456789",
        address_country: "DE",
      }),
    });
    const stringified = JSON.stringify(content);
    const taxIdx = stringified.indexOf("Steuer (0%)");
    const rcIdx = stringified.indexOf(REVERSE_CHARGE_HEADER);
    const totalIdx = stringified.indexOf("Total Brutto");
    expect(taxIdx).toBeGreaterThan(-1);
    expect(rcIdx).toBeGreaterThan(taxIdx);
    expect(totalIdx).toBeGreaterThan(rcIdx);
  });

  it("AC19: Reverse-Charge=false ohne branding rendert KEINEN Reverse-Charge-Block", () => {
    const proposal = makeProposal({ reverse_charge: false });
    const content = getContentSnapshot(proposal, []);
    const stringified = JSON.stringify(content);
    expect(stringified).not.toContain(REVERSE_CHARGE_HEADER);
    expect(stringified).not.toMatch(/BTW verlegd/);
    expect(stringified).not.toMatch(/Reverse Charge/);
  });

  it("AC22 Edge-Case: Reverse-Charge=true ohne Strategaize-vat_id rendert defensiv mit '—' Platzhalter", () => {
    const proposal = makeProposal({
      reverse_charge: true,
      tax_rate: 0,
    });
    // branding=null UND company.vat_id fehlt — Renderer darf nicht crashen,
    // aber der Block soll sichtbar gerendert werden mit Platzhalter "—".
    const content = getContentSnapshot(proposal, [], {
      branding: null,
      company: makeCompany({ vat_id: null, address_country: "DE" }),
    });
    const stringified = JSON.stringify(content);
    expect(stringified).toContain(REVERSE_CHARGE_HEADER);
    expect(stringified).toMatch(/BTW-Nr\. — — BTW-Nr\. —/);
  });

  it("AC22 Snapshot: Reverse-Charge=true mit beiden vat_ids deterministisch", () => {
    const proposal = makeProposal({
      reverse_charge: true,
      tax_rate: 0,
      skonto_percent: null,
      skonto_days: null,
    });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "NL859123456B01",
        business_country: "NL",
      }),
      company: makeCompany({
        vat_id: "DE123456789",
        address_country: "DE",
      }),
    });
    expect(content).toMatchSnapshot();
  });

  it("AC22 Snapshot: branding.vat_id nur Footer (kein Reverse-Charge) deterministisch", () => {
    const proposal = makeProposal({
      reverse_charge: false,
      skonto_percent: null,
      skonto_days: null,
    });
    const content = getContentSnapshot(proposal, [], {
      branding: makeBranding({
        vat_id: "NL859123456B01",
        business_country: "NL",
      }),
    });
    expect(content).toMatchSnapshot();
  });
});
