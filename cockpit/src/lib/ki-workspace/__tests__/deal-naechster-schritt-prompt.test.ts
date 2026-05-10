import { describe, it, expect } from "vitest";
import {
  DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT,
  buildDealNaechsterSchrittPrompt,
} from "../prompts/deal-naechster-schritt-prompt";
import type { DealContext } from "../deal-context";

const EMPTY_CONTEXT: DealContext = {
  deal: {
    id: "d-1",
    title: "Step-Deal",
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

describe("deal-naechster-schritt system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT.indexOf("## Was");
    const b = DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT.indexOf("## Wann");
    const c = DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT.indexOf("## Warum");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("instructs exactly ONE next step", () => {
    expect(DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT).toMatch(/EINE konkrete Aktion/);
  });

  it("handles closed deals with handoff/follow-up step", () => {
    expect(DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT).toMatch(/won\/lost/);
    expect(DEAL_NAECHSTER_SCHRITT_SYSTEM_PROMPT).toMatch(/Nachfass/);
  });
});

describe("buildDealNaechsterSchrittPrompt", () => {
  it("includes the explicit 3-section + EIN-Schritt instruction at the end", () => {
    const out = buildDealNaechsterSchrittPrompt({ context: EMPTY_CONTEXT });
    expect(out).toMatch(/strikt mit den drei Sektionen/);
    expect(out).toMatch(/Genau EIN naechster Schritt/);
  });
});
