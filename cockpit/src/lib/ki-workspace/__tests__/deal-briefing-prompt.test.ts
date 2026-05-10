import { describe, it, expect } from "vitest";
import {
  DEAL_BRIEFING_SYSTEM_PROMPT,
  buildDealBriefingPrompt,
} from "../prompts/deal-briefing-prompt";
import type { DealContext } from "../deal-context";

const EMPTY_CONTEXT: DealContext = {
  deal: {
    id: "d-1",
    title: "Beispiel-Deal",
    value: null,
    status: "active",
    stageName: null,
    probability: null,
    pipelineName: null,
    nextAction: null,
    nextActionDate: null,
    expectedCloseDate: null,
    wonLostReason: null,
    wonLostDetails: null,
    closedAt: null,
    createdAt: "2026-05-10T00:00:00Z",
    updatedAt: "2026-05-10T00:00:00Z",
    tags: [],
  },
  contact: null,
  company: null,
  activities: [],
  tasks: [],
  meetings: [],
  proposals: [],
  signals: [],
  emails: [],
  calls: [],
};

describe("deal-briefing system prompt", () => {
  it("requires the four mandatory section headers in fixed order", () => {
    const a = DEAL_BRIEFING_SYSTEM_PROMPT.indexOf("## Lage");
    const b = DEAL_BRIEFING_SYSTEM_PROMPT.indexOf("## Wichtige Fakten");
    const c = DEAL_BRIEFING_SYSTEM_PROMPT.indexOf("## Risiken & offene Punkte");
    const d = DEAL_BRIEFING_SYSTEM_PROMPT.indexOf("## Empfohlene naechste Schritte");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(c).toBeLessThan(d);
  });

  it("instructs Du-Form, knapp, kein JSON", () => {
    expect(DEAL_BRIEFING_SYSTEM_PROMPT).toMatch(/Du-Form/);
    expect(DEAL_BRIEFING_SYSTEM_PROMPT).toMatch(/Markdown/);
    expect(DEAL_BRIEFING_SYSTEM_PROMPT).not.toMatch(/JSON/);
  });
});

describe("buildDealBriefingPrompt — empty context", () => {
  it("renders empty hints, never invents data", () => {
    const out = buildDealBriefingPrompt({ context: EMPTY_CONTEXT });
    expect(out).toContain("Beispiel-Deal");
    expect(out).toContain("Kein Kontakt zugeordnet.");
    expect(out).toContain("Keine Firma zugeordnet.");
    expect(out).toContain("Keine Aktivitaeten erfasst.");
  });

  it("includes the explicit 4-section instruction at the end", () => {
    const out = buildDealBriefingPrompt({ context: EMPTY_CONTEXT });
    expect(out).toMatch(/strikt mit den vier Sektionen/);
  });
});

describe("buildDealBriefingPrompt — populated context", () => {
  it("renders deal value, stage, probability and contact name", () => {
    const out = buildDealBriefingPrompt({
      context: {
        ...EMPTY_CONTEXT,
        deal: {
          ...EMPTY_CONTEXT.deal,
          value: 75000,
          stageName: "Verhandlung",
          probability: 60,
          pipelineName: "Unternehmer-Chancen",
        },
        contact: { name: "Anna Schmitt", position: "CFO", email: "anna@x.de", phone: null },
        company: { name: "ACME GmbH", industry: "Maschinenbau" },
      },
    });
    expect(out).toContain("75.000");
    expect(out).toContain("Verhandlung");
    expect(out).toContain("60%");
    expect(out).toContain("Anna Schmitt");
    expect(out).toContain("ACME GmbH");
    expect(out).toContain("Maschinenbau");
  });

  it("renders won-deal close-out fields when status is won", () => {
    const out = buildDealBriefingPrompt({
      context: {
        ...EMPTY_CONTEXT,
        deal: {
          ...EMPTY_CONTEXT.deal,
          status: "won",
          closedAt: "2026-04-30T00:00:00Z",
          wonLostReason: "Bester Preis",
          wonLostDetails: "Preisvergleich gewonnen",
        },
      },
    });
    expect(out).toContain("Grund: Bester Preis");
    expect(out).toContain("Details: Preisvergleich gewonnen");
  });
});
