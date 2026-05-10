import { describe, it, expect } from "vitest";
import {
  DEAL_WINLOSS_SYSTEM_PROMPT,
  buildDealWinLossPrompt,
} from "../prompts/deal-winloss-prompt";
import type { DealContext } from "../deal-context";

const EMPTY_CONTEXT: DealContext = {
  deal: {
    id: "d-1",
    title: "WinLoss-Deal",
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

describe("deal-winloss system prompt", () => {
  it("requires the four mandatory section headers in fixed order", () => {
    const a = DEAL_WINLOSS_SYSTEM_PROMPT.indexOf("## Aktueller Stand");
    const b = DEAL_WINLOSS_SYSTEM_PROMPT.indexOf("## Erfolgs-Indikatoren");
    const c = DEAL_WINLOSS_SYSTEM_PROMPT.indexOf("## Verlust-Indikatoren");
    const d = DEAL_WINLOSS_SYSTEM_PROMPT.indexOf("## Empfehlung & Lessons");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(c).toBeLessThan(d);
  });

  it("explicitly handles active, won and lost deals with the same prompt", () => {
    expect(DEAL_WINLOSS_SYSTEM_PROMPT).toMatch(/active/);
    expect(DEAL_WINLOSS_SYSTEM_PROMPT).toMatch(/won/);
    expect(DEAL_WINLOSS_SYSTEM_PROMPT).toMatch(/lost/);
    expect(DEAL_WINLOSS_SYSTEM_PROMPT).toMatch(/GLEICHEN Prompt-Aufbau/);
  });
});

describe("buildDealWinLossPrompt", () => {
  it("includes the explicit 4-section instruction at the end", () => {
    const out = buildDealWinLossPrompt({ context: EMPTY_CONTEXT });
    expect(out).toMatch(/strikt mit den vier Sektionen/);
  });

  it("renders won-deal close-out fields when status is won", () => {
    const out = buildDealWinLossPrompt({
      context: {
        ...EMPTY_CONTEXT,
        deal: {
          ...EMPTY_CONTEXT.deal,
          status: "won",
          closedAt: "2026-04-30T00:00:00Z",
          wonLostReason: "Bester Preis",
          wonLostDetails: "Wettbewerber war 12% teurer",
        },
      },
    });
    expect(out).toContain("Grund: Bester Preis");
    expect(out).toContain("Details: Wettbewerber war 12% teurer");
  });

  it("renders lost-deal close-out fields when status is lost", () => {
    const out = buildDealWinLossPrompt({
      context: {
        ...EMPTY_CONTEXT,
        deal: {
          ...EMPTY_CONTEXT.deal,
          status: "lost",
          closedAt: "2026-04-25T00:00:00Z",
          wonLostReason: "Budget-Verzoegerung",
          wonLostDetails: "Q4 statt Q2",
        },
      },
    });
    expect(out).toContain("Grund: Budget-Verzoegerung");
    expect(out).toContain("Details: Q4 statt Q2");
  });
});
