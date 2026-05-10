import { describe, it, expect } from "vitest";
import {
  SEIT_LOGIN_SYSTEM_PROMPT,
  buildSeitLoginPrompt,
} from "../prompts/seit-login-prompt";

describe("seit-login system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = SEIT_LOGIN_SYSTEM_PROMPT.indexOf("## Was ist passiert");
    const b = SEIT_LOGIN_SYSTEM_PROMPT.indexOf("## Was braucht Aufmerksamkeit");
    const c = SEIT_LOGIN_SYSTEM_PROMPT.indexOf("## KI-Kommentar");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("buildSeitLoginPrompt", () => {
  const EMPTY_EVENTS = {
    newDeals: [],
    stageChanges: [],
    otherChanges: [],
    cutoffLabel: "seit gestern",
  };

  it("renders cutoff label in the header", () => {
    const out = buildSeitLoginPrompt({ events: { ...EMPTY_EVENTS, cutoffLabel: "seit 09.05 14:30" } });
    expect(out).toContain("AENDERUNGEN seit 09.05 14:30");
  });

  it("renders honest empty hints in every category", () => {
    const out = buildSeitLoginPrompt({ events: EMPTY_EVENTS });
    expect(out).toContain("Keine neuen Deals.");
    expect(out).toContain("Keine Stage-Wechsel.");
    expect(out).toContain("Keine sonstigen Aenderungen.");
  });

  it("renders new deals + stage changes + other changes by category", () => {
    const out = buildSeitLoginPrompt({
      events: {
        newDeals: [
          {
            id: "e1",
            action: "create",
            entityType: "deal",
            entityId: "d1",
            context: "Mueller Implementierung",
            createdAt: "2026-05-09T08:00:00Z",
          },
        ],
        stageChanges: [
          {
            id: "e2",
            action: "stage_change",
            entityType: "deal",
            entityId: "d2",
            context: "Schmidt Ausbau: Angebot -> Verhandlung",
            createdAt: "2026-05-09T10:00:00Z",
          },
        ],
        otherChanges: [
          {
            id: "e3",
            action: "update",
            entityType: "contact",
            entityId: "c1",
            context: "Kontakt Mueller aktualisiert",
            createdAt: "2026-05-09T12:00:00Z",
          },
        ],
        cutoffLabel: "seit gestern",
      },
    });
    expect(out).toContain("Mueller Implementierung");
    expect(out).toContain("Schmidt Ausbau: Angebot -> Verhandlung");
    expect(out).toContain("[contact/update] Kontakt Mueller aktualisiert");
  });

  it("truncates other changes after 10 entries with a remainder hint", () => {
    const many = Array.from({ length: 13 }, (_, i) => ({
      id: `e${i}`,
      action: "update",
      entityType: "task",
      entityId: `t${i}`,
      context: `Aenderung ${i}`,
      createdAt: "2026-05-09T12:00:00Z",
    }));
    const out = buildSeitLoginPrompt({
      events: {
        newDeals: [],
        stageChanges: [],
        otherChanges: many,
        cutoffLabel: "seit gestern",
      },
    });
    expect(out).toContain("Aenderung 0");
    expect(out).toContain("Aenderung 9");
    expect(out).not.toContain("Aenderung 10");
    expect(out).toContain("(weitere 3 aelter — gekuerzt)");
  });
});
