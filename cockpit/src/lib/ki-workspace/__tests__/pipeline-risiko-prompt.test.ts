import { describe, it, expect } from "vitest";
import {
  PIPELINE_RISIKO_SYSTEM_PROMPT,
  buildPipelineRisikoPrompt,
} from "../prompts/pipeline-risiko-prompt";

describe("pipeline-risiko system prompt", () => {
  it("requires the three mandatory section headers in fixed order", () => {
    const a = PIPELINE_RISIKO_SYSTEM_PROMPT.indexOf("## Risiko-Bewertung");
    const b = PIPELINE_RISIKO_SYSTEM_PROMPT.indexOf("## Wiedervorlagen");
    const c = PIPELINE_RISIKO_SYSTEM_PROMPT.indexOf("## KI-Kommentar");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("buildPipelineRisikoPrompt", () => {
  it("renders zero indicators when pipeline is healthy", () => {
    const out = buildPipelineRisikoPrompt({
      exceptions: { stagnantDeals: [], overdueTasks: [], overdueDeals: [] },
    });
    expect(out).toContain("ANZAHL RISIKO-INDIKATOREN: 0");
    expect(out).toContain("Keine stagnierenden Deals.");
    expect(out).toContain("Keine ueberfaelligen naechsten Schritte.");
    expect(out).toContain("Keine ueberfaelligen Aufgaben.");
  });

  it("counts and renders indicators across all three categories", () => {
    const out = buildPipelineRisikoPrompt({
      exceptions: {
        stagnantDeals: [
          {
            id: "d1",
            title: "Lange-stille Mueller",
            daysSinceUpdate: 22,
            value: 40000,
            stage: "Verhandlung",
            companyName: "Mueller GmbH",
          },
        ],
        overdueTasks: [
          {
            id: "t1",
            title: "Angebot v3 abschicken",
            dueDate: "2026-05-01",
            priority: "high",
            companyName: "Schmidt KG",
          },
        ],
        overdueDeals: [
          {
            id: "d2",
            title: "Wagner Ausbau",
            nextActionDate: "2026-04-28",
            nextAction: "Termin vereinbaren",
            companyName: "Wagner AG",
          },
        ],
      },
    });
    expect(out).toContain("ANZAHL RISIKO-INDIKATOREN: 3");
    expect(out).toContain(
      "Lange-stille Mueller (40.000 EUR, Verhandlung, Mueller GmbH, 22 Tage ohne Update)",
    );
    expect(out).toContain(
      "Wagner Ausbau — Termin vereinbaren (faellig seit 2026-04-28, Wagner AG)",
    );
    expect(out).toContain(
      "Angebot v3 abschicken [Prio high] (faellig seit 2026-05-01 — Schmidt KG)",
    );
  });

  it("instructs three-section structure at the end", () => {
    const out = buildPipelineRisikoPrompt({
      exceptions: { stagnantDeals: [], overdueTasks: [], overdueDeals: [] },
    });
    expect(out).toMatch(/strikt mit den drei Sektionen/);
  });
});
