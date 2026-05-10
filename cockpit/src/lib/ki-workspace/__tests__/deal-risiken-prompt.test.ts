import { describe, it, expect } from "vitest";
import {
  DEAL_RISIKEN_SYSTEM_PROMPT,
  buildDealRisikenPrompt,
} from "../prompts/deal-risiken-prompt";
import type { DealContext } from "../deal-context";

const EMPTY_CONTEXT: DealContext = {
  deal: {
    id: "d-1",
    title: "Risiko-Deal",
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

describe("deal-risiken system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = DEAL_RISIKEN_SYSTEM_PROMPT.indexOf("## Identifizierte Risiken");
    const b = DEAL_RISIKEN_SYSTEM_PROMPT.indexOf("## Bekannte Einwaende");
    const c = DEAL_RISIKEN_SYSTEM_PROMPT.indexOf("## Konter-Strategien");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("requires severity classification hoch/mittel/niedrig", () => {
    expect(DEAL_RISIKEN_SYSTEM_PROMPT).toMatch(/hoch\|mittel\|niedrig/);
  });
});

describe("buildDealRisikenPrompt", () => {
  it("includes the explicit 3-section instruction at the end", () => {
    const out = buildDealRisikenPrompt({ context: EMPTY_CONTEXT });
    expect(out).toMatch(/strikt mit den drei Sektionen/);
  });

  it("renders deal title in context block", () => {
    const out = buildDealRisikenPrompt({ context: EMPTY_CONTEXT });
    expect(out).toContain("Risiko-Deal");
  });
});
