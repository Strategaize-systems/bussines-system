import { describe, it, expect } from "vitest";
import {
  GESTERN_SYSTEM_PROMPT,
  buildGesternPrompt,
} from "../prompts/gestern-prompt";

describe("gestern system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = GESTERN_SYSTEM_PROMPT.indexOf("## Was wurde erledigt");
    const b = GESTERN_SYSTEM_PROMPT.indexOf("## Was ist liegengeblieben");
    const c = GESTERN_SYSTEM_PROMPT.indexOf("## KI-Kommentar");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("buildGesternPrompt", () => {
  it("renders empty hints when nothing happened yesterday", () => {
    const out = buildGesternPrompt({ review: { completed: [], missed: [] } });
    expect(out).toContain("Keine erledigten Eintraege gestern.");
    expect(out).toContain("Nichts liegengeblieben.");
  });

  it("renders completed items with type label and contact context", () => {
    const out = buildGesternPrompt({
      review: {
        completed: [
          {
            id: "1",
            title: "Kickoff Mueller",
            type: "meeting",
            contactName: "Hans Mueller",
            companyName: "Mueller GmbH",
          },
          {
            id: "2",
            title: "Angebot v3 verschickt",
            type: "email",
            contactName: null,
            companyName: "Schmidt KG",
          },
        ],
        missed: [],
      },
    });
    expect(out).toContain("[Meeting] Kickoff Mueller — Hans Mueller / Mueller GmbH");
    expect(out).toContain("[E-Mail] Angebot v3 verschickt — Schmidt KG");
  });

  it("renders missed items separately", () => {
    const out = buildGesternPrompt({
      review: {
        completed: [],
        missed: [
          {
            id: "3",
            title: "Wiedervorlage Lange-Stille AG",
            type: "task",
            contactName: null,
            companyName: "Lange-Stille AG",
          },
        ],
      },
    });
    expect(out).toContain("=== LIEGENGEBLIEBEN ===");
    expect(out).toContain("Wiedervorlage Lange-Stille AG");
  });

  it("instructs three-section structure at the end", () => {
    const out = buildGesternPrompt({ review: { completed: [], missed: [] } });
    expect(out).toMatch(/strikt mit den drei Sektionen/);
  });
});
