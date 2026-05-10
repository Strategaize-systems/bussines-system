import { describe, it, expect } from "vitest";
import {
  DEAL_SIGNALE_SYSTEM_PROMPT,
  buildDealSignalePrompt,
} from "../prompts/deal-signale-prompt";
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

describe("deal-signale system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = DEAL_SIGNALE_SYSTEM_PROMPT.indexOf("## Positive Signale");
    const b = DEAL_SIGNALE_SYSTEM_PROMPT.indexOf("## Negative Signale");
    const c = DEAL_SIGNALE_SYSTEM_PROMPT.indexOf("## Empfehlung");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("lists all allowed signal types as bracket prefixes", () => {
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Hohes Interesse]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Budget vorhanden]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Champion erkennbar]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Akuter Druck / Dringlichkeit]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Hoher Multiplikatorwert]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Einwand]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Interne Blockade]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Timing ungeeignet]");
    expect(DEAL_SIGNALE_SYSTEM_PROMPT).toContain("[Falscher Fit]");
  });
});

describe("buildDealSignalePrompt", () => {
  it("includes the explicit 3-section instruction at the end", () => {
    const out = buildDealSignalePrompt({ context: EMPTY_CONTEXT });
    expect(out).toMatch(/strikt mit den drei Sektionen/);
    expect(out).toMatch(/erlaubten Signal-Typen/);
  });

  it("renders activities with date prefix when present", () => {
    const out = buildDealSignalePrompt({
      context: {
        ...EMPTY_CONTEXT,
        activities: [
          { type: "note", title: "Budget freigegeben", summary: null, createdAt: "2026-05-08T10:00:00Z" },
        ],
      },
    });
    expect(out).toContain("Budget freigegeben");
    expect(out).toContain("note");
  });
});
